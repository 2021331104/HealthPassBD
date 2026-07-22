import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, MedicalVisit, Prescription, Vital, LabReport, Ambulance, AmbulanceRequest, Appointment, Doctor } from '../types';
import HealthCard from '../components/HealthCard';
import HealthCardPrintable from '../components/HealthCardPrintable';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ClipboardList, FlaskConical, HeartPulse, LogOut, Plus, Stethoscope,
  TrendingUp, X, Loader2, AlertCircle, Download, QrCode, User as UserIcon,
  Phone, MapPin, Calendar, ShieldAlert, Pill, Ambulance as AmbulanceIcon,
  CalendarClock, Hash,
} from 'lucide-react';

type Tab = 'overview' | 'visits' | 'prescriptions' | 'vitals' | 'labs' | 'ambulance' | 'appointments';

export default function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showAdd, setShowAdd] = useState<Tab | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setLoading(false); return; }
      const { data, error } = await supabase.from('patients').select('*').eq('user_id', user.id).maybeSingle();
      if (error) { if (mounted) setLoading(false); return; }
      if (!data) {
        // auto-create a minimal patient record from signup metadata
        const insert = {
          user_id: user.id,
          full_name: (user.user_metadata?.full_name as string) || 'New Patient',
        };
        const { data: created, error: insErr } = await supabase
          .from('patients')
          .upsert(insert, { onConflict: 'user_id' })
          .select()
          .maybeSingle();
        if (insErr) { if (mounted) setLoading(false); return; }
        if (mounted) { setPatient(created as Patient | null); setShowProfileEdit(true); }
      } else {
        const pt = data as Patient;
        if (mounted) {
          setPatient(pt);
          // Only show profile edit modal if profile is NOT completed
          if (!pt.is_profile_completed) setShowProfileEdit(true);
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Force all panels to re-fetch data after a modal save
  const handleDataSaved = () => {
    setRefreshKey((k) => k + 1);
    setShowAdd(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Could not load patient profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg hp-gradient flex items-center justify-center">
              <HeartPulse className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">HealthPass BD</span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 hp-fade-in">
        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          {/* Left column: card + profile */}
          <div className="space-y-5">
            <div className="hp-rise">
              <HealthCard patient={patient} publicUrlBase={window.location.origin} />
            </div>

            <div className="bg-white rounded-2xl hp-soft-shadow p-5 hp-rise">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">Profile</h3>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  Edit
                </button>
              </div>
              <dl className="space-y-2.5 text-sm">
                <InfoRow icon={<UserIcon className="w-3.5 h-3.5" />} label="Name" value={patient.full_name} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="DOB" value={patient.date_of_birth ?? '—'} />
                <InfoRow icon={<HeartPulse className="w-3.5 h-3.5" />} label="Blood" value={patient.blood_group ?? '—'} />
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={patient.phone ?? '—'} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" value={patient.address ?? '—'} />
              </dl>
              {(patient.allergies.length > 0 || patient.chronic_conditions.length > 0) && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {patient.allergies.length > 0 && (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">Allergies</p>
                        <p className="text-xs text-slate-600">{patient.allergies.join(', ')}</p>
                      </div>
                    </div>
                  )}
                  {patient.chronic_conditions.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Activity className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Chronic</p>
                        <p className="text-xs text-slate-600">{patient.chronic_conditions.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => downloadCard(patient)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors hp-soft-shadow"
            >
              <Download className="w-4 h-4" />
              Download health card
            </button>

            <button
              onClick={() => setShowAdd('ambulance')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
            >
              <AmbulanceIcon className="w-4 h-4" />
              Request ambulance
            </button>
          </div>

          {/* Right column: tabs + content */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl hp-soft-shadow p-1.5 flex gap-1 overflow-x-auto hp-rise">
              {([
                { k: 'overview', label: 'Overview', icon: TrendingUp },
                { k: 'visits', label: 'Visits', icon: Stethoscope },
                { k: 'prescriptions', label: 'Prescriptions', icon: Pill },
                { k: 'vitals', label: 'Vitals', icon: Activity },
                { k: 'labs', label: 'Lab Reports', icon: FlaskConical },
                { k: 'ambulance', label: 'Ambulance', icon: AmbulanceIcon },
                { k: 'appointments', label: 'Appointments', icon: CalendarClock },
              ] as { k: Tab; label: string; icon: typeof Activity }[]).map(({ k, label, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === k ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl hp-soft-shadow p-5 sm:p-6 hp-rise">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">
                  {tab === 'overview' && 'Health Overview'}
                  {tab === 'visits' && 'Medical Visits'}
                  {tab === 'prescriptions' && 'Prescriptions'}
                  {tab === 'vitals' && 'Vitals History'}
                  {tab === 'labs' && 'Lab Reports'}
                  {tab === 'ambulance' && 'Ambulance'}
                  {tab === 'appointments' && 'Appointments'}
                </h2>
                {tab !== 'overview' && tab !== 'ambulance' && tab !== 'visits' && tab !== 'prescriptions' && tab !== 'vitals' && tab !== 'labs' && (
                  <button
                    onClick={() => setShowAdd(tab)}
                    className="flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                )}
              </div>

              {tab === 'overview' && <OverviewPanel patient={patient} refreshKey={refreshKey} />}
              {tab === 'visits' && <VisitsPanel patientId={patient.id} refreshKey={refreshKey} />}
              {tab === 'prescriptions' && <PrescriptionsPanel patientId={patient.id} refreshKey={refreshKey} />}
              {tab === 'vitals' && <VitalsPanel patientId={patient.id} refreshKey={refreshKey} />}
              {tab === 'labs' && <LabsPanel patientId={patient.id} refreshKey={refreshKey} />}
              {tab === 'ambulance' && <AmbulancePanel patientId={patient.id} refreshKey={refreshKey} />}
              {tab === 'appointments' && <AppointmentsPanel patientId={patient.id} onBook={() => setShowAdd('appointments')} refreshKey={refreshKey} />}
            </div>
          </div>
        </div>
      </main>

      {showProfileEdit && (
        <ProfileEditModal patient={patient} onClose={() => setShowProfileEdit(false)} onSaved={(p) => { setPatient(p); setRefreshKey((k) => k + 1); }} />
      )}
      {showAdd === 'ambulance' && (
        <RequestAmbulanceModal patientId={patient.id} onClose={handleDataSaved} />
      )}
      {showAdd === 'appointments' && (
        <BookAppointmentModal patientId={patient.id} onClose={handleDataSaved} />
      )}
    </div>
  );
}

/* ---------- Appointments ---------- */
function AppointmentsPanel({ patientId, onBook, refreshKey }: { patientId: string; onBook: () => void; refreshKey: number }) {
  const [items, setItems] = useState<(Appointment & { doctor?: Doctor })[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }).order('serial_number', { ascending: true });
      const appts = (data as Appointment[]) ?? [];
      let withDocs: (Appointment & { doctor?: Doctor })[] = appts;
      if (appts.length) {
        const ids = [...new Set(appts.map((a) => a.doctor_id))];
        const { data: docs } = await supabase.from('doctors').select('*').in('id', ids);
        const map = new Map((docs as Doctor[] | null ?? []).map((d) => [d.id, d]));
        withDocs = appts.map((a) => ({ ...a, doctor: map.get(a.doctor_id) }));
      }
      setItems(withDocs);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={CalendarClock} title="No appointments" subtitle="Book your first appointment." />;
  const sc: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-sky-50 text-sky-700',
    in_consultation: 'bg-violet-50 text-violet-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{a.doctor?.designation ?? 'Doctor'} {(a.doctor?.specialty ?? '').split(' ').slice(-1)[0]}</p>
              <p className="text-xs text-slate-500">{a.doctor?.specialty ?? ''} · {a.doctor?.hospital_name ?? ''}</p>
              <p className="text-xs text-slate-500 mt-0.5">{new Date(a.appointment_date).toLocaleDateString()} · {a.time_slot}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${sc[a.status] ?? sc.pending}`}>{a.status.replace('_', ' ')}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg"><Hash className="w-3 h-3" /> Serial #{String(a.serial_number).padStart(2, '0')}</span>
            {a.department && <span className="text-slate-500">{a.department}</span>}
          </div>
          {a.chief_complaint && <p className="mt-2 text-sm text-slate-500 italic">"{a.chief_complaint}"</p>}
        </div>
      ))}
    </div>
  );
}

function BookAppointmentModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [department, setDepartment] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedSerial, setBookedSerial] = useState<number | null>(null);

  const timeSlots = ['09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00', '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00'];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('doctors').select('*').order('created_at', { ascending: false });
      setDoctors((data as Doctor[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    if (!doctorId) { setError('Please select a doctor.'); setSaving(false); return; }
    if (!date) { setError('Please select a date.'); setSaving(false); return; }
    if (!timeSlot) { setError('Please select a time slot.'); setSaving(false); return; }
    const { data, error: err } = await supabase.rpc('create_appointment', {
      p_patient_id: patientId,
      p_doctor_id: doctorId,
      p_department: department || null,
      p_appointment_date: date,
      p_time_slot: timeSlot,
      p_chief_complaint: chiefComplaint || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) setBookedSerial((data as Appointment).serial_number);
  }

  if (bookedSerial !== null) {
    return (
      <Modal title="Appointment booked!" onClose={onClose}>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800">Serial #{String(bookedSerial).padStart(2, '0')}</p>
          <p className="text-sm text-slate-500 mt-1">Your appointment has been confirmed for {new Date(date).toLocaleDateString()} at {timeSlot}</p>
          <button onClick={onClose} className="mt-5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm">Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Book appointment" onClose={onClose}>
      {loading ? <CenterSpinner /> : (
        <form onSubmit={save} className="space-y-3">
          {doctors.length === 0 ? (
            <p className="text-sm text-slate-400">No doctors registered yet.</p>
          ) : (
            <>
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Doctor</span>
                <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); const d = doctors.find((x) => x.id === e.target.value); setDepartment(d?.specialty ?? ''); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white">
                  <option value="">Select a doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.designation ?? 'Dr.'} · {d.specialty ?? 'General'} · {d.hospital_name ?? ''}</option>
                  ))}
                </select>
              </label>
              <Input label="Department" value={department} onChange={setDepartment} />
              <Input label="Date" type="date" value={date} onChange={setDate} />
              <label className="block">
                <span className="block text-xs font-medium text-slate-600 mb-1">Time slot</span>
                <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white">
                  <option value="">Select a time</option>
                  {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <Textarea label="Chief complaint (optional)" value={chiefComplaint} onChange={setChiefComplaint} />
              {error && <ErrorMsg msg={error} />}
              <SaveRow saving={saving} onClose={onClose} />
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

/* ---------- Ambulance ---------- */
function AmbulancePanel({ patientId, refreshKey }: { patientId: string; refreshKey: number }) {
  const [items, setItems] = useState<(AmbulanceRequest & { ambulance?: Ambulance })[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('ambulance_requests').select('*').eq('patient_id', patientId).order('requested_at', { ascending: false });
      const reqs = (data as AmbulanceRequest[]) ?? [];
      let withAmb: (AmbulanceRequest & { ambulance?: Ambulance })[] = reqs;
      if (reqs.length) {
        const ids = [...new Set(reqs.map((r) => r.ambulance_id).filter(Boolean))] as string[];
        if (ids.length) {
          const { data: ambs } = await supabase.from('ambulances').select('*').in('id', ids);
          const map = new Map((ambs as Ambulance[] | null ?? []).map((a) => [a.id, a]));
          withAmb = reqs.map((r) => ({ ...r, ambulance: r.ambulance_id ? map.get(r.ambulance_id) : undefined }));
        }
      }
      setItems(withAmb);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={AmbulanceIcon} title="No ambulance requests" subtitle="Tap 'Request ambulance' in an emergency." />;
  const sc: Record<string, string> = { pending: 'bg-amber-50 text-amber-700', accepted: 'bg-sky-50 text-sky-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-rose-50 text-rose-700' };
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{r.ambulance ? `${r.ambulance.vehicle_type} · ${r.ambulance.vehicle_no ?? ''}` : 'Finding ambulance...'}</p>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${sc[r.status] ?? sc.pending}`}>{r.status}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{new Date(r.requested_at).toLocaleString()}</p>
          {r.pickup_location && <p className="mt-2 text-sm text-slate-600">Pickup: {r.pickup_location}</p>}
          {r.destination && <p className="text-sm text-slate-600">Destination: {r.destination}</p>}
          {r.emergency_note && <p className="mt-1 text-sm text-slate-500 italic">"{r.emergency_note}"</p>}
          {r.ambulance?.phone && <p className="mt-2 text-sm text-slate-600 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.ambulance.phone}</p>}
        </div>
      ))}
    </div>
  );
}

function RequestAmbulanceModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [form, setForm] = useState({ pickup_location: '', destination: '', emergency_note: '' });
  const [ambulanceId, setAmbulanceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ambulances').select('*').eq('is_available', true).order('created_at', { ascending: false });
      setAmbulances((data as Ambulance[]) ?? []);
      setLoading(false);
    })();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    if (!form.pickup_location.trim()) { setError('Pickup location is required.'); setSaving(false); return; }
    const { error: err } = await supabase.from('ambulance_requests').insert({
      patient_id: patientId,
      ambulance_id: ambulanceId || null,
      pickup_location: form.pickup_location,
      destination: form.destination || null,
      emergency_note: form.emergency_note || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }
  return (
    <Modal title="Request ambulance" onClose={onClose}>
      {loading ? <CenterSpinner /> : (
        <form onSubmit={save} className="space-y-3">
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Available ambulances</span>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {ambulances.length === 0 ? (
                <p className="text-sm text-slate-400">No ambulances currently available. Your request will be broadcast.</p>
              ) : (
                <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${ambulanceId === '' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="amb" checked={ambulanceId === ''} onChange={() => setAmbulanceId('')} className="accent-sky-600" />
                  <div className="text-sm"><p className="font-medium text-slate-700">Any available ambulance</p><p className="text-xs text-slate-400">Broadcast to all drivers</p></div>
                </label>
              )}
              {ambulances.map((a) => (
                <label key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${ambulanceId === a.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="amb" checked={ambulanceId === a.id} onChange={() => setAmbulanceId(a.id)} className="accent-sky-600" />
                  <div className="text-sm min-w-0 flex-1">
                    <p className="font-medium text-slate-700 truncate">{a.driver_name} · {a.vehicle_no ?? 'No plate'}</p>
                    <p className="text-xs text-slate-400">{a.vehicle_type} · {[a.upazila, a.district].filter(Boolean).join(', ') || 'Location N/A'}</p>
                  </div>
                  {a.phone && <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </label>
              ))}
            </div>
          </div>
          <Input label="Pickup location" value={form.pickup_location} onChange={(v) => setForm({ ...form, pickup_location: v })} />
          <Input label="Destination (hospital)" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} />
          <Textarea label="Emergency note" value={form.emergency_note} onChange={(v) => setForm({ ...form, emergency_note: v })} />
          {error && <ErrorMsg msg={error} />}
          <SaveRow saving={saving} onClose={onClose} />
        </form>
      )}
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium truncate">{value}</span>
    </div>
  );
}

/* ---------- Overview ---------- */
function OverviewPanel({ patient, refreshKey }: { patient: Patient; refreshKey: number }) {
  const [stats, setStats] = useState({ visits: 0, prescriptions: 0, vitals: 0, labs: 0 });
  const [recentVitals, setRecentVitals] = useState<Vital | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [v, p, vit, l] = await Promise.all([
        supabase.from('medical_visits').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
        supabase.from('vitals').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
        supabase.from('lab_reports').select('id', { count: 'exact', head: true }).eq('patient_id', patient.id),
      ]);
      setStats({ visits: v.count ?? 0, prescriptions: p.count ?? 0, vitals: vit.count ?? 0, labs: l.count ?? 0 });
      const { data: rv } = await supabase
        .from('vitals').select('*').eq('patient_id', patient.id)
        .order('recorded_at', { ascending: false }).limit(1).maybeSingle();
      setRecentVitals(rv as Vital | null);
      setLoading(false);
    })();
  }, [patient.id, refreshKey]);

  if (loading) return <CenterSpinner />;

  const cards = [
    { label: 'Visits', value: stats.visits, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
    { label: 'Prescriptions', value: stats.prescriptions, icon: Pill, color: 'text-violet-600 bg-violet-50' },
    { label: 'Vitals', value: stats.vitals, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Lab Reports', value: stats.labs, icon: FlaskConical, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-100 p-4">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-2`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {recentVitals && (
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-700">Latest Vitals</h3>
            <span className="text-xs text-slate-400 ml-auto">
              {new Date(recentVitals.recorded_at).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <VitalStat label="BP" value={recentVitals.blood_pressure_systolic && recentVitals.blood_pressure_diastolic ? `${recentVitals.blood_pressure_systolic}/${recentVitals.blood_pressure_diastolic}` : '—'} unit="mmHg" />
            <VitalStat label="Heart Rate" value={recentVitals.heart_rate ?? '—'} unit="bpm" />
            <VitalStat label="SpO₂" value={recentVitals.oxygen_saturation ?? '—'} unit="%" />
            <VitalStat label="Temp" value={recentVitals.temperature ?? '—'} unit="°C" />
          </div>
        </div>
      )}

      <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 flex items-start gap-3">
        <QrCode className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-sky-800">Share your health card</p>
          <p className="text-xs text-sky-700/80 mt-0.5">
            Doctors can scan the QR on your card to instantly view your verified medical history — visits, prescriptions, vitals and lab reports.
          </p>
        </div>
      </div>
    </div>
  );
}

function VitalStat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">
        {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

/* ---------- Visits ---------- */
function VisitsPanel({ patientId, refreshKey }: { patientId: string; refreshKey: number }) {
  const [items, setItems] = useState<MedicalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from('medical_visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false });
      if (!error) setItems((data as MedicalVisit[]) ?? []);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={Stethoscope} title="No visits recorded" subtitle="Your doctor will add visit records after consultations." />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{v.hospital_name ?? 'Hospital'}</p>
              <p className="text-xs text-slate-500">{v.doctor_name ?? 'Doctor'} · {new Date(v.visit_date).toLocaleDateString()}</p>
            </div>
          </div>
          {v.diagnosis && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
          {v.notes && <p className="mt-1 text-sm text-slate-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Prescriptions ---------- */
function PrescriptionsPanel({ patientId, refreshKey }: { patientId: string; refreshKey: number }) {
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('prescribed_date', { ascending: false });
      if (!error) setItems((data as Prescription[]) ?? []);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={Pill} title="No prescriptions" subtitle="Your doctor will add prescriptions after consultations." />;
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{p.doctor_name ?? 'Doctor'}</p>
              <p className="text-xs text-slate-500">{p.hospital_name ?? 'Hospital'} · {new Date(p.prescribed_date).toLocaleDateString()}</p>
            </div>
            <ClipboardList className="w-4 h-4 text-slate-300" />
          </div>
          {Array.isArray(p.medications) && p.medications.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {p.medications.map((m, i) => (
                <li key={i} className="text-sm text-slate-600 flex flex-wrap gap-x-2">
                  <span className="font-medium text-slate-700">{m.name}</span>
                  <span className="text-slate-400">·</span>
                  <span>{m.dose}</span>
                  <span className="text-slate-400">·</span>
                  <span>{m.frequency}</span>
                  {m.duration && <><span className="text-slate-400">·</span><span>{m.duration}</span></>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Vitals ---------- */
function VitalsPanel({ patientId, refreshKey }: { patientId: string; refreshKey: number }) {
  const [items, setItems] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false });
      if (!error) setItems((data as Vital[]) ?? []);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={Activity} title="No vitals recorded" subtitle="Your doctor will record vitals during consultations." />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-2">{new Date(v.recorded_at).toLocaleString()}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <VitalStat label="BP" value={v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'} unit="mmHg" />
            <VitalStat label="Heart Rate" value={v.heart_rate ?? '—'} unit="bpm" />
            <VitalStat label="SpO₂" value={v.oxygen_saturation ?? '—'} unit="%" />
            <VitalStat label="Temp" value={v.temperature ?? '—'} unit="°C" />
            <VitalStat label="Weight" value={v.weight_kg ?? '—'} unit="kg" />
            <VitalStat label="Height" value={v.height_cm ?? '—'} unit="cm" />
          </div>
          {v.notes && <p className="mt-2 text-sm text-slate-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Labs ---------- */
function LabsPanel({ patientId, refreshKey }: { patientId: string; refreshKey: number }) {
  const [items, setItems] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from('lab_reports').select('*').eq('patient_id', patientId).order('report_date', { ascending: false });
      if (!error) setItems((data as LabReport[]) ?? []);
      setLoading(false);
    })();
  }, [patientId, refreshKey]);
  if (loading) return <CenterSpinner />;
  if (!items.length) return <EmptyState icon={FlaskConical} title="No lab reports" subtitle="Your doctor will order lab tests and upload results." />;
  const statusColor: Record<string, string> = {
    normal: 'bg-emerald-50 text-emerald-700',
    abnormal: 'bg-amber-50 text-amber-700',
    critical: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="space-y-3">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">{l.test_name}</p>
              <p className="text-xs text-slate-500">{l.lab_name ?? 'Lab'} · {new Date(l.report_date).toLocaleDateString()}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusColor[l.status] ?? statusColor.normal}`}>
              {l.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div><span className="text-slate-400">Result: </span><span className="font-medium text-slate-700">{l.result ?? '—'}</span></div>
            {l.normal_range && <div><span className="text-slate-400">Range: </span><span className="text-slate-600">{l.normal_range}</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modals ---------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm hp-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl hp-card-shadow w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ProfileEditModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: (p: Patient) => void }) {
  const [form, setForm] = useState({
    full_name: patient.full_name,
    date_of_birth: patient.date_of_birth ?? '',
    blood_group: patient.blood_group ?? '',
    nid: patient.nid ?? '',
    phone: patient.phone ?? '',
    address: patient.address ?? '',
    emergency_contact_name: patient.emergency_contact_name ?? '',
    emergency_contact_phone: patient.emergency_contact_phone ?? '',
    allergies: patient.allergies.join(', '),
    chronic_conditions: patient.chronic_conditions.join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const update = {
      ...form,
      is_profile_completed: true,
      date_of_birth: form.date_of_birth || null,
      blood_group: form.blood_group || null,
      nid: form.nid || null,
      phone: form.phone || null,
      address: form.address || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const { data, error: err } = await supabase.from('patients').update(update).eq('id', patient.id).select().maybeSingle();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) onSaved(data as Patient);
    onClose();
  }

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
          <Select label="Blood group" value={form.blood_group} onChange={(v) => setForm({ ...form, blood_group: v })}
            options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
          <Input label="NID" value={form.nid} onChange={(v) => setForm({ ...form, nid: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Emergency contact name" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
          <Input label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
        </div>
        <Input label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Input label="Allergies (comma separated)" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} />
        <Input label="Chronic conditions (comma separated)" value={form.chronic_conditions} onChange={(v) => setForm({ ...form, chronic_conditions: v })} />
        {error && <ErrorMsg msg={error} />}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- small helpers ---------- */
function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  );
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 bg-white">
        {options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </label>
  );
}
function SaveRow({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </div>
  );
}
function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2.5">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{msg}</span>
    </div>
  );
}
function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof Activity; title: string; subtitle: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
function CenterSpinner() {
  return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-sky-600 animate-spin" /></div>;
}

/* ---------- download card as PDF via jsPDF ---------- */
function downloadCard(patient: Patient) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85, 54] });
  const scanUrl = `${window.location.origin}/#/card/${patient.health_card_id}`;

  // Background gradient (simulated with layered rects)
  doc.setFillColor(12, 74, 110);
  doc.roundedRect(0, 0, 85, 54, 3, 3, 'F');
  doc.setFillColor(3, 105, 161);
  doc.roundedRect(0, 27, 85, 27, 0, 3, 'F');

  // Header
  doc.setTextColor(125, 211, 252);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('HEALTHPASS BD', 5, 5);

  // Blood group badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(68, 3, 13, 5, 1, 1, 'F');
  doc.setTextColor(12, 74, 110);
  doc.setFontSize(7);
  doc.text(patient.blood_group ?? 'N/A', 74.5, 6.2, { align: 'center' });

  // Patient name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(patient.full_name.slice(0, 24), 5, 13);

  // Details
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253);
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  const detailLine = [age !== null ? `${age} yrs` : '', patient.phone ?? ''].filter(Boolean).join('   ');
  doc.text(detailLine, 5, 18);
  doc.setFontSize(6);
  doc.setFont('courier', 'normal');
  doc.text(patient.health_card_id, 5, 23);

  // Emergency contact
  if (patient.emergency_contact_name || patient.emergency_contact_phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(125, 211, 252);
    doc.text('Emergency:', 5, 30);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    const ec = [patient.emergency_contact_name, patient.emergency_contact_phone].filter(Boolean).join(' ');
    doc.text(ec.slice(0, 40), 5, 33);
  }

  // QR code: generate to a temp container, extract data URL, embed
  const qrDiv = document.createElement('div');
  qrDiv.style.position = 'absolute';
  qrDiv.style.left = '-9999px';
  document.body.appendChild(qrDiv);
  const qrRoot = createRoot(qrDiv);
  qrRoot.render(<QRCodeSVG value={scanUrl} size={120} level="M" bgColor="#ffffff" fgColor="#0c4a6e" includeMargin={false} />);

  setTimeout(() => {
    const svgEl = qrDiv.querySelector('svg');
    if (svgEl) {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = reader.result as string;
        try {
          doc.addImage(dataUrl, 'PNG', 60, 28, 20, 20);
        } catch {
          // fallback: if PNG embedding fails, try JPEG
          try { doc.addImage(dataUrl, 'JPEG', 60, 28, 20, 20); } catch { /* skip QR */ }
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(125, 211, 252);
        doc.text('Scan for medical history', 5, 50);
        doc.save(`healthcard-${patient.health_card_id}.pdf`);
        document.body.removeChild(qrDiv);
      };
      reader.readAsDataURL(svgBlob);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(125, 211, 252);
      doc.text('Scan for medical history', 5, 50);
      doc.save(`healthcard-${patient.health_card_id}.pdf`);
      document.body.removeChild(qrDiv);
    }
  }, 100);
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
