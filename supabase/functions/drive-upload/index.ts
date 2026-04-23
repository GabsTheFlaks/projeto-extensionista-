import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

// ─── Autenticação real via Supabase + verificação de role admin ───
async function requireAdmin(req: Request): Promise<void> {
  const authHeader = req.headers.get("X-User-Token");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Token de autorização ausente ou inválido."), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const token = authHeader.replace("Bearer ", "").trim();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    console.error("Erro no getUser:", userError);
    throw Object.assign(new Error(`Acesso não autorizado: token inválido ou expirado. Detalhe: ${userError?.message || 'Sem usuário'}`), { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw Object.assign(new Error("Proibido: você não tem permissão para enviar arquivos."), { status: 403 });
  }
}

// ─── Geração do Access Token do Google via Service Account ───
async function getGoogleAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!email || !privateKeyRaw) {
    throw new Error("Credenciais do Google não configuradas nas variáveis de ambiente.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const key = await importPKCS8(privateKey, 'RS256');

  const jwt = await new SignJWT({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(key);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Erro ao obter token do Google:", tokenData);
    throw new Error("Falha na autenticação com o Google Drive.");
  }

  return tokenData.access_token;
}

// ─── Handler principal ───
// Responsabilidade única: autenticar e devolver a URL de upload ao frontend.
// O arquivo NÃO passa por esta função — vai direto do browser para o Google Drive.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Valida JWT + role admin
    await requireAdmin(req);

    // 2. Lê os metadados do arquivo (nome, tipo, tamanho) — sem o arquivo em si
    const { title, mimeType, size } = await req.json();

    if (!title || !mimeType || !size) {
      throw Object.assign(
        new Error("Parâmetros obrigatórios ausentes: title, mimeType, size."),
        { status: 400 }
      );
    }

    const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    const accessToken = await getGoogleAccessToken();

    // 3. Abre a sessão de upload resumável no Google Drive
    const metadata: Record<string, unknown> = {
      name: title,
      parents: folderId ? [folderId] : [],
    };

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mimeType || "application/octet-stream",
          "X-Upload-Content-Length": String(size),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const err = await initResponse.text();
      console.error("Erro ao iniciar sessão no Google Drive:", err);
      throw new Error("Falha ao iniciar sessão de upload no Google Drive.");
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("URL de upload não retornada pelo Google.");
    }

    // 4. Devolve só a URL — o frontend fará o upload direto
    return new Response(
      JSON.stringify({ uploadUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const status = (error as any).status ?? 500;
    console.error(`Erro na Edge Function [${status}]:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
