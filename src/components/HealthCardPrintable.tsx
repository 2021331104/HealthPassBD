import { QRCodeSVG } from 'qrcode.react';
import { Patient } from '../types';
import { HeartPulse, ShieldCheck, Fingerprint, Download } from 'lucide-react';

interface Props {
  patient: Patient;
  publicUrlBase?: string;
}

export default function HealthCardPrintable({ patient, publicUrlBase = '' }: Props) {
  const scanUrl = `${publicUrlBase}/#/card/${patient.health_card_id}`;
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <div
      id="health-card-printable"
      className="relative w-[340px] hp-card-gradient rounded-2xl p-5 text-white overflow-hidden"
      style={{ boxShadow: '0 10px 30px rgba(2, 132, 199, 0.25)' }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/25">
              <HeartPulse className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-sky-100/70 font-semibold leading-none">HealthPass</p>
              <p className="text-sm font-bold leading-tight">Bangladesh</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold bg-white/15 px-2 py-1 rounded-full ring-1 ring-white/20">
            {patient.blood_group ?? 'N/A'}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="bg-white p-2.5 rounded-xl ring-1 ring-white/30">
            <QRCodeSVG value={scanUrl} size={92} level="M" bgColor="#ffffff" fgColor="#0c4a6e" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-sky-100/70">Patient</p>
            <p className="text-lg font-bold leading-tight truncate">{patient.full_name}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-sky-100/90">
              {age !== null && <span>{age} yrs</span>}
              {patient.phone && <span className="truncate">{patient.phone}</span>}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-sky-100/70">
              <Fingerprint className="w-3 h-3" />
              <span className="font-mono">{patient.health_card_id}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-sky-100/70">
            <ShieldCheck className="w-3 h-3" />
            <span>Scan for medical history</span>
          </div>
          <Download className="w-3 h-3 text-sky-100/70" />
        </div>
      </div>
    </div>
  );
}
