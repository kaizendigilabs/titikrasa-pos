-- Create storage bucket for store assets (logos, etc)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets',
  'store-assets',
  true,
  2097152, -- 2MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
);

-- RLS is already enabled on storage.objects by default in Supabase

-- Policy: Allow public read access to store-assets
create policy "Public read access for store assets"
on storage.objects for select
using (bucket_id = 'store-assets');

-- Policy: Allow authenticated users to upload to store-assets
create policy "Authenticated users can upload store assets"
on storage.objects for insert
with check (
  bucket_id = 'store-assets'
  and auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their uploads
create policy "Authenticated users can update store assets"
on storage.objects for update
using (
  bucket_id = 'store-assets'
  and auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their uploads
create policy "Authenticated users can delete store assets"
on storage.objects for delete
using (
  bucket_id = 'store-assets'
  and auth.role() = 'authenticated'
);
