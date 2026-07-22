/*
# HealthPass BD - Role-based access, doctors, ambulances

## Overview
Adds role-based access (patient / doctor / ambulance) to the platform, plus doctor and ambulance dashboards with an ambulance request system.

## New Tables

### profiles
- `id` (uuid, PK, linked to auth.users)
- `role` (text) — 'patient' | 'doctor' | 'ambulance'
- `full_name` (text)
- `phone` (text)
- `created_at` (timestamptz)
One row per user. Drives role-based routing in the frontend.

### doctors
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users, unique)
- `registration_no` (text) — BM&DC registration
- `specialty` (text)
- `hospital_name` (text)
- `designation` (text)
- `created_at` (timestamptz)

### ambulances
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users, unique)
- `driver_name` (text)
- `vehicle_no` (text)
- `vehicle_type` (text) — e.g. Ambulance, ICU Ambulance
- `phone` (text)
- `district` (text)
- `upazila` (text)
- `capacity` (int)
- `is_available` (bool, default true)
- `lat` (numeric, nullable)
- `lng` (numeric, nullable)
- `created_at` (timestamptz)

### ambulance_requests
- `id` (uuid, PK)
- `patient_id` (uuid, FK -> patients)
- `ambulance_id` (uuid, FK -> ambulances, nullable)
- `status` (text) — 'pending' | 'accepted' | 'completed' | 'cancelled'
- `pickup_location` (text)
- `destination` (text)
- `emergency_note` (text)
- `requested_at` (timestamptz default now())
- `responded_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)

## Security
- RLS on all new tables
- profiles: owner-scoped CRUD for authenticated
- doctors: owner-scoped CRUD for authenticated; SELECT open to anon + authenticated (so patients can view doctor info)
- ambulances: owner-scoped INSERT/UPDATE/DELETE; SELECT open to anon + authenticated (so patients can find ambulances)
- ambulance_requests: patient can CRUD own requests; ambulance owner can SELECT/UPDATE requests for their ambulance
- patients table: add SELECT for anon by health_card_id (already exists) — doctors use authenticated read via patient ownership bypass not needed; doctors search by health_card_id using anon-readable policy already in place
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'patient',
  full_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_no text,
  specialty text,
  hospital_name text,
  designation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_doctors_all" ON doctors;
CREATE POLICY "select_doctors_all" ON doctors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_doctor" ON doctors;
CREATE POLICY "insert_own_doctor" ON doctors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_doctor" ON doctors;
CREATE POLICY "update_own_doctor" ON doctors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_doctor" ON doctors;
CREATE POLICY "delete_own_doctor" ON doctors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AMBULANCES
CREATE TABLE IF NOT EXISTS ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  vehicle_no text,
  vehicle_type text DEFAULT 'Ambulance',
  phone text,
  district text,
  upazila text,
  capacity int DEFAULT 1,
  is_available boolean NOT NULL DEFAULT true,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ambulances_all" ON ambulances;
CREATE POLICY "select_ambulances_all" ON ambulances FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_ambulance" ON ambulances;
CREATE POLICY "insert_own_ambulance" ON ambulances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ambulance" ON ambulances;
CREATE POLICY "update_own_ambulance" ON ambulances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ambulance" ON ambulances;
CREATE POLICY "delete_own_ambulance" ON ambulances FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AMBULANCE REQUESTS
CREATE TABLE IF NOT EXISTS ambulance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ambulance_id uuid REFERENCES ambulances(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  pickup_location text,
  destination text,
  emergency_note text,
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE ambulance_requests ENABLE ROW LEVEL SECURITY;

-- Patient (owner) can CRUD own requests
DROP POLICY IF EXISTS "select_own_requests_patient" ON ambulance_requests;
CREATE POLICY "select_own_requests_patient" ON ambulance_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = ambulance_requests.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_requests_patient" ON ambulance_requests;
CREATE POLICY "insert_own_requests_patient" ON ambulance_requests FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = ambulance_requests.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_requests_patient" ON ambulance_requests;
CREATE POLICY "update_own_requests_patient" ON ambulance_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = ambulance_requests.patient_id AND patients.user_id = auth.uid())
  );

-- Ambulance owner can SELECT + UPDATE requests for their ambulance
DROP POLICY IF EXISTS "select_requests_ambulance_owner" ON ambulance_requests;
CREATE POLICY "select_requests_ambulance_owner" ON ambulance_requests FOR SELECT
  TO authenticated USING (
    ambulance_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.id = ambulance_requests.ambulance_id AND ambulances.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_requests_ambulance_owner" ON ambulance_requests;
CREATE POLICY "update_requests_ambulance_owner" ON ambulance_requests FOR UPDATE
  TO authenticated USING (
    ambulance_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM ambulances WHERE ambulances.id = ambulance_requests.ambulance_id AND ambulances.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_user_id ON ambulances(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_available ON ambulances(is_available);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_patient_id ON ambulance_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_ambulance_id ON ambulance_requests(ambulance_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_status ON ambulance_requests(status);
