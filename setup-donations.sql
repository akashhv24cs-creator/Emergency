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
CREATE POLICY "Enable update for users based on user_id" ON public.donations FOR UPDATE USING (true);
