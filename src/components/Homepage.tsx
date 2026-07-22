import { HeartPulse, Stethoscope, Ambulance, QrCode, ShieldCheck, Activity, ArrowRight, Clock, MapPin } from 'lucide-react';

interface Props {
  onGetStarted: () => void;
}

export default function Homepage({ onGetStarted }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl hp-gradient flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-lg">HealthPass BD</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-800 hidden sm:inline">Features</a>
            <a href="#roles" className="text-sm text-slate-600 hover:text-slate-800 hidden sm:inline">For You</a>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden hp-gradient">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-sky-400/10" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-sky-50 text-xs font-medium ring-1 ring-white/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Trusted health records for Bangladesh
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]">
              Your health, <br className="hidden sm:block" />in one QR code.
            </h1>
            <p className="mt-4 text-lg text-sky-100/85 max-w-xl">
              HealthPass BD gives every patient a digital health card. Doctors scan the QR to see full medical history instantly. Ambulance drivers receive emergency requests — all in one platform.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onGetStarted}
                className="px-6 py-3 rounded-xl bg-white text-sky-700 font-semibold hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
              >
                Create your account <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#roles"
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 ring-1 ring-white/25 transition-colors flex items-center justify-center gap-2"
              >
                Explore roles
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-sky-100/80">
              <span className="flex items-center gap-1.5"><QrCode className="w-4 h-4" /> QR-based records</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Verified & secure</span>
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> Real-time ambulance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">One platform, three roles</h2>
          <p className="text-slate-500 mt-2">Choose your role when you sign up — the app adapts to you.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <RoleCard
            icon={HeartPulse}
            color="from-sky-500 to-sky-700"
            title="Patient"
            desc="Carry a digital health card with QR. Track visits, prescriptions, vitals & lab reports. Request ambulances in emergencies."
            points={['Health card with QR', 'Full medical history', 'Request ambulance']}
          />
          <RoleCard
            icon={Stethoscope}
            color="from-emerald-500 to-emerald-700"
            title="Doctor"
            desc="Scan a patient's QR or search by health card ID to instantly view their verified medical history — anytime, anywhere."
            points={['Search by card ID', 'View full history', 'Verified records']}
          />
          <RoleCard
            icon={Ambulance}
            color="from-rose-500 to-rose-700"
            title="Ambulance"
            desc="List your vehicle, toggle availability, and receive emergency pickup requests from patients nearby."
            points={['Manage availability', 'Receive requests', 'Track pickups']}
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Built for real healthcare moments</h2>
            <p className="text-slate-500 mt-2">From routine checkups to emergencies — everything connected.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature icon={QrCode} title="QR health card" desc="Every patient gets a unique QR code that links to their complete medical record." />
            <Feature icon={Activity} title="Vitals tracking" desc="Log blood pressure, heart rate, SpO₂, temperature and more over time." />
            <Feature icon={Stethoscope} title="Visit history" desc="Keep every diagnosis, prescription, and doctor visit in one place." />
            <Feature icon={Ambulance} title="Emergency transport" desc="Patients request an ambulance; nearby drivers get the request instantly." />
            <Feature icon={ShieldCheck} title="Private by design" desc="Row-level security keeps each patient's data visible only to them." />
            <Feature icon={Clock} title="Always available" desc="Doctors can access records 24/7 via the QR — no app or login required." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl hp-gradient p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-sky-400/10" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white tracking-tight">Ready to take control of your health?</h2>
            <p className="text-sky-100/85 mt-2 max-w-xl mx-auto">Join HealthPass BD today. Create your account in under a minute.</p>
            <button
              onClick={onGetStarted}
              className="mt-6 px-6 py-3 rounded-xl bg-white text-sky-700 font-semibold hover:bg-sky-50 transition-colors inline-flex items-center gap-2"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg hp-gradient flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-semibold text-slate-700">HealthPass BD</span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Made for Bangladesh
          </p>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({ icon: Icon, color, title, desc, points }: { icon: typeof HeartPulse; color: string; title: string; desc: string; points: string[] }) {
  return (
    <div className="bg-white rounded-2xl hp-card-shadow p-6 hp-rise hover:-translate-y-1 transition-transform">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
      <ul className="mt-4 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof HeartPulse; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-5 hover:border-sky-200 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
  );
}
