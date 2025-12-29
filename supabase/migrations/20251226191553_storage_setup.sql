-- Create storage buckets for treatment application

-- Create treatment-images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'treatment-images',
    'treatment-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create user-uploads bucket (public for image URLs to work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-uploads',
    'user-uploads',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-uploads bucket
-- Users can upload their own files
CREATE POLICY "Users can upload own files" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'user-uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own files
CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'user-uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'user-uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'user-uploads' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Public read access for treatment-images bucket
CREATE POLICY "Public can view treatment images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'treatment-images');

-- Public read access for user-uploads bucket (needed for images to display)
CREATE POLICY "Public can view user uploads" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'user-uploads');
