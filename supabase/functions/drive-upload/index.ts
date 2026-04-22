import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Function para receber um arquivo via FormData, autenticar no Google usando uma Service Account
// (fornecida pelas env vars do Supabase: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID)
// e enviar para o Google Drive.

async function getGoogleAccessToken() {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!email || !privateKeyRaw) {
    throw new Error("Credenciais do Google não configuradas nas variáveis de ambiente.");
  }

  // Tratamento da private key (substituindo \n literais por quebras de linha reais)
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  // Gerar um JWT temporário para autenticar a service account
  // Nota: Para manter este script leve no Deno/Edge, montaremos o JWT manualmente ou via bibliotecas esm.sh
  // Usando a lib jsonwebtoken via esm.sh ou oauth2
  const { SignJWT } = await import("https://deno.land/x/jose@v4.14.4/index.ts");
  const { importPKCS8 } = await import("https://deno.land/x/jose@v4.14.4/index.ts");

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

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title') || 'Arquivo Sem Nome';

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");

    const accessToken = await getGoogleAccessToken();

    // Preparar o request de upload Multipart para a API do Google Drive v3
    const metadata = {
      name: title,
      parents: folderId ? [folderId] : []
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error("Erro de upload no Drive:", uploadData);
      throw new Error("Falha ao fazer upload para o Google Drive.");
    }

    return new Response(
      JSON.stringify({
        message: "Upload com sucesso",
        fileId: uploadData.id,
        driveLink: uploadData.webViewLink
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
