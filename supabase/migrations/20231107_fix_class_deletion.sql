-- Corrige o problema de deleção de turma por RLS cascade

-- Quando um admin deleta uma turma, os class_members são deletados via cascade.
-- A policy atual do class_members era apenas "auth.uid() = user_id".
-- Precisamos permitir que um admin (que deletou a turma) delete os members.

DROP POLICY IF EXISTS "Users can delete their own memberships (Unenroll)." ON public.class_members;

CREATE POLICY "Users can delete their own memberships or admins can delete all."
  ON public.class_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
