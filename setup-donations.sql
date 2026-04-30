-- Setup script for SahaySathi Donor System

-- 1. Create the donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('food', 'blood', 'medical', 'supplies')),
    quantity INTEGER DEFAULT 1,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'completed')),
    assigned_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add an index for faster spatial/geographical queries if needed
CREATE INDEX IF NOT EXISTS donations_status_idx ON public.donations (status);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid "already exists" error
DROP POLICY IF EXISTS "Enable read access for all users" ON public.donations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.donations;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.donations;

-- 5. Create policies (Allow read/insert/update access for the anon role since Clerk is handling auth client-side)
CREATE POLICY "Enable read access for all users" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own donations" 
  ON public.donations FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own donations" 
  ON public.donations FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Update requests table for mission tracking and AI features
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS fulfilled_resources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS rescue_requirements TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'Low';
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS required_volunteers INTEGER DEFAULT 4;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS required_resources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS estimated_people INTEGER DEFAULT 1;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_fake BOOLEAN DEFAULT false;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS volunteer_count INTEGER DEFAULT 0;

-- 6. Create the messages table for Situation Room chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policy for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users on messages" ON public.messages;
CREATE POLICY "Enable all access for all users on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Enable real-time for messages (commented out as it causes an error if already added)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

