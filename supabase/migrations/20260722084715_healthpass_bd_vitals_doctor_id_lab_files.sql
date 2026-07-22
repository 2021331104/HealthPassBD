/*
# HealthPass BD — Add doctor_id to vitals, file_url to lab_reports, lab-files storage bucket

## Overview
1. Adds `doctor_id` to `vitals` so doctors can be credited for recording vitals.
   The PrescriptionBuilderModal already tries to insert doctor_id but the column
   doesn't exist, causing a silent failure.
2. Adds `file_url` to `lab_reports` so doctors can attach lab document uploads.
3. Creates a public `lab-files` storage bucket for uploaded lab documents.

## Security
- vitals.doctor_id: nullable FK to doctors, no RLS change needed (existing
  doctor_insert_vitals policy covers it)
- lab-files bucket: authenticated can upload, public can read, authenticated can delete
*/

-- 1. Add doctor_id to vitals
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS doctor_id uuid
  REFERENCES doctors(id) ON DELETE SET NULL;

-- 2. Add file_url to lab_reports
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS file_url text;

-- 3. Create storage bucket for lab file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-files', 'lab-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lab-files bucket
DROP POLICY IF EXISTS "lab_files_upload" ON storage.objects;
CREATE POLICY "lab_files_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'lab-files');

DROP POLICY IF EXISTS "lab_files_read" ON storage.objects;
CREATE POLICY "lab_files_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'lab-files');

DROP POLICY IF EXISTS "lab_files_delete" ON storage.objects;
CREATE POLICY "lab_files_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'lab-files');
