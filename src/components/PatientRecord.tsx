import { Patient, MedicalVisit, Prescription, Vital, LabReport } from '../types';
import {
  Stethoscope, Pill, Activity, FlaskConical, Calendar, ShieldAlert,
  HeartPulse,
} from 'lucide-react';

export type RecordTab = 'visits' | 'prescriptions' | 'vitals' | 'labs';

interface Props {
  visits: MedicalVisit[];
  prescriptions: Prescription[];
  vitals: Vital[];
  labs: LabReport[];
  tab: RecordTab;
  onTab: (t: RecordTab) => void;
}

export default function PatientRecord({ visits, prescriptions, vitals, labs, tab, onTab }: Props) {
  const tabs = [
    { k: 'visits' as const, label: 'Visits', icon: Stethoscope, count: visits.length },
    { k: 'prescriptions' as const, label: 'Prescriptions', icon: Pill, count: prescriptions.length },
    { k: 'vitals' as const, label: 'Vitals', icon: Activity, count: vitals.length },
    { k: 'labs' as const, label: 'Labs', icon: FlaskConical, count: labs.length },
  ];

  return (
    <>
      <div className="bg-white rounded-2xl hp-soft-shadow p-1.5 flex gap-1 mb-5">
        {tabs.map(({ k, label, icon: Icon, count }) => (
          <button key={k} onClick={() => onTab(k)}
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
        {tab === 'visits' && <VisitsList items={visits} />}
        {tab === 'prescriptions' && <PrescriptionsList items={prescriptions} />}
        {tab === 'vitals' && <VitalsList items={vitals} />}
        {tab === 'labs' && <LabsList items={labs} />}
      </div>
    </>
  );
}

function VisitsList({ items }: { items: MedicalVisit[] }) {
  if (!items.length) return <Empty icon={Stethoscope} label="No visits recorded" />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{v.hospital_name ?? 'Hospital'}</p>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(v.visit_date).toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{v.doctor_name ?? 'Doctor'}</p>
          {v.diagnosis && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
          {v.notes && <p className="mt-1 text-sm text-slate-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function PrescriptionsList({ items }: { items: Prescription[] }) {
  if (!items.length) return <Empty icon={Pill} label="No prescriptions recorded" />;
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{p.doctor_name ?? 'Doctor'}</p>
            <span className="text-xs text-slate-400">{new Date(p.prescribed_date).toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-slate-500">{p.hospital_name ?? 'Hospital'}</p>
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

function VitalsList({ items }: { items: Vital[] }) {
  if (!items.length) return <Empty icon={Activity} label="No vitals recorded" />;
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500 mb-2">{new Date(v.recorded_at).toLocaleString()}</p>
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

function LabsList({ items }: { items: LabReport[] }) {
  if (!items.length) return <Empty icon={FlaskConical} label="No lab reports recorded" />;
  const sc: Record<string, string> = { normal: 'bg-emerald-50 text-emerald-700', abnormal: 'bg-amber-50 text-amber-700', critical: 'bg-rose-50 text-rose-700' };
  return (
    <div className="space-y-3">
      {items.map((l) => (
        <div key={l.id} className="rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{l.test_name}</p>
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${sc[l.status] ?? sc.normal}`}>{l.status}</span>
          </div>
          <p className="text-xs text-slate-500">{l.lab_name ?? 'Lab'} · {new Date(l.report_date).toLocaleDateString()}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div><span className="text-slate-400">Result: </span><span className="font-medium text-slate-700">{l.result ?? '—'}</span></div>
            {l.normal_range && <div><span className="text-slate-400">Range: </span><span className="text-slate-600">{l.normal_range}</span></div>}
          </div>
        </div>
      ))}
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
function Empty({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function PatientBanner({ patient }: { patient: Patient }) {
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  return (
    <div className="bg-white rounded-2xl hp-soft-shadow p-5 mb-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl hp-gradient flex items-center justify-center shrink-0">
          <HeartPulse className="w-7 h-7 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800 truncate">{patient.full_name}</h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            {age !== null && <span>{age} years</span>}
            {patient.blood_group && <span className="font-medium text-rose-600">{patient.blood_group}</span>}
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </div>
      </div>
      {(patient.allergies.length > 0 || patient.chronic_conditions.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-3">
          {patient.allergies.length > 0 && (
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wide">Allergies</p>
                <p className="text-sm text-slate-700">{patient.allergies.join(', ')}</p>
              </div>
            </div>
          )}
          {patient.chronic_conditions.length > 0 && (
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Chronic conditions</p>
                <p className="text-sm text-slate-700">{patient.chronic_conditions.join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


