-- Fix: Add INSERT policy for users table
-- Users need to be able to create their own user record during signup

CREATE POLICY "Users can create own profile during signup" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
