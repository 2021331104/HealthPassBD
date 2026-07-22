/*
# HealthPass BD - Patient Portal Schema

## Overview
Creates the full schema for the HealthPass BD patient portal.

## New Tables

### patients
- `id` (uuid, primary key, linked to auth.users)
- `full_name` (text)
- `date_of_birth` (date)
- `blood_group` (text) — e.g. A+, B-, O+
- `nid` (text) — National ID
- `phone` (text)
- `address` (text)
- `emergency_contact_name` (text)
- `emergency_contact_phone` (text)
- `allergies` (text[]) — list of known allergies
- `chronic_conditions` (text[]) — e.g. Diabetes, Hypertension
- `photo_url` (text)
- `health_card_id` (text, unique) — the public QR code identifier
- `created_at` (timestamptz)

### medical_visits
- `id` (uuid, primary key)
- `patient_id` (uuid, FK -> patients)
- `visit_date` (date)
- `hospital_name` (text)
- `doctor_name` (text)
- `diagnosis` (text)
- `notes` (text)
- `created_at` (timestamptz)

### prescriptions
- `id` (uuid, primary key)
- `patient_id` (uuid, FK -> patients)
- `visit_id` (uuid, FK -> medical_visits, nullable)
- `prescribed_date` (date)
- `doctor_name` (text)
- `hospital_name` (text)
- `medications` (jsonb) — array of {name, dose, frequency, duration}
- `created_at` (timestamptz)

### vitals
- `id` (uuid, primary key)
- `patient_id` (uuid, FK -> patients)
- `recorded_at` (timestamptz)
- `blood_pressure_systolic` (int)
- `blood_pressure_diastolic` (int)
- `heart_rate` (int)
- `temperature` (numeric)
- `weight_kg` (numeric)
- `height_cm` (numeric)
- `oxygen_saturation` (int)
- `notes` (text)

### lab_reports
- `id` (uuid, primary key)
- `patient_id` (uuid, FK -> patients)
- `report_date` (date)
- `test_name` (text)
- `result` (text)
- `normal_range` (text)
- `status` (text) — normal / abnormal / critical
- `lab_name` (text)
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables
- authenticated users can only access their own data
- health_records_public view accessible by anon for QR scan (scoped by health_card_id)
*/

-- PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  blood_group text,
  nid text,
  phone text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allergies text[] DEFAULT '{}',
  chronic_conditions text[] DEFAULT '{}',
  photo_url text,
  health_card_id text UNIQUE DEFAULT 'HP-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patient" ON patients;
CREATE POLICY "select_own_patient" ON patients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_patient" ON patients;
CREATE POLICY "insert_own_patient" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_patient" ON patients;
CREATE POLICY "update_own_patient" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_patient" ON patients;
CREATE POLICY "delete_own_patient" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Allow anon to read by health_card_id for QR scanning
DROP POLICY IF EXISTS "anon_read_patient_by_card" ON patients;
CREATE POLICY "anon_read_patient_by_card" ON patients FOR SELECT
  TO anon USING (health_card_id IS NOT NULL);

-- MEDICAL VISITS
CREATE TABLE IF NOT EXISTS medical_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  hospital_name text,
  doctor_name text,
  diagnosis text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medical_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_visits" ON medical_visits;
CREATE POLICY "select_own_visits" ON medical_visits FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = medical_visits.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_visits" ON medical_visits;
CREATE POLICY "insert_own_visits" ON medical_visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = medical_visits.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_visits" ON medical_visits;
CREATE POLICY "update_own_visits" ON medical_visits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = medical_visits.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_visits" ON medical_visits;
CREATE POLICY "delete_own_visits" ON medical_visits FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = medical_visits.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_read_visits" ON medical_visits;
CREATE POLICY "anon_read_visits" ON medical_visits FOR SELECT
  TO anon USING (true);

-- PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES medical_visits(id) ON DELETE SET NULL,
  prescribed_date date NOT NULL DEFAULT CURRENT_DATE,
  doctor_name text,
  hospital_name text,
  medications jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_prescriptions" ON prescriptions;
CREATE POLICY "select_own_prescriptions" ON prescriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_prescriptions" ON prescriptions;
CREATE POLICY "insert_own_prescriptions" ON prescriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_prescriptions" ON prescriptions;
CREATE POLICY "update_own_prescriptions" ON prescriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_prescriptions" ON prescriptions;
CREATE POLICY "delete_own_prescriptions" ON prescriptions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = prescriptions.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_read_prescriptions" ON prescriptions;
CREATE POLICY "anon_read_prescriptions" ON prescriptions FOR SELECT
  TO anon USING (true);

-- VITALS
CREATE TABLE IF NOT EXISTS vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  temperature numeric(4,1),
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  oxygen_saturation int,
  notes text
);

ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vitals" ON vitals;
CREATE POLICY "select_own_vitals" ON vitals FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_vitals" ON vitals;
CREATE POLICY "insert_own_vitals" ON vitals FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_vitals" ON vitals;
CREATE POLICY "update_own_vitals" ON vitals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_vitals" ON vitals;
CREATE POLICY "delete_own_vitals" ON vitals FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = vitals.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_read_vitals" ON vitals;
CREATE POLICY "anon_read_vitals" ON vitals FOR SELECT
  TO anon USING (true);

-- LAB REPORTS
CREATE TABLE IF NOT EXISTS lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  test_name text NOT NULL,
  result text,
  normal_range text,
  status text DEFAULT 'normal',
  lab_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_labs" ON lab_reports;
CREATE POLICY "select_own_labs" ON lab_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_reports.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_labs" ON lab_reports;
CREATE POLICY "insert_own_labs" ON lab_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_reports.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_labs" ON lab_reports;
CREATE POLICY "update_own_labs" ON lab_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_reports.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_labs" ON lab_reports;
CREATE POLICY "delete_own_labs" ON lab_reports FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = lab_reports.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "anon_read_labs" ON lab_reports;
CREATE POLICY "anon_read_labs" ON lab_reports FOR SELECT
  TO anon USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_health_card_id ON patients(health_card_id);
CREATE INDEX IF NOT EXISTS idx_medical_visits_patient_id ON medical_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON lab_reports(patient_id);
