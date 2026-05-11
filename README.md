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

**Atenção:** 
Certifique-se de executar os Triggers fornecidos nos scripts SQL para que as linhas em `profiles` sejam criadas automaticamente assim que um novo usuário realizar o Sign-Up.
As políticas RLS já estão definidas no script.
---

## 💡 Dicas de Desenvolvimento
- A autenticação não usa mais JWT local ou `axios` modificado; usamos o contexto do `@supabase/supabase-js`.
- Telas protegidas (como `/admin`) verificam a `role` do usuário vinda diretamente da tabela `profiles`.
- Reutilize o ecossistema Tailwind para criar UIs rápidas e responsivas sem arquivos CSS externos pesados.

---
Feito com 💙 via Jules o Grande.
