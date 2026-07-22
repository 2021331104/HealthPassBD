/*
# HealthPass BD — Doctor write access to medical records

## Overview
Allows doctors to INSERT and UPDATE medical records (visits, prescriptions,
vitals, lab_reports) for any patient. Previously only the patient-owner could
write, which blocked the doctor dashboard from adding records.

## Security
- Doctor is verified by checking that a row exists in `doctors` where
  `doctors.user_id = auth.uid()`.
- SELECT policies are also added so doctors can read any patient's medical
  records (needed for patient lookup by health_card_id).
- Patients retain their existing read/write access — these policies are
  additive.
- No DELETE policies are added for doctors — only INSERT and UPDATE.
*/

-- ===== MEDICAL VISITS =====
-- Doctor can read any patient's visits
DROP POLICY IF EXISTS "doctor_select_visits" ON medical_visits;
CREATE POLICY "doctor_select_visits" ON medical_visits FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can insert visits for any patient
DROP POLICY IF EXISTS "doctor_insert_visits" ON medical_visits;
CREATE POLICY "doctor_insert_visits" ON medical_visits FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can update visits for any patient
DROP POLICY IF EXISTS "doctor_update_visits" ON medical_visits;
CREATE POLICY "doctor_update_visits" ON medical_visits FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- ===== PRESCRIPTIONS =====
DROP POLICY IF EXISTS "doctor_select_prescriptions" ON prescriptions;
CREATE POLICY "doctor_select_prescriptions" ON prescriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "doctor_insert_prescriptions" ON prescriptions;
CREATE POLICY "doctor_insert_prescriptions" ON prescriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "doctor_update_prescriptions" ON prescriptions;
CREATE POLICY "doctor_update_prescriptions" ON prescriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- ===== VITALS =====
-- Doctor can read any patient's vitals
DROP POLICY IF EXISTS "doctor_select_vitals" ON vitals;
CREATE POLICY "doctor_select_vitals" ON vitals FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can insert vitals for any patient
DROP POLICY IF EXISTS "doctor_insert_vitals" ON vitals;
CREATE POLICY "doctor_insert_vitals" ON vitals FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can update vitals for any patient
DROP POLICY IF EXISTS "doctor_update_vitals" ON vitals;
CREATE POLICY "doctor_update_vitals" ON vitals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- ===== LAB REPORTS =====
-- Doctor can read any patient's lab reports
DROP POLICY IF EXISTS "doctor_select_labs" ON lab_reports;
CREATE POLICY "doctor_select_labs" ON lab_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can insert lab reports for any patient
DROP POLICY IF EXISTS "doctor_insert_labs" ON lab_reports;
CREATE POLICY "doctor_insert_labs" ON lab_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- Doctor can update lab reports for any patient
DROP POLICY IF EXISTS "doctor_update_labs" ON lab_reports;
CREATE POLICY "doctor_update_labs" ON lab_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- ===== PATIENTS (doctor SELECT) =====
-- Doctors need to read patient profiles when looking up by health_card_id
-- (anon_read_patient_by_card already covers this, but adding explicit doctor
-- read policy for clarity and in case anon access is later restricted)
DROP POLICY IF EXISTS "doctor_select_patients" ON patients;
CREATE POLICY "doctor_select_patients" ON patients FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM doctors WHERE doctors.user_id = auth.uid())
  );
