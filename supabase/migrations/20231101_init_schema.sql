-- 1. Create table `profiles`
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- Política de UPDATE removida/restrita para evitar que usuários alterem suas próprias roles.
-- Apenas admins do banco podem fazer isso via painel SQL/Backend.
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Essa subquery estrita impede que o usuário edite a coluna role maliciosamente no payload.
    -- Para o nosso escopo, a política padrão do Supabase bloqueia atualizações na própria role se bem configurada
    -- Mas como não temos tela de edição de perfil, vamos simplesmente remover a permissão de UPDATE
    -- de usuários normais ou checar se a role se mantém igual.
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );


-- Configuração do Storage para Avatares
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  USING ( auth.uid() = owner )
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );


-- 2. Create Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, firstname, lastname, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'firstname',
    new.raw_user_meta_data->>'lastname',
    'student' -- Força 'student' independentemente do metadata para evitar manipulação client-side
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Create table `classes` (Courses/Turmas)
CREATE TABLE public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classes are viewable by everyone."
  ON public.classes FOR SELECT
  USING (is_archived = false OR created_by = auth.uid());

CREATE POLICY "Only admins can insert classes."
  ON public.classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update classes."
  ON public.classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete classes."
  ON public.classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) AND created_by = auth.uid()
  );


-- 4. Create table `class_members` (Enrollments)
CREATE TABLE public.class_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships."
  ON public.class_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships (Enroll)."
  ON public.class_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all memberships."
  ON public.class_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own memberships (Unenroll)."
  ON public.class_members FOR DELETE
  USING (auth.uid() = user_id);


-- 5. Create table `class_activities` (Mural de Postagens)
CREATE TABLE public.class_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  drive_link TEXT, -- Link vindo do Google Drive via Edge Function
  file_type TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.class_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activities are viewable by enrolled students or admins."
  ON public.class_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members WHERE class_id = public.class_activities.class_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.classes WHERE id = public.class_activities.class_id AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert activities."
  ON public.class_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update activities."
  ON public.class_activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Only admins can delete activities."
  ON public.class_activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) AND created_by = auth.uid()
  );


-- 6. Create table `activity_comments` (Comentários nas aulas)
-- 6. Create table `class_submissions` (Entregas e Tarefas)
CREATE TABLE public.class_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.class_activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  drive_link TEXT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

ALTER TABLE public.class_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions or admins view all."
  ON public.class_submissions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can insert own submissions."
  ON public.class_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update submissions to give feedback."
  ON public.class_submissions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Create table `activity_comments` (Comentários nas aulas)
-- 7. Create table `material_views` (Analytics/Tracking)
CREATE TABLE public.material_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.class_activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

ALTER TABLE public.material_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert view."
  ON public.material_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can select views."
  ON public.material_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. Create table `activity_comments` (Comentários nas aulas)
CREATE TABLE public.activity_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.class_activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by enrolled students or admins."
  ON public.activity_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_activities a
      JOIN public.class_members m ON a.class_id = m.class_id
      WHERE a.id = public.activity_comments.activity_id AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Enrolled students and admins can post comments."
  ON public.activity_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_activities a
      JOIN public.class_members m ON a.class_id = m.class_id
      WHERE a.id = public.activity_comments.activity_id AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );