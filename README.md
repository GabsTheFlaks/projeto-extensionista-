# Plataforma de Estudos (Edição Supabase)

Bem-vindo à nova Plataforma de Estudos! Este projeto foi projetado com foco em fornecer uma interface limpa, segura e profissional no estilo Google Classroom, utilizando inteiramente a stack React + Vite para o frontend, e o ecossistema Serverless do Supabase para o backend (Auth, Banco de Dados, RLS, Edge Functions).

## 🚀 Como Iniciar o Projeto Localmente

Este documento explica todos os passos para configurar o frontend, as tabelas no banco de dados e a integração com o Google Drive via Supabase Edge Functions.

---

## 1. Configuração do Frontend (React + Vite)

O frontend foi inicializado na pasta `frontend` deste repositório.

1. **Acessar a pasta do frontend:**
   ```bash
   cd frontend
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```
   *Dependências instaladas: `react-router-dom`, `tailwindcss`, `lucide-react`, `@supabase/supabase-js`, entre outras.*

3. **Configurar variáveis de ambiente:**
   Crie um arquivo `.env` na raiz da pasta `frontend/` e adicione a URL e a Chave Pública do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase_aqui
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase_aqui
   ```

4. **Rodar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 2. Configuração do Backend (Supabase Banco de Dados)

O Supabase gerenciará a Autenticação e o Banco de Dados. Navegue até a pasta raiz ou `/supabase/migrations/` e execute as instruções SQL contidas lá.

As tabelas principais que criaremos são:
- `profiles`: Extensão da tabela `auth.users` do Supabase, contendo papéis (`role`) como `student` ou `admin`.
- `classes`: Para cadastrar os Cursos/Turmas.
- `class_members`: Controla as matrículas (crucial para o RLS - os alunos só veem dados das turmas em que estão matriculados).
- `class_activities`: Mural de postagens de aulas.
- `activity_comments`: Comentários atrelados às aulas.

**Atenção:** Certifique-se de executar os *Triggers* fornecidos nos scripts SQL para que as linhas em `profiles` sejam criadas automaticamente assim que um novo usuário realizar o Sign-Up. As políticas RLS já estão definidas no script.

---

## 3. Configuração de Uploads (Google Drive + Supabase Edge Functions)

A plataforma **não armazena arquivos pesados no Supabase Storage**. Para economizar custos, utilizamos uma Edge Function do Supabase que pega o arquivo e o envia diretamente para a API do Google Drive usando uma *Service Account*, salvando apenas o link de visualização no banco de dados.

### Configurando o Google Drive API:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto e ative a **Google Drive API**.
3. Crie uma **Service Account** e baixe as chaves JSON.
4. Vá ao Google Drive e crie uma pasta raiz onde os arquivos serão salvos.
5. **Importante:** Compartilhe essa pasta de destino com o e-mail da sua *Service Account* (com permissão de Edição) para que ela possa salvar arquivos lá, e torne o link da pasta visível ("Qualquer pessoa com o link pode visualizar").

### Configurando a Edge Function no Supabase
1. Tenha o Supabase CLI instalado.
2. Acesse a pasta do projeto e inicie o Supabase (se ainda não fez): `supabase init`
3. Copie o ID da pasta do Drive que você criou e as credenciais JSON da Service Account.
4. Crie variáveis de segurança (Secrets) na sua Edge Function (via painel do Supabase ou CLI):
   ```bash
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="email@da.service.account"
   supabase secrets set GOOGLE_PRIVATE_KEY="sua_private_key_aqui"
   supabase secrets set GOOGLE_DRIVE_FOLDER_ID="id_da_sua_pasta_no_drive"
   ```
5. Faça o Deploy da função:
   ```bash
   supabase functions deploy drive-upload
   ```

Pronto! Agora o sistema de arquivos deve funcionar via Iframe.

---

## 💡 Dicas de Desenvolvimento
- A autenticação não usa mais JWT local ou `axios` modificado; usamos o contexto do `@supabase/supabase-js`.
- Telas protegidas (como `/admin`) verificam a `role` do usuário vinda diretamente da tabela `profiles`.
- Reutilize o ecossistema Tailwind para criar UIs rápidas e responsivas sem arquivos CSS externos pesados.

---
Feito com 💙 via Jules o Grande.
