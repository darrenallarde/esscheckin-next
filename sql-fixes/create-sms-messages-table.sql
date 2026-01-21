-- SMS Messages table for Twilio integration
-- Stores both outbound (from admin) and inbound (from student) messages

CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body TEXT NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    twilio_sid TEXT, -- Twilio's message SID for tracking
    status TEXT DEFAULT 'sent', -- sent, delivered, failed, received
    sent_by UUID REFERENCES auth.users(id), -- which admin sent it (for outbound)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by student
CREATE INDEX IF NOT EXISTS idx_sms_messages_student_id ON public.sms_messages(student_id);

-- Index for looking up by phone number (for incoming messages)
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_number ON public.sms_messages(from_number);

-- RLS Policies
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read all messages
CREATE POLICY "Admins can read all sms messages"
    ON public.sms_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Admins can insert messages (for outbound)
CREATE POLICY "Admins can insert sms messages"
    ON public.sms_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access to sms messages"
    ON public.sms_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to find student by phone number (for incoming messages)
CREATE OR REPLACE FUNCTION public.find_student_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_clean_phone TEXT;
BEGIN
    -- Clean the incoming phone number (remove all non-digits)
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Remove leading 1 if present (US country code)
    IF length(v_clean_phone) = 11 AND v_clean_phone LIKE '1%' THEN
        v_clean_phone := substring(v_clean_phone from 2);
    END IF;

    -- Search for matching student
    SELECT id INTO v_student_id
    FROM public.students
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') = v_clean_phone
       OR regexp_replace(phone, '[^0-9]', '', 'g') = substring(v_clean_phone from 2)
    LIMIT 1;

    RETURN v_student_id;
END;
$$;
