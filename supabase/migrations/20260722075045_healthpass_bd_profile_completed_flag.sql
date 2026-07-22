/*
# HealthPass BD — Add is_profile_completed flag to patients

## Overview
Adds a boolean column `is_profile_completed` to the `patients` table. This flag is used by the frontend to determine whether to show the "Edit Profile" modal on first login. When a patient fills out and saves their profile, the flag is set to `true`. On page refresh, the flag is read from the database and the modal is NOT shown again.

## Modified Tables
### patients
- `is_profile_completed` (boolean, NOT NULL, default false) — set to true when the patient completes the profile edit form

## Security
No policy changes needed — the existing `update_own_patient` RLS policy already allows patients to update their own row, which now includes this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'is_profile_completed') THEN
    ALTER TABLE patients ADD COLUMN is_profile_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
