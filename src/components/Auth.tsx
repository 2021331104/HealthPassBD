import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Role } from '../types';
import {
  HeartPulse, Mail, Lock, User as UserIcon, Loader2, AlertCircle,
  Stethoscope, Ambulance, UserRound,
} from 'lucide-react';

type Mode = 'signin' | 'signup';

const ROLES: { key: Role; label: string; icon: typeof Stethoscope; desc: string }[] = [
  { key: 'patient', label: 'Patient', icon: UserRound, desc: 'Manage your health card & history' },
  { key: 'doctor', label: 'Doctor', icon: Stethoscope, desc: 'Look up patient records' },
  { key: 'ambulance', label: 'Ambulance', icon: Ambulance, desc: 'Receive emergency requests' },
];

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<Role>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Please enter your full name.');
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim(), role } },
        });
        if (err) throw err;
        if (data.user) {
          // Use upsert to avoid duplicate profile rows if onAuthStateChange fires first
          const { error: profileErr } = await supabase.from('profiles').upsert({
            user_id: data.user.id,
            role,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          }, { onConflict: 'user_id' });
          if (profileErr) {
            // Non-fatal — AuthContext will retry profile creation on next load
            console.warn('Profile insert failed:', profileErr.message);
          }
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg === 'Invalid login credentials' ? 'Invalid email or password.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 hp-gradient">
      <div className="w-full max-w-md hp-rise">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
            <HeartPulse className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">HealthPass BD</h1>
          <p className="text-sky-100/80 text-sm mt-1">Your digital health platform</p>
        </div>

        <div className="bg-white rounded-2xl hp-card-shadow p-7">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  mode === m ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <div className="mb-4">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">I am a...</span>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ key, label, icon: Icon, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      role === key
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                {ROLES.find((r) => r.key === role)?.desc}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Field icon={<UserIcon className="w-4 h-4" />} label="Full Name">
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rahim Uddin" className="hp-input" />
                </Field>
                <Field icon={<UserIcon className="w-4 h-4" />} label="Phone">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="hp-input" />
                </Field>
              </>
            )}
            <Field icon={<Mail className="w-4 h-4" />} label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="hp-input" />
            </Field>
            <Field icon={<Lock className="w-4 h-4" />} label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="hp-input" />
            </Field>

            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-5">
            By continuing you agree to keep your health data private.
          </p>
        </div>
      </div>

      <style>{`
        .hp-input {
          width: 100%;
          padding: 0.625rem 0.75rem 0.625rem 2.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.625rem;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.15s;
        }
        .hp-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
        }
      `}</style>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        {children}
      </div>
    </label>
  );
}
