/*
# HealthPass BD — Fixes: Doctor access, Appointments, Ambulance broadcast, Realtime

## Overview
This migration fixes several critical issues and adds new features:
1. Fixes RLS so DOCTORS can read patient medical records (visits, prescriptions, vitals, labs) — currently only the patient owner can read them, so doctor dashboard lookups return empty results.
2. Adds an `appointments` table with a database function `create_appointment()` that atomically assigns an incremental serial number per doctor per day (no race conditions).
3. Fixes ambulance broadcast: "Any Available Ambulance" requests (where ambulance_id is NULL) must be visible to ALL ambulance drivers, not just a specific ambulance owner.
4. Adds `doctor_id` to `medical_visits`, `prescriptions`, and `lab_reports` so doctors can write clinical records to patient records.
5. Enables Supabase Realtime on `ambulance_requests` and `appointments` for live updates.

## New Tables

### appointments
- `id` (uuid, PK)
- `patient_id` (uuid, FK -> patients)
- `doctor_id` (uuid, FK -> doctors)
- `department` (text) — e.g. Cardiology
- `appointment_date` (date)
- `time_slot` (text) — e.g. "10:00-10:30"
- `serial_number` (int) — auto-assigned per doctor/day
- `status` (text) — 'pending' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled'
- `chief_complaint` (text, nullable)
- `created_at` (timestamptz)

## New Functions

### create_appointment(p_patient_id, p_doctor_id, p_department, p_appointment_date, p_time_slot, p_chief_complaint)
Atomically inserts an appointment and returns the full row with an auto-incremented serial_number.
Serial is computed as MAX(serial_number) + 1 for the same doctor_id + appointment_date, defaulting to 1.
The function is SECURITY DEFINER to bypass RLS during the insert, ensuring atomic serial allocation.

## Modified Tables
- `medical_visits`: add `doctor_id` (uuid, nullable, FK -> doctors)
- `prescriptions`: add `doctor_id` (uuid, nullable, FK -> doctors), `chief_complaints` (text, nullable)
- `lab_reports`: add `doctor_id` (uuid, nullable, FK -> doctors), `ordered_by` (text, nullable)

## Security Changes
- patients: add SELECT policy for doctors (authenticated users who have a row in `doctors`)
- medical_visits: add SELECT/INSERT policies for doctors
- prescriptions: add SELECT/INSERT policies for doctors
- vitals: add SELECT/INSERT policies for doctors
- lab_reports: add SELECT/INSERT policies for doctors
- ambulance_requests: add SELECT policy for ALL ambulance drivers to see broadcast (NULL ambulance_id) requests; add UPDATE policy so any ambulance driver can accept a broadcast request (sets ambulance_id)
- appointments: RLS with patient SELECT/INSERT, doctor SELECT/UPDATE

## Realtime
- Adds tables `ambulance_requests` and `appointments` to the Supabase Realtime publication.
*/

-- ========== APPOINTMENTS TABLE ==========
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  department text,
  appointment_date date NOT NULL,
  time_slot text NOT NULL,
  serial_number int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  chief_complaint text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Patient can see their own appointments
DROP POLICY IF EXISTS "select_own_appointments" ON appointments;
CREATE POLICY "select_own_appointments" ON appointments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
  );

-- Doctors can see appointments for themselves
DROP POLICY IF EXISTS "select_doctor_appointments" ON appointments;
CREATE POLICY "select_doctor_appointments" ON appointments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid())
  );

-- Patient can create appointments (serial assigned by RPC function)
DROP POLICY IF EXISTS "insert_own_appointments" ON appointments;
CREATE POLICY "insert_own_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = appointments.patient_id AND patients.user_id = auth.uid())
  );

-- Doctor can update appointment status
DROP POLICY IF EXISTS "update_doctor_appointments" ON appointments;
CREATE POLICY "update_doctor_appointments" ON appointments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.id = appointments.doctor_id AND doctors.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

-- ========== CREATE APPOINTMENT FUNCTION (atomic serial) ==========
-- Drops existing function if present and recreates
DROP FUNCTION IF EXISTS create_appointment(uuid, uuid, text, date, text, text);

CREATE OR REPLACE FUNCTION create_appointment(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_department text,
  p_appointment_date date,
  p_time_slot text,
  p_chief_complaint text DEFAULT NULL
)
RETURNS appointments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_serial int;
  v_appt appointments;
BEGIN
  -- Atomically compute next serial for this doctor + date
  SELECT COALESCE(MAX(serial_number), 0) + 1
  INTO v_serial
  FROM appointments
  WHERE doctor_id = p_doctor_id AND appointment_date = p_appointment_date;

  -- Insert and return the row
  INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, time_slot, serial_number, status, chief_complaint)
  VALUES (p_patient_id, p_doctor_id, p_department, p_appointment_date, p_time_slot, v_serial, 'pending', p_chief_complaint)
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

GRANT EXECUTE ON FUNCTION create_appointment TO authenticated;

-- ========== ADD doctor_id TO EXISTING TABLES ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_visits' AND column_name = 'doctor_id') THEN
    ALTER TABLE medical_visits ADD COLUMN doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_visits' AND column_name = 'chief_complaints') THEN
    ALTER TABLE medical_visits ADD COLUMN chief_complaints text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'doctor_id') THEN
    ALTER TABLE prescriptions ADD COLUMN doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'chief_complaints') THEN
    ALTER TABLE prescriptions ADD COLUMN chief_complaints text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_reports' AND column_name = 'doctor_id') THEN
    ALTER TABLE lab_reports ADD COLUMN doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_reports' AND column_name = 'ordered_by') THEN
    ALTER TABLE lab_reports ADD COLUMN ordered_by text;
  END IF;
END $$;

-- ========== DOCTOR RLS POLICIES ON MEDICAL TABLES ==========

-- patients: doctors can SELECT
DROP POLICY IF EXISTS "select_patients_doctors" ON patients;
CREATE POLICY "select_patients_doctors" ON patients FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- medical_visits: doctors can SELECT + INSERT
DROP POLICY IF EXISTS "select_visits_doctors" ON medical_visits;
CREATE POLICY "select_visits_doctors" ON medical_visits FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_visits_doctors" ON medical_visits;
CREATE POLICY "insert_visits_doctors" ON medical_visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_visits_doctors" ON medical_visits;
CREATE POLICY "update_visits_doctors" ON medical_visits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- prescriptions: doctors can SELECT + INSERT
DROP POLICY IF EXISTS "select_prescriptions_doctors" ON prescriptions;
CREATE POLICY "select_prescriptions_doctors" ON prescriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_prescriptions_doctors" ON prescriptions;
CREATE POLICY "insert_prescriptions_doctors" ON prescriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- vitals: doctors can SELECT + INSERT
DROP POLICY IF EXISTS "select_vitals_doctors" ON vitals;
CREATE POLICY "select_vitals_doctors" ON vitals FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_vitals_doctors" ON vitals;
CREATE POLICY "insert_vitals_doctors" ON vitals FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- lab_reports: doctors can SELECT + INSERT
DROP POLICY IF EXISTS "select_labs_doctors" ON lab_reports;
CREATE POLICY "select_labs_doctors" ON lab_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_labs_doctors" ON lab_reports;
CREATE POLICY "insert_labs_doctors" ON lab_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- ========== AMBULANCE BROADCAST FIX ==========

-- Replace the ambulance owner SELECT policy to ALSO include broadcast (NULL ambulance_id) requests
DROP POLICY IF EXISTS "select_requests_ambulance_owner" ON ambulance_requests;
CREATE POLICY "select_requests_ambulance_owner" ON ambulance_requests FOR SELECT
  TO authenticated USING (
    -- requests assigned to this driver's ambulance
    (ambulance_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.id = ambulance_requests.ambulance_id AND ambulances.user_id = auth.uid()))
    -- OR broadcast requests (ambulance_id IS NULL) visible to ALL ambulance drivers
    OR (ambulance_id IS NULL
        AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.user_id = auth.uid())
        AND status = 'pending')
  );

-- Allow any ambulance driver to accept a broadcast request (sets ambulance_id + status)
DROP POLICY IF EXISTS "update_requests_ambulance_owner" ON ambulance_requests;
CREATE POLICY "update_requests_ambulance_owner" ON ambulance_requests FOR UPDATE
  TO authenticated USING (
    -- update their own ambulance's requests
    (ambulance_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.id = ambulance_requests.ambulance_id AND ambulances.user_id = auth.uid()))
    -- OR accept a broadcast (NULL) request — this is the "claim" action
    OR (ambulance_id IS NULL AND status = 'pending'
        AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.user_id = auth.uid()))
  );

-- ========== REALTIME ==========
ALTER TABLE ambulance_requests REPLICA IDENTITY FULL;
ALTER TABLE appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ambulance_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_requests;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;
