-- Fix: Allow submissions to verify foreign key reference to users table
-- When inserting a submission, PostgreSQL needs to check if user_id exists in users table
-- RLS was blocking this check

-- Allow authenticated users to verify their own user record exists (for FK checks)
CREATE POLICY "Allow FK verification for submissions" ON public.users
  FOR SELECT USING (auth.uid() = id);
