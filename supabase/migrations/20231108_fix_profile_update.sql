-- Corrige a política de UPDATE do profiles que estava bloqueando a edição de bio e nome

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Permite atualizar se o novo papel for igual ao papel atual (previne escalação de privilégios)
    -- O supabase passa o old e o new (se o usuário não enviou o role, fica o antigo por default na maioria dos ORMs,
    -- mas no update o new.role é o que será salvo).
    -- Então, garantimos que não houve mudança no papel.
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
