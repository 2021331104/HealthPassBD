import { useState, useEffect, FormEvent, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Ambulance, AmbulanceRequest, Patient } from '../types';
import {
  LogOut, Ambulance as AmbulanceIcon, Loader2, X, AlertCircle,
  MapPin, Phone, Car, User as UserIcon, ToggleLeft, ToggleRight, Clock,
  CheckCircle2, Navigation, Building2, XCircle, Radio,
} from 'lucide-react';

export default function AmbulanceDashboard({ onSignOut, userId }: { onSignOut: () => void; userId: string }) {
  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ambulances').select('*').eq('user_id', userId).maybeSingle();
      if (!data) setShowEdit(true);
      setAmbulance(data as Ambulance | null);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <FullScreenSpinner />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center">
              <AmbulanceIcon className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-bold text-slate-800 tracking-tight block leading-none">HealthPass BD</span>
              <span className="text-[11px] text-slate-400">Ambulance driver</span>
            </div>
          </div>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 hp-fade-in">
        {ambulance ? (
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
            <div className="space-y-5">
              <AmbulanceInfoCard ambulance={ambulance} onEdit={() => setShowEdit(true)} onToggle={async () => {
                const next = !ambulance.is_available;
                setAmbulance({ ...ambulance, is_available: next });
                await supabase.from('ambulances').update({ is_available: next }).eq('id', ambulance.id);
              }} />
            </div>
            <div>
              <RequestsPanel ambulance={ambulance} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl hp-soft-shadow p-6 text-center hp-rise">
            <p className="text-slate-600 mb-4">Set up your ambulance profile to start receiving requests.</p>
            <button onClick={() => setShowEdit(true)} className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm">Create profile</button>
          </div>
        )}
      </main>

      {showEdit && (
        <AmbulanceEditModal userId={userId} ambulance={ambulance} onClose={() => setShowEdit(false)} onSaved={(a) => { setAmbulance(a); setShowEdit(false); }} />
      )}
    </div>
  );
}

function AmbulanceInfoCard({ ambulance, onEdit, onToggle }: { ambulance: Ambulance; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-2xl hp-soft-shadow p-5 hp-rise">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Car className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{ambulance.driver_name}</p>
            <p className="text-sm text-slate-500">{ambulance.vehicle_type} · {ambulance.vehicle_no ?? 'No plate'}</p>
          </div>
        </div>
        <button onClick={onEdit} className="text-xs font-medium text-sky-600 hover:text-sky-700">Edit</button>
      </div>
      <dl className="space-y-2 text-sm">
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={ambulance.phone ?? '—'} />
        <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Area" value={[ambulance.upazila, ambulance.district].filter(Boolean).join(', ') || '—'} />
        <Row icon={<UserIcon className="w-3.5 h-3.5" />} label="Capacity" value={`${ambulance.capacity} patient(s)`} />
      </dl>
      <button onClick={onToggle} className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {ambulance.is_available ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
          {ambulance.is_available ? 'Available' : 'Off duty'}
        </span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ambulance.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {ambulance.is_available ? 'Live · Receiving' : 'Not receiving'}
        </span>
      </button>
      {ambulance.is_available && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <Radio className="w-3.5 h-3.5 animate-pulse" /> Listening for emergency broadcasts in real-time
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400 text-xs w-16 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium truncate">{value}</span>
    </div>
  );
}

/* ========== REQUESTS PANEL WITH REALTIME ========== */
function RequestsPanel({ ambulance }: { ambulance: Ambulance }) {
  const [requests, setRequests] = useState<(AmbulanceRequest & { patient?: Patient })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Fetch ALL requests visible to this driver:
    // - assigned to this ambulance, OR
    // - broadcast (NULL ambulance_id) + pending
    const { data } = await supabase
      .from('ambulance_requests')
      .select('*')
      .or(`ambulance_id.eq.${ambulance.id},and(ambulance_id.is.null,status.eq.pending)`)
      .order('requested_at', { ascending: false });
    const reqs = (data as AmbulanceRequest[]) ?? [];
    let withPatients: (AmbulanceRequest & { patient?: Patient })[] = reqs;
    if (reqs.length) {
      const ids = [...new Set(reqs.map((r) => r.patient_id))];
      const { data: pts } = await supabase.from('patients').select('*').in('id', ids);
      const map = new Map((pts as Patient[] | null ?? []).map((p) => [p.id, p]));
      withPatients = reqs.map((r) => ({ ...r, patient: map.get(r.patient_id) }));
    }
    setRequests(withPatients);
    setLoading(false);
  }, [ambulance.id]);

  useEffect(() => {
    load();
    // Realtime subscription for live request updates
    const channel = supabase.channel('ambulance-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function acceptRequest(req: AmbulanceRequest) {
    // Claim the request: set ambulance_id + status = accepted + responded_at
    // This is the "lock" — once ambulance_id is set, only this driver can update it
    const { error } = await supabase
      .from('ambulance_requests')
      .update({ ambulance_id: ambulance.id, status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', req.id)
      .eq('status', 'pending'); // only accept if still pending (prevents race)
    if (error) {
      alert('Could not accept — another driver may have already claimed this request.');
      return;
    }
    load();
  }

  async function updateStatus(id: string, status: AmbulanceRequest['status']) {
    const patch: Record<string, unknown> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    if (status === 'cancelled') patch.completed_at = new Date().toISOString();
    await supabase.from('ambulance_requests').update(patch).eq('id', id);
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const active = requests.filter((r) => r.status === 'accepted');
  const done = requests.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="bg-white rounded-2xl hp-soft-shadow p-5 hp-rise">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-800">Emergency requests</h2>
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <Radio className="w-3.5 h-3.5 animate-pulse" /> Live
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-sky-600 animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <AmbulanceIcon className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-400">No requests yet. When a patient requests an ambulance, it will appear here instantly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Incoming ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((r) => (
                  <RequestCard key={r.id} req={r} onAccept={() => acceptRequest(r)} onDecline={() => updateStatus(r.id, 'cancelled')} isBroadcast={r.ambulance_id === null} />
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">Active ({active.length})</h3>
              <div className="space-y-3">
                {active.map((r) => (
                  <RequestCard key={r.id} req={r} onComplete={() => updateStatus(r.id, 'completed')} />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">History</h3>
              <div className="space-y-3">
                {done.map((r) => (
                  <RequestCard key={r.id} req={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, onAccept, onDecline, onComplete, isBroadcast }: {
  req: AmbulanceRequest & { patient?: Patient };
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  isBroadcast?: boolean;
}) {
  const sc: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    accepted: 'bg-sky-50 text-sky-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${isBroadcast && req.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100'}`}>
      {isBroadcast && req.status === 'pending' && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-2">
          <Radio className="w-3.5 h-3.5 animate-pulse" /> Broadcast — first to accept wins
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{req.patient?.full_name ?? 'Patient'}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" /> {req.patient?.phone ?? '—'}
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${sc[req.status] ?? sc.pending}`}>{req.status}</span>
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        {req.pickup_location && <p className="flex items-start gap-1.5 text-slate-600"><Navigation className="w-3.5 h-3.5 mt-0.5 text-sky-500" /> Pickup: {req.pickup_location}</p>}
        {req.destination && <p className="flex items-start gap-1.5 text-slate-600"><Building2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500" /> Destination: {req.destination}</p>}
        {req.emergency_note && <p className="text-slate-500 italic">"{req.emergency_note}"</p>}
        <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(req.requested_at).toLocaleString()}</p>
      </div>
      {req.status === 'pending' && onAccept && (
        <div className="mt-3 flex gap-2">
          <button onClick={onAccept} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Accept
          </button>
          {onDecline && (
            <button onClick={onDecline} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" /> Decline
            </button>
          )}
        </div>
      )}
      {req.status === 'accepted' && onComplete && (
        <button onClick={onComplete} className="mt-3 w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Mark as completed
        </button>
      )}
    </div>
  );
}

/* ========== EDIT MODAL ========== */
function AmbulanceEditModal({ userId, ambulance, onClose, onSaved }: { userId: string; ambulance: Ambulance | null; onClose: () => void; onSaved: (a: Ambulance) => void }) {
  const [form, setForm] = useState({
    driver_name: ambulance?.driver_name ?? '',
    vehicle_no: ambulance?.vehicle_no ?? '',
    vehicle_type: ambulance?.vehicle_type ?? 'Ambulance',
    phone: ambulance?.phone ?? '',
    district: ambulance?.district ?? '',
    upazila: ambulance?.upazila ?? '',
    capacity: String(ambulance?.capacity ?? 1),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    if (!form.driver_name.trim()) { setError('Driver name is required.'); setSaving(false); return; }
    const payload = {
      ...form, user_id: userId,
      capacity: Number(form.capacity) || 1,
      vehicle_no: form.vehicle_no || null, phone: form.phone || null,
      district: form.district || null, upazila: form.upazila || null,
      is_available: ambulance?.is_available ?? true,
    };
    let data: Ambulance | null = null;
    if (ambulance) {
      const { data: d, error: err } = await supabase.from('ambulances').update(payload).eq('id', ambulance.id).select().maybeSingle();
      if (err) { setError(err.message); setSaving(false); return; }
      data = d as Ambulance;
    } else {
      const { data: d, error: err } = await supabase.from('ambulances').insert(payload).select().maybeSingle();
      if (err) { setError(err.message); setSaving(false); return; }
      data = d as Ambulance;
    }
    setSaving(false);
    if (data) onSaved(data);
  }

  return (
    <Modal title="Ambulance profile" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Driver name" value={form.driver_name} onChange={(v) => setForm({ ...form, driver_name: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Vehicle no (plate)" value={form.vehicle_no} onChange={(v) => setForm({ ...form, vehicle_no: v })} />
          <Input label="Vehicle type" value={form.vehicle_type} onChange={(v) => setForm({ ...form, vehicle_type: v })} />
          <Input label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
          <Input label="Upazila / Area" value={form.upazila} onChange={(v) => setForm({ ...form, upazila: v })} />
          <Input label="Capacity" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
        </div>
        {error && <ErrorMsg msg={error} />}
        <SaveRow saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

/* shared UI */
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
function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
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
