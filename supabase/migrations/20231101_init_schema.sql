-- 1. Create table `profiles`
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


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
    COALESCE(new.raw_user_meta_data->>'role', 'student')
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
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classes are viewable by everyone."
  ON public.classes FOR SELECT
  USING (true);

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


-- 6. Create table `activity_comments` (Comentários nas aulas)
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