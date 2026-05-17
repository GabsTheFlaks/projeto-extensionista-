<div align="center">
  <img src="https://raw.githubusercontent.com/github/explore/80688e429a7d4ef2fca1e82350fe8e3517d3494d/topics/react/react.png" width="80" alt="React" />
  <img src="https://supabase.com/brand-assets/supabase-logo-icon.png" width="80" alt="Supabase" />
</div>

<h1 align="center">EduPlatform - Study Platform (Google Classroom Clone)</h1>

<div align="center">
  <a href="#-english">🇬🇧 English</a> | <a href="#-português">🇧🇷 Português</a>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

<h2 id="-english">🇬🇧 English</h2>

Welcome to **EduPlatform**, an educational study platform inspired by Google Classroom! This project aims to provide a clean, secure, and professional interface for managing classes, student enrollments, activities, and assignments.

### 📸 Screenshots
*(Add your screenshots here)*
| Dashboard | Class Activities | Assignment View |
| :---: | :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/400x250.png?text=Dashboard) | ![Activities Placeholder](https://via.placeholder.com/400x250.png?text=Activities) | ![Assignment Placeholder](https://via.placeholder.com/400x250.png?text=Assignment) |

### 🏗 Architecture & Tech Stack
This project operates on a modern, serverless architecture using Backend-as-a-Service (BaaS) principles.

*   **Frontend:** Built entirely with **React** + **Vite**, styled with **Tailwind CSS**, and leveraging **Lucide React** for icons. Routing is handled by **React Router DOM**.
*   **Backend (BaaS):** Exclusively powered by **Supabase**. We utilize:
    *   **Supabase Auth:** For user authentication and session management.
    *   **PostgreSQL:** The core database.
    *   **Row Level Security (RLS):** Crucial for ensuring that users (students/admins) can only access the data they are permitted to see.
    *   **Supabase Storage:** Exclusively used for user profile avatars (in the `avatars` bucket).
    *   *Note: We strictly do **not** use Supabase Edge Functions in this project. External materials rely on smart links.*

### 💾 Database Schema
The platform relies on the following core PostgreSQL tables:
*   `profiles`: Extends Supabase's `auth.users`, storing user roles (`student` or `admin`) and details.
*   `classes`: Represents courses or study groups. Linked to the creator via `created_by`.
*   `class_members`: Manages student enrollments in classes (vital for RLS).
*   `class_activities`: Feed for class announcements and materials.
*   `class_submissions`: Tracks student assignments and feedback.
*   `material_views`: Analytics for tracking material views by students.
*   `activity_comments`: Stores comments on specific activities.

### 🔗 Smart Links Integration
File storage for course materials uses a smart external link system. Instead of storing large files directly, the platform dynamically parses and embeds URLs from:
*   **Google Drive & Google Docs** (Auto-converts `/view` or `/edit` paths to `/preview` to avoid CORS issues)
*   **YouTube**
*   **Microsoft Office 365 (OneDrive/SharePoint)**
*   **Canva**

### 🚀 Getting Started Locally

#### 1. Frontend Setup
1. Open the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Set up environment variables: Create a `.env` file in the `frontend/` root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server: `npm run dev`

#### 2. Backend Setup
1. Navigate to `supabase/migrations/`.
2. Execute the SQL instructions provided in the migration files in your Supabase project's SQL Editor to create tables, enable RLS, insert triggers, and configure storage.

---

<h2 id="-português">🇧🇷 Português</h2>

Bem-vindo à **EduPlatform**, uma plataforma de estudos educacional inspirada no Google Classroom! Este projeto tem como objetivo fornecer uma interface limpa, segura e profissional para o gerenciamento de turmas, matrículas, atividades e tarefas.

### 📸 Telas
*(Adicione seus prints aqui)*
| Dashboard | Atividades da Turma | Visualização de Tarefa |
| :---: | :---: | :---: |
| ![Dashboard](https://via.placeholder.com/400x250.png?text=Dashboard) | ![Atividades](https://via.placeholder.com/400x250.png?text=Atividades) | ![Tarefa](https://via.placeholder.com/400x250.png?text=Tarefa) |

### 🏗 Arquitetura e Tecnologias
Este projeto opera em uma arquitetura serverless moderna, usando princípios de Backend-as-a-Service (BaaS).

*   **Frontend:** Desenvolvido inteiramente com **React** + **Vite**, estilizado com **Tailwind CSS** e utilizando **Lucide React** para ícones. O roteamento é feito pelo **React Router DOM**.
*   **Backend (BaaS):** Alimentado exclusivamente pelo **Supabase**. Nós utilizamos:
    *   **Supabase Auth:** Para autenticação de usuários e gestão de sessões.
    *   **PostgreSQL:** O banco de dados principal.
    *   **Row Level Security (RLS):** Essencial para garantir que os usuários (alunos/admins) só possam acessar os dados que têm permissão para ver.
    *   **Supabase Storage:** Usado exclusivamente para avatares de perfil dos usuários (no bucket `avatars`).
    *   *Nota: Nós estritamente **não** usamos Supabase Edge Functions neste projeto. Materiais externos dependem de links inteligentes.*

### 💾 Esquema do Banco de Dados
A plataforma depende das seguintes tabelas principais no PostgreSQL:
*   `profiles`: Estende a tabela `auth.users` do Supabase, armazenando papéis (`student` ou `admin`) e detalhes.
*   `classes`: Representa os cursos ou turmas. Ligado ao criador via `created_by`.
*   `class_members`: Gerencia as matrículas dos alunos nas turmas (vital para o RLS).
*   `class_activities`: Mural de anúncios e materiais das aulas.
*   `class_submissions`: Rastreia as entregas de tarefas dos alunos e os feedbacks.
*   `material_views`: Analytics para rastrear visualizações de materiais pelos alunos.
*   `activity_comments`: Armazena comentários em atividades específicas.

### 🔗 Integração de Links Inteligentes
O armazenamento de materiais de aula usa um sistema inteligente de links externos. Em vez de armazenar arquivos grandes diretamente, a plataforma converte e incorpora URLs de forma dinâmica:
*   **Google Drive e Google Docs** (Converte automaticamente caminhos `/view` ou `/edit` para `/preview` para evitar problemas de CORS)
*   **YouTube**
*   **Microsoft Office 365 (OneDrive/SharePoint)**
*   **Canva**

### 🚀 Como Iniciar Localmente

#### 1. Configuração do Frontend
1. Acesse o diretório frontend: `cd frontend`
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente: Crie um arquivo `.env` na raiz da pasta `frontend/`:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```
4. Inicie o servidor de desenvolvimento: `npm run dev`

#### 2. Configuração do Backend
1. Navegue até a pasta `supabase/migrations/`.
2. Execute as instruções SQL fornecidas nos arquivos de migração no SQL Editor do seu projeto Supabase para criar as tabelas, habilitar o RLS, inserir gatilhos (triggers) e configurar o Storage.

---
Feito com 💙
