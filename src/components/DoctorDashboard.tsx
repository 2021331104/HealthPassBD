import { useState, useEffect, FormEvent, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Doctor, Patient, MedicalVisit, Prescription, Vital, LabReport, Appointment } from '../types';
import { RecordTab, PatientBanner } from './PatientRecord';
import {
  HeartPulse, LogOut, Search, Loader2, Stethoscope, User as UserIcon,
  Building2, FileText, X, AlertCircle, Fingerprint, ShieldCheck,
  CalendarClock, Hash, Plus, ClipboardList, Pill, FlaskConical, Activity,
  UserCheck, CheckCircle2, Phone, ChevronRight, Calendar,
} from 'lucide-react';

export default function DoctorDashboard({ onSignOut, userId }: { onSignOut: () => void; userId: string }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [view, setView] = useState<'queue' | 'lookup'>('queue');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('doctors').select('*').eq('user_id', userId).maybeSingle();
      if (!data) setShowEdit(true);
      setDoctor(data as Doctor | null);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <FullScreenSpinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onSignOut={onSignOut} subtitle={doctor ? `${doctor.specialty ?? 'Doctor'} · ${doctor.hospital_name ?? ''}` : 'Doctor'} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 hp-fade-in">
        {doctor && <DoctorInfoCard doctor={doctor} onEdit={() => setShowEdit(true)} />}

        <div className="bg-white rounded-2xl hp-soft-shadow p-1.5 flex gap-1 mb-5">
          <button onClick={() => setView('queue')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${view === 'queue' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <CalendarClock className="w-4 h-4" /> Today's Queue
          </button>
          <button onClick={() => setView('lookup')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${view === 'lookup' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Search className="w-4 h-4" /> Patient Lookup
          </button>
        </div>

        {view === 'queue' && doctor && <QueuePanel doctorId={doctor.id} />}
        {view === 'lookup' && <PatientLookup />}
      </main>
      {showEdit && (
        <DoctorEditModal userId={userId} doctor={doctor} onClose={() => setShowEdit(false)} onSaved={(d) => { setDoctor(d); setShowEdit(false); }} />
      )}
    </div>
  );
}

function Header({ onSignOut, subtitle }: { onSignOut: () => void; subtitle: string }) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg hp-gradient flex items-center justify-center">
            <Stethoscope className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <span className="font-bold text-slate-800 tracking-tight block leading-none">HealthPass BD</span>
            <span className="text-[11px] text-slate-400">{subtitle}</span>
          </div>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors">
          <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}

function DoctorInfoCard({ doctor, onEdit }: { doctor: Doctor; onEdit: () => void }) {
  return (
    <div className="bg-white rounded-2xl hp-soft-shadow p-5 mb-5 hp-rise">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Stethoscope className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{doctor.designation ?? 'Doctor'}</p>
            <p className="text-sm text-slate-500">{doctor.specialty ?? 'Specialty'} · {doctor.hospital_name ?? 'Hospital'}</p>
            {doctor.registration_no && <p className="text-xs text-slate-400 mt-0.5">Reg. No: {doctor.registration_no}</p>}
          </div>
        </div>
        <button onClick={onEdit} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
      </div>
    </div>
  );
}

/* ========== TODAY'S QUEUE ========== */
function QueuePanel({ doctorId }: { doctorId: string }) {
  const [appts, setAppts] = useState<(Appointment & { patient?: Patient })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAppt, setActiveAppt] = useState<(Appointment & { patient?: Patient }) | null>(null);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).eq('appointment_date', today).order('serial_number', { ascending: true });
    const apptList = (data as Appointment[]) ?? [];
    let withPats: (Appointment & { patient?: Patient })[] = apptList;
    if (apptList.length) {
      const ids = [...new Set(apptList.map((a) => a.patient_id))];
      const { data: pts } = await supabase.from('patients').select('*').in('id', ids);
      const map = new Map((pts as Patient[] | null ?? []).map((p) => [p.id, p]));
      withPats = apptList.map((a) => ({ ...a, patient: map.get(a.patient_id) }));
    }
    setAppts(withPats);
    setLoading(false);
  }, [doctorId, today]);

  useEffect(() => {
    load();
    // realtime subscription for live queue updates
    const channel = supabase.channel('appointments-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, doctorId]);

  async function updateStatus(id: string, status: Appointment['status']) {
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppts((rs) => rs.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-sky-600 animate-spin" /></div>;

  const pending = appts.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const inConsult = appts.find((a) => a.status === 'in_consultation');
  const done = appts.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  return (
    <div className="space-y-5">
      {appts.length === 0 ? (
        <div className="bg-white rounded-2xl hp-soft-shadow p-8 text-center hp-rise">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <CalendarClock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No appointments today</p>
          <p className="text-sm text-slate-400 mt-0.5">Patients who book with you will appear here in serial order.</p>
        </div>
      ) : (
        <>
          {inConsult && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-violet-600" />
                <h3 className="font-semibold text-sm text-violet-800">In consultation now</h3>
              </div>
              <QueueCard appt={inConsult} onAction={updateStatus} onPrescribe={() => { setActiveAppt(inConsult); setShowPrescribe(true); }} />
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Waiting queue ({pending.length})</h3>
            <div className="space-y-2">
              {pending.map((a) => (
                <QueueCard key={a.id} appt={a} onAction={updateStatus} onPrescribe={() => { setActiveAppt(a); setShowPrescribe(true); }} />
              ))}
              {pending.length === 0 && <p className="text-sm text-slate-400 py-2">No patients waiting.</p>}
            </div>
          </div>

          {done.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-500 text-sm mb-3">Completed / Cancelled</h3>
              <div className="space-y-2">
                {done.map((a) => (
                  <QueueCard key={a.id} appt={a} onAction={updateStatus} onPrescribe={() => { setActiveAppt(a); setShowPrescribe(true); }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showPrescribe && activeAppt && activeAppt.patient && (
        <PrescriptionBuilderModal
          patient={activeAppt.patient}
          doctorId={doctorId}
          onClose={() => setShowPrescribe(false)}
        />
      )}
    </div>
  );
}

function QueueCard({ appt, onAction, onPrescribe }: { appt: Appointment & { patient?: Patient }; onAction: (id: string, s: Appointment['status']) => void; onPrescribe: () => void }) {
  const sc: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-sky-50 text-sky-700',
    in_consultation: 'bg-violet-50 text-violet-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex flex-col items-center justify-center shrink-0">
        <span className="text-[9px] font-medium">SERIAL</span>
        <span className="text-base font-bold leading-none">#{String(appt.serial_number).padStart(2, '0')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 truncate">{appt.patient?.full_name ?? 'Patient'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
          <span>{appt.time_slot}</span>
          {appt.patient?.blood_group && <span className="font-medium text-rose-600">{appt.patient.blood_group}</span>}
          {appt.patient?.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{appt.patient.phone}</span>}
        </div>
        {appt.chief_complaint && <p className="text-xs text-slate-400 mt-0.5 italic truncate">"{appt.chief_complaint}"</p>}
      </div>
      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${sc[appt.status] ?? sc.pending}`}>{appt.status.replace('_', ' ')}</span>
      <div className="flex gap-1.5 shrink-0">
        {appt.status === 'pending' && (
          <button onClick={() => onAction(appt.id, 'in_consultation')} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Call
          </button>
        )}
        {appt.status === 'in_consultation' && (
          <>
            <button onClick={onPrescribe} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" /> Prescribe
            </button>
            <button onClick={() => onAction(appt.id, 'completed')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </button>
          </>
        )}
        {appt.status === 'completed' && (
          <button onClick={onPrescribe} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5" /> View
          </button>
        )}
      </div>
    </div>
  );
}

/* ========== PATIENT LOOKUP ========== */
function PatientLookup() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<MedicalVisit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [labs, setLabs] = useState<LabReport[]>([]);
  const [tab, setTab] = useState<RecordTab>('visits');
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<RecordTab | null>(null);
  const [editVisit, setEditVisit] = useState<MedicalVisit | null>(null);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);
  const [editVital, setEditVital] = useState<Vital | null>(null);
  const [editLab, setEditLab] = useState<LabReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Load doctor id once
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doc } = await supabase.from('doctors').select('id').eq('user_id', user.id).maybeSingle();
      if (doc) setDoctorId(doc.id);
    })();
  }, []);

  async function loadRecords(patientId: string) {
    const [v, pr, vi, l] = await Promise.all([
      supabase.from('medical_visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false }),
      supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('prescribed_date', { ascending: false }),
      supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }),
      supabase.from('lab_reports').select('*').eq('patient_id', patientId).order('report_date', { ascending: false }),
    ]);
    setVisits((v.data as MedicalVisit[]) ?? []);
    setPrescriptions((pr.data as Prescription[]) ?? []);
    setVitals((vi.data as Vital[]) ?? []);
    setLabs((l.data as LabReport[]) ?? []);
  }

  // Re-fetch records when refreshKey changes
  useEffect(() => {
    if (patient) loadRecords(patient.id);
  }, [patient, refreshKey]);

  async function doSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(null); setPatient(null);
    const { data: p, error: pErr } = await supabase.from('patients').select('*').eq('health_card_id', query.trim()).maybeSingle();
    if (pErr) { setError('Search failed: ' + pErr.message); setSearching(false); return; }
    if (!p) {
      setError('No patient found with that health card ID.');
      setSearching(false);
      return;
    }
    const pt = p as Patient;
    setPatient(pt);
    await loadRecords(pt.id);
    setSearching(false);
  }

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
    setShowAdd(null);
    setEditVisit(null);
    setEditPrescription(null);
    setEditVital(null);
    setEditLab(null);
  };

  return (
    <>
      <div className="bg-white rounded-2xl hp-soft-shadow p-5 mb-5 hp-rise">
        <h2 className="font-bold text-slate-800 mb-1">Look up a patient</h2>
        <p className="text-sm text-slate-500 mb-4">Enter the health card ID (e.g. HP-AB12CD34) from the patient's QR card.</p>
        <form onSubmit={doSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="HP-XXXXXXXX" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 uppercase" />
          </div>
          <button type="submit" disabled={searching} className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm disabled:opacity-60 flex items-center gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </form>
        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
      </div>

      {patient && (
        <div className="hp-fade-in">
          <div className="flex items-center gap-2 mb-4 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg w-fit">
            <ShieldCheck className="w-4 h-4" /> Verified · <Fingerprint className="w-3.5 h-3.5 inline" /> <span className="font-mono">{patient.health_card_id}</span>
          </div>
          <PatientBanner patient={patient} />

          {/* Tab bar with Add button for doctor */}
          <div className="bg-white rounded-2xl hp-soft-shadow p-1.5 flex gap-1 mb-5">
            {([
              { k: 'visits' as const, label: 'Visits', icon: Stethoscope, count: visits.length },
              { k: 'prescriptions' as const, label: 'Prescriptions', icon: Pill, count: prescriptions.length },
              { k: 'vitals' as const, label: 'Vitals', icon: Activity, count: vitals.length },
              { k: 'labs' as const, label: 'Labs', icon: FlaskConical, count: labs.length },
            ]).map(({ k, label, icon: Icon, count }) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === k ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="text-xs text-slate-400">{count}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl hp-soft-shadow p-5 sm:p-6">
            {/* Add button for doctor */}
            {doctorId && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAdd(tab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add {tab === 'visits' ? 'visit' : tab === 'prescriptions' ? 'prescription' : tab === 'vitals' ? 'vitals' : 'lab report'}
                </button>
              </div>
            )}

            {tab === 'visits' && <VisitsListDoctor items={visits} onEdit={setEditVisit} />}
            {tab === 'prescriptions' && <PrescriptionsListDoctor items={prescriptions} onEdit={setEditPrescription} />}
            {tab === 'vitals' && <VitalsListDoctor items={vitals} onEdit={setEditVital} />}
            {tab === 'labs' && <LabsListDoctor items={labs} onEdit={setEditLab} />}
          </div>
        </div>
      )}

      {/* Doctor add modals */}
      {showAdd === 'visits' && patient && doctorId && (
        <AddVisitModalDoctor patientId={patient.id} doctorId={doctorId} onClose={handleSaved} />
      )}
      {showAdd === 'prescriptions' && patient && doctorId && (
        <AddPrescriptionModalDoctor patientId={patient.id} doctorId={doctorId} onClose={handleSaved} />
      )}
      {showAdd === 'vitals' && patient && doctorId && (
        <AddVitalsModalDoctor patientId={patient.id} doctorId={doctorId} onClose={handleSaved} />
      )}
      {showAdd === 'labs' && patient && doctorId && (
        <AddLabModalDoctor patientId={patient.id} doctorId={doctorId} onClose={handleSaved} />
      )}
      {/* Doctor edit modals */}
      {editVisit && patient && doctorId && (
        <AddVisitModalDoctor patientId={patient.id} doctorId={doctorId} existing={editVisit} onClose={handleSaved} />
      )}
      {editPrescription && patient && doctorId && (
        <AddPrescriptionModalDoctor patientId={patient.id} doctorId={doctorId} existing={editPrescription} onClose={handleSaved} />
      )}
      {editVital && patient && doctorId && (
        <AddVitalsModalDoctor patientId={patient.id} doctorId={doctorId} existing={editVital} onClose={handleSaved} />
      )}
      {editLab && patient && doctorId && (
        <AddLabModalDoctor patientId={patient.id} doctorId={doctorId} existing={editLab} onClose={handleSaved} />
      )}
    </>
  );
}

/* ========== DOCTOR: RECORD LISTS WITH EDIT ========== */
function VisitsListDoctor({ items, onEdit }: { items: MedicalVisit[]; onEdit: (v: MedicalVisit) => void }) {
  if (!items.length) return <EmptyRecord icon={Stethoscope} label="No visits recorded" />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{v.hospital_name ?? 'Hospital'}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(v.visit_date).toLocaleDateString()}</span>
              <button onClick={() => onEdit(v)} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{v.doctor_name ?? 'Doctor'}</p>
          {v.chief_complaints && <p className="mt-1.5 text-sm text-slate-600"><span className="font-medium">Complaints:</span> {v.chief_complaints}</p>}
          {v.diagnosis && <p className="mt-1 text-sm text-slate-600"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
          {v.notes && <p className="mt-1 text-sm text-slate-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsListDoctor({ items, onEdit }: { items: Prescription[]; onEdit: (p: Prescription) => void }) {
  if (!items.length) return <EmptyRecord icon={Pill} label="No prescriptions recorded" />;
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{p.doctor_name ?? 'Doctor'}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{new Date(p.prescribed_date).toLocaleDateString()}</span>
              <button onClick={() => onEdit(p)} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{p.hospital_name ?? 'Hospital'}</p>
          {p.chief_complaints && <p className="mt-1 text-sm text-slate-500 italic">{p.chief_complaints}</p>}
          {Array.isArray(p.medications) && p.medications.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {p.medications.map((m, i) => (
                <li key={i} className="text-sm text-slate-600 flex flex-wrap gap-x-2">
                  <span className="font-medium text-slate-700">{m.name}</span>
                  <span className="text-slate-400">·</span><span>{m.dose}</span>
                  <span className="text-slate-400">·</span><span>{m.frequency}</span>
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

function VitalsListDoctor({ items, onEdit }: { items: Vital[]; onEdit: (v: Vital) => void }) {
  if (!items.length) return <EmptyRecord icon={Activity} label="No vitals recorded" />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">{new Date(v.recorded_at).toLocaleString()}</p>
            <button onClick={() => onEdit(v)} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="BP" value={v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'} unit="mmHg" />
            <Stat label="Heart Rate" value={v.heart_rate ?? '—'} unit="bpm" />
            <Stat label="SpO₂" value={v.oxygen_saturation ?? '—'} unit="%" />
            <Stat label="Temp" value={v.temperature ?? '—'} unit="°C" />
            <Stat label="Weight" value={v.weight_kg ?? '—'} unit="kg" />
            <Stat label="Height" value={v.height_cm ?? '—'} unit="cm" />
          </div>
          {v.notes && <p className="mt-2 text-sm text-slate-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function LabsListDoctor({ items, onEdit }: { items: LabReport[]; onEdit: (l: LabReport) => void }) {
  if (!items.length) return <EmptyRecord icon={FlaskConical} label="No lab reports recorded" />;
  const sc: Record<string, string> = { normal: 'bg-emerald-50 text-emerald-700', abnormal: 'bg-amber-50 text-amber-700', critical: 'bg-rose-50 text-rose-700', ordered: 'bg-sky-50 text-sky-700' };
  return (
    <div className="space-y-3">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{l.test_name}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${sc[l.status] ?? sc.normal}`}>{l.status}</span>
              <button onClick={() => onEdit(l)} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{l.lab_name ?? 'Lab'} · {new Date(l.report_date).toLocaleDateString()}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div><span className="text-slate-400">Result: </span><span className="font-medium text-slate-700">{l.result ?? '—'}</span></div>
            {l.normal_range && <div><span className="text-slate-400">Range: </span><span className="text-slate-600">{l.normal_range}</span></div>}
          </div>
          {l.file_url && (
            <a href={l.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium">
              <FileText className="w-3.5 h-3.5" /> View uploaded file
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyRecord({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value} <span className="text-xs font-normal text-slate-400">{unit}</span></p>
    </div>
  );
}

/* ========== DOCTOR: ADD/EDIT MODALS ========== */
function AddVisitModalDoctor({ patientId, doctorId, existing, onClose }: { patientId: string; doctorId: string; existing?: MedicalVisit; onClose: () => void }) {
  const [form, setForm] = useState({
    visit_date: existing?.visit_date ?? new Date().toISOString().slice(0, 10),
    hospital_name: existing?.hospital_name ?? '',
    doctor_name: existing?.doctor_name ?? '',
    diagnosis: existing?.diagnosis ?? '',
    chief_complaints: existing?.chief_complaints ?? '',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const payload = {
      patient_id: patientId, doctor_id: doctorId,
      visit_date: form.visit_date,
      hospital_name: form.hospital_name || null,
      doctor_name: form.doctor_name || null,
      diagnosis: form.diagnosis || null,
      chief_complaints: form.chief_complaints || null,
      notes: form.notes || null,
    };
    let err;
    if (existing) {
      const r = await supabase.from('medical_visits').update(payload).eq('id', existing.id);
      err = r.error;
    } else {
      const r = await supabase.from('medical_visits').insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit visit' : 'Add visit'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <DocInput label="Visit date" type="date" value={form.visit_date} onChange={(v) => setForm({ ...form, visit_date: v })} />
          <DocInput label="Hospital" value={form.hospital_name} onChange={(v) => setForm({ ...form, hospital_name: v })} />
        </div>
        <DocInput label="Doctor" value={form.doctor_name} onChange={(v) => setForm({ ...form, doctor_name: v })} />
        <DocInput label="Chief complaints" value={form.chief_complaints} onChange={(v) => setForm({ ...form, chief_complaints: v })} placeholder="e.g. Fever for 3 days" />
        <DocInput label="Diagnosis" value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} />
        <DocTextarea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        {error && <ErrorMsg msg={error} />}
        <DocSaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

function AddPrescriptionModalDoctor({ patientId, doctorId, existing, onClose }: { patientId: string; doctorId: string; existing?: Prescription; onClose: () => void }) {
  const [form, setForm] = useState({
    prescribed_date: existing?.prescribed_date ?? new Date().toISOString().slice(0, 10),
    doctor_name: existing?.doctor_name ?? '',
    hospital_name: existing?.hospital_name ?? '',
    chief_complaints: existing?.chief_complaints ?? '',
  });
  const [meds, setMeds] = useState(
    Array.isArray(existing?.medications) && existing!.medications.length > 0
      ? existing!.medications
      : [{ name: '', dose: '', frequency: '', duration: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const medications = meds.filter((m) => m.name.trim());
    const payload = {
      patient_id: patientId, doctor_id: doctorId,
      prescribed_date: form.prescribed_date,
      doctor_name: form.doctor_name || null,
      hospital_name: form.hospital_name || null,
      chief_complaints: form.chief_complaints || null,
      medications,
    };
    let err;
    if (existing) {
      const r = await supabase.from('prescriptions').update(payload).eq('id', existing.id);
      err = r.error;
    } else {
      const r = await supabase.from('prescriptions').insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit prescription' : 'Add prescription'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <DocInput label="Date" type="date" value={form.prescribed_date} onChange={(v) => setForm({ ...form, prescribed_date: v })} />
          <DocInput label="Doctor" value={form.doctor_name} onChange={(v) => setForm({ ...form, doctor_name: v })} />
        </div>
        <DocInput label="Hospital" value={form.hospital_name} onChange={(v) => setForm({ ...form, hospital_name: v })} />
        <DocInput label="Chief complaints" value={form.chief_complaints} onChange={(v) => setForm({ ...form, chief_complaints: v })} />
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">Medications</p>
          <div className="space-y-2">
            {meds.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50">
                <DocInput label="Name" value={m.name} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, name: v } : x))} />
                <DocInput label="Dose" value={m.dose} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, dose: v } : x))} />
                <DocInput label="Frequency" value={m.frequency} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, frequency: v } : x))} />
                <DocInput label="Duration" value={m.duration} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, duration: v } : x))} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={() => setMeds([...meds, { name: '', dose: '', frequency: '', duration: '' }])}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add medication
            </button>
            {meds.length > 1 && (
              <button type="button" onClick={() => setMeds(meds.slice(0, -1))}
                className="text-xs font-medium text-slate-500 hover:text-rose-500 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Remove last
              </button>
            )}
          </div>
        </div>
        {error && <ErrorMsg msg={error} />}
        <DocSaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

function AddVitalsModalDoctor({ patientId, doctorId, existing, onClose }: { patientId: string; doctorId: string; existing?: Vital; onClose: () => void }) {
  const [form, setForm] = useState({
    blood_pressure_systolic: existing?.blood_pressure_systolic?.toString() ?? '',
    blood_pressure_diastolic: existing?.blood_pressure_diastolic?.toString() ?? '',
    heart_rate: existing?.heart_rate?.toString() ?? '',
    temperature: existing?.temperature?.toString() ?? '',
    weight_kg: existing?.weight_kg?.toString() ?? '',
    height_cm: existing?.height_cm?.toString() ?? '',
    oxygen_saturation: existing?.oxygen_saturation?.toString() ?? '',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const num = (v: string) => v === '' ? null : Number(v);
    const payload = {
      patient_id: patientId, doctor_id: doctorId,
      blood_pressure_systolic: num(form.blood_pressure_systolic),
      blood_pressure_diastolic: num(form.blood_pressure_diastolic),
      heart_rate: num(form.heart_rate),
      temperature: num(form.temperature),
      weight_kg: num(form.weight_kg),
      height_cm: num(form.height_cm),
      oxygen_saturation: num(form.oxygen_saturation),
      notes: form.notes || null,
    };
    let err;
    if (existing) {
      const r = await supabase.from('vitals').update(payload).eq('id', existing.id);
      err = r.error;
    } else {
      const r = await supabase.from('vitals').insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit vitals' : 'Add vitals'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <DocInput label="BP systolic" type="number" value={form.blood_pressure_systolic} onChange={(v) => setForm({ ...form, blood_pressure_systolic: v })} />
          <DocInput label="BP diastolic" type="number" value={form.blood_pressure_diastolic} onChange={(v) => setForm({ ...form, blood_pressure_diastolic: v })} />
          <DocInput label="Heart rate" type="number" value={form.heart_rate} onChange={(v) => setForm({ ...form, heart_rate: v })} />
          <DocInput label="Temp (°C)" type="number" value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} />
          <DocInput label="Weight (kg)" type="number" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} />
          <DocInput label="Height (cm)" type="number" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} />
          <DocInput label="SpO₂ (%)" type="number" value={form.oxygen_saturation} onChange={(v) => setForm({ ...form, oxygen_saturation: v })} />
        </div>
        <DocTextarea label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        {error && <ErrorMsg msg={error} />}
        <DocSaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

function AddLabModalDoctor({ patientId, doctorId, existing, onClose }: { patientId: string; doctorId: string; existing?: LabReport; onClose: () => void }) {
  const [form, setForm] = useState({
    report_date: existing?.report_date ?? new Date().toISOString().slice(0, 10),
    test_name: existing?.test_name ?? '',
    result: existing?.result ?? '',
    normal_range: existing?.normal_range ?? '',
    status: existing?.status ?? 'normal',
    lab_name: existing?.lab_name ?? '',
  });
  const [fileUrl, setFileUrl] = useState(existing?.file_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true); setError(null);
    const ext = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('lab-files').upload(fileName, file);
    setUploading(false);
    if (upErr) { setError('Upload failed: ' + upErr.message); return; }
    const { data: pubData } = supabase.storage.from('lab-files').getPublicUrl(fileName);
    setFileUrl(pubData.publicUrl);
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const payload = {
      patient_id: patientId, doctor_id: doctorId,
      report_date: form.report_date,
      test_name: form.test_name,
      result: form.result || null,
      normal_range: form.normal_range || null,
      status: form.status,
      lab_name: form.lab_name || null,
      file_url: fileUrl || null,
    };
    let err;
    if (existing) {
      const r = await supabase.from('lab_reports').update(payload).eq('id', existing.id);
      err = r.error;
    } else {
      const r = await supabase.from('lab_reports').insert(payload);
      err = r.error;
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <Modal title={existing ? 'Edit lab report' : 'Add lab report'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <DocInput label="Report date" type="date" value={form.report_date} onChange={(v) => setForm({ ...form, report_date: v })} />
          <DocInput label="Test name" value={form.test_name} onChange={(v) => setForm({ ...form, test_name: v })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <DocInput label="Result" value={form.result} onChange={(v) => setForm({ ...form, result: v })} />
          <DocInput label="Normal range" value={form.normal_range} onChange={(v) => setForm({ ...form, normal_range: v })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
              <option value="normal">Normal</option>
              <option value="abnormal">Abnormal</option>
              <option value="critical">Critical</option>
              <option value="ordered">Ordered</option>
            </select>
          </label>
          <DocInput label="Lab name" value={form.lab_name} onChange={(v) => setForm({ ...form, lab_name: v })} />
        </div>
        {/* File upload */}
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1">Lab document (optional)</span>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
            className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" />
          {uploading && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>}
          {fileUrl && !uploading && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> File uploaded</p>}
        </div>
        {error && <ErrorMsg msg={error} />}
        <DocSaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

/* ========== DOCTOR UI HELPERS ========== */
function DocInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  );
}
function DocTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  );
}
function DocSaveRow({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </div>
  );
}

/* ========== PRESCRIPTION BUILDER MODAL ========== */
function PrescriptionBuilderModal({ patient, doctorId, onClose }: { patient: Patient; doctorId: string; onClose: () => void }) {
  const [section, setSection] = useState<'vitals' | 'prescription' | 'labs'>('vitals');
  const [vitals, setVitals] = useState({ bp_sys: '', bp_dia: '', heart_rate: '', temp: '', spo2: '', weight: '', height: '', notes: '' });
  const [rx, setRx] = useState({ chief_complaints: '', diagnosis: '', notes: '' });
  const [meds, setMeds] = useState([{ name: '', dose: '', frequency: '', duration: '' }]);
  const [labTests, setLabTests] = useState([{ name: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const num = (v: string) => v === '' ? null : Number(v);

  async function save() {
    setSaving(true); setError(null);
    try {
      // 1. Save vitals (if any filled)
      const hasVitals = vitals.bp_sys || vitals.heart_rate || vitals.temp || vitals.spo2 || vitals.weight || vitals.height;
      if (hasVitals) {
        const { error: ve } = await supabase.from('vitals').insert({
          patient_id: patient.id, doctor_id: doctorId,
          blood_pressure_systolic: num(vitals.bp_sys), blood_pressure_diastolic: num(vitals.bp_dia),
          heart_rate: num(vitals.heart_rate), temperature: num(vitals.temp),
          oxygen_saturation: num(vitals.spo2), weight_kg: num(vitals.weight), height_cm: num(vitals.height),
          notes: vitals.notes || null,
        });
        if (ve) throw ve;
      }
      // 2. Save prescription + visit
      const validMeds = meds.filter((m) => m.name.trim());
      if (rx.diagnosis || validMeds.length || rx.chief_complaints) {
        const { data: visitData, error: ve2 } = await supabase.from('medical_visits').insert({
          patient_id: patient.id, doctor_id: doctorId,
          visit_date: new Date().toISOString().slice(0, 10),
          diagnosis: rx.diagnosis || null,
          chief_complaints: rx.chief_complaints || null,
          notes: rx.notes || null,
        }).select().maybeSingle();
        if (ve2) throw ve2;
        const visit = visitData as MedicalVisit | null;
        const { error: pe } = await supabase.from('prescriptions').insert({
          patient_id: patient.id, doctor_id: doctorId,
          visit_id: visit?.id ?? null,
          prescribed_date: new Date().toISOString().slice(0, 10),
          medications: validMeds,
          chief_complaints: rx.chief_complaints || null,
        });
        if (pe) throw pe;
      }
      // 3. Push lab referrals
      const validLabs = labTests.filter((l) => l.name.trim());
      if (validLabs.length) {
        const { error: le } = await supabase.from('lab_reports').insert(
          validLabs.map((l) => ({
            patient_id: patient.id, doctor_id: doctorId,
            test_name: l.name.trim(), status: 'ordered',
            report_date: new Date().toISOString().slice(0, 10),
          }))
        );
        if (le) throw le;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Modal title="Clinical record saved" onClose={onClose}>
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="font-semibold text-slate-800">Record saved to {patient.full_name}'s history</p>
          <p className="text-sm text-slate-500 mt-1">Vitals, prescription, and lab referrals have been pushed.</p>
          <button onClick={onClose} className="mt-5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm">Done</button>
        </div>
      </Modal>
    );
  }

  const sections = [
    { k: 'vitals' as const, label: 'Vitals', icon: Activity },
    { k: 'prescription' as const, label: 'Prescription', icon: Pill },
    { k: 'labs' as const, label: 'Lab Tests', icon: FlaskConical },
  ];

  return (
    <Modal title={`Clinical record — ${patient.full_name}`} onClose={onClose}>
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
        {sections.map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setSection(k)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${section === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
            <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {section === 'vitals' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="BP Systolic" value={vitals.bp_sys} onChange={(v) => setVitals({ ...vitals, bp_sys: v })} />
            <NumInput label="BP Diastolic" value={vitals.bp_dia} onChange={(v) => setVitals({ ...vitals, bp_dia: v })} />
            <NumInput label="Heart Rate" value={vitals.heart_rate} onChange={(v) => setVitals({ ...vitals, heart_rate: v })} />
            <NumInput label="Temp (°C)" value={vitals.temp} onChange={(v) => setVitals({ ...vitals, temp: v })} />
            <NumInput label="SpO₂ (%)" value={vitals.spo2} onChange={(v) => setVitals({ ...vitals, spo2: v })} />
            <NumInput label="Weight (kg)" value={vitals.weight} onChange={(v) => setVitals({ ...vitals, weight: v })} />
            <NumInput label="Height (cm)" value={vitals.height} onChange={(v) => setVitals({ ...vitals, height: v })} />
          </div>
          <TextInput label="Notes" value={vitals.notes} onChange={(v) => setVitals({ ...vitals, notes: v })} />
        </div>
      )}

      {section === 'prescription' && (
        <div className="space-y-3">
          <TextInput label="Chief complaints" value={rx.chief_complaints} onChange={(v) => setRx({ ...rx, chief_complaints: v })} placeholder="e.g. Fever for 3 days, headache" />
          <TextInput label="Diagnosis" value={rx.diagnosis} onChange={(v) => setRx({ ...rx, diagnosis: v })} />
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1.5">Medications</p>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50">
                  <TextInput label="Name" value={m.name} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, name: v } : x))} />
                  <TextInput label="Dose" value={m.dose} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, dose: v } : x))} />
                  <TextInput label="Frequency" value={m.frequency} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, frequency: v } : x))} />
                  <TextInput label="Duration" value={m.duration} onChange={(v) => setMeds(meds.map((x, j) => j === i ? { ...x, duration: v } : x))} />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setMeds([...meds, { name: '', dose: '', frequency: '', duration: '' }])} className="mt-2 text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add medication
            </button>
          </div>
          <TextInput label="Notes" value={rx.notes} onChange={(v) => setRx({ ...rx, notes: v })} />
        </div>
      )}

      {section === 'labs' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Order lab tests — they will be pushed directly to the patient's record with status "ordered".</p>
          <div className="space-y-2">
            {labTests.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.name} onChange={(e) => setLabTests(labTests.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. Complete Blood Count (CBC)" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
                {labTests.length > 1 && (
                  <button type="button" onClick={() => setLabTests(labTests.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 px-2"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLabTests([...labTests, { name: '' }])} className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add lab test
          </button>
        </div>
      )}

      {error && <ErrorMsg msg={error} />}
      <div className="flex gap-2 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save to patient record
        </button>
      </div>
    </Modal>
  );
}

/* ========== DOCTOR EDIT MODAL ========== */
function DoctorEditModal({ userId, doctor, onClose, onSaved }: { userId: string; doctor: Doctor | null; onClose: () => void; onSaved: (d: Doctor) => void }) {
  const [form, setForm] = useState({
    registration_no: doctor?.registration_no ?? '',
    specialty: doctor?.specialty ?? '',
    hospital_name: doctor?.hospital_name ?? '',
    designation: doctor?.designation ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    const payload = { ...form, user_id: userId, registration_no: form.registration_no || null, specialty: form.specialty || null, hospital_name: form.hospital_name || null, designation: form.designation || null };
    let data: Doctor | null = null;
    if (doctor) {
      const { data: d, error: err } = await supabase.from('doctors').update(payload).eq('id', doctor.id).select().maybeSingle();
      if (err) { setError(err.message); setSaving(false); return; }
      data = d as Doctor;
    } else {
      const { data: d, error: err } = await supabase.from('doctors').insert(payload).select().maybeSingle();
      if (err) { setError(err.message); setSaving(false); return; }
      data = d as Doctor;
    }
    setSaving(false);
    if (data) onSaved(data);
  }

  return (
    <Modal title="Doctor profile" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Input icon={<FileText className="w-4 h-4" />} label="BM&DC Registration No." value={form.registration_no} onChange={(v) => setForm({ ...form, registration_no: v })} />
        <Input icon={<Stethoscope className="w-4 h-4" />} label="Specialty" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} placeholder="e.g. Cardiology" />
        <Input icon={<Building2 className="w-4 h-4" />} label="Hospital / Clinic" value={form.hospital_name} onChange={(v) => setForm({ ...form, hospital_name: v })} />
        <Input icon={<UserIcon className="w-4 h-4" />} label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} placeholder="e.g. Consultant" />
        {error && <ErrorMsg msg={error} />}
        <SaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

/* ========== shared UI ========== */
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
function Input({ icon, label, value, onChange, placeholder, type = 'text' }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
      </div>
    </label>
  );
}
function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  );
}
function NumInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
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
function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
    </div>
  );
}
