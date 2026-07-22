export type Role = 'patient' | 'doctor' | 'ambulance';

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  blood_group: string | null;
  nid: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies: string[];
  chronic_conditions: string[];
  photo_url: string | null;
  health_card_id: string;
  is_profile_completed: boolean;
  created_at: string;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface MedicalVisit {
  id: string;
  patient_id: string;
  visit_date: string;
  hospital_name: string | null;
  doctor_name: string | null;
  doctor_id: string | null;
  diagnosis: string | null;
  chief_complaints: string | null;
  notes: string | null;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  visit_id: string | null;
  doctor_id: string | null;
  prescribed_date: string;
  doctor_name: string | null;
  hospital_name: string | null;
  chief_complaints: string | null;
  medications: Medication[];
  created_at: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  oxygen_saturation: number | null;
  notes: string | null;
}

export interface LabReport {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  report_date: string;
  test_name: string;
  result: string | null;
  normal_range: string | null;
  status: 'normal' | 'abnormal' | 'critical' | 'ordered' | string;
  lab_name: string | null;
  ordered_by: string | null;
  file_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  registration_no: string | null;
  specialty: string | null;
  hospital_name: string | null;
  designation: string | null;
  created_at: string;
}

export interface Ambulance {
  id: string;
  user_id: string;
  driver_name: string;
  vehicle_no: string | null;
  vehicle_type: string;
  phone: string | null;
  district: string | null;
  upazila: string | null;
  capacity: number;
  is_available: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface AmbulanceRequest {
  id: string;
  patient_id: string;
  ambulance_id: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled' | string;
  pickup_location: string | null;
  destination: string | null;
  emergency_note: string | null;
  requested_at: string;
  responded_at: string | null;
  completed_at: string | null;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department: string | null;
  appointment_date: string;
  time_slot: string;
  serial_number: number;
  status: 'pending' | 'confirmed' | 'in_consultation' | 'completed' | 'cancelled' | string;
  chief_complaint: string | null;
  created_at: string;
}
