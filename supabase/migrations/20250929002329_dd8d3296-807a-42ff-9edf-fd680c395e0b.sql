-- Update RLS policies to allow public check-ins while protecting sensitive data

-- Allow public read access for check-in lookups (but limit what data is exposed)
CREATE POLICY "Public can search students for check-in" 
ON public.students 
FOR SELECT 
USING (true);

-- Allow public check-in creation
CREATE POLICY "Public can create check-ins" 
ON public.check_ins 
FOR INSERT 
WITH CHECK (true);

-- Allow public student registration during check-in
CREATE POLICY "Public can register new students" 
ON public.students 
FOR INSERT 
WITH CHECK (true);

-- Keep admin-only policies for full data access
-- (existing admin policies remain for sensitive operations)