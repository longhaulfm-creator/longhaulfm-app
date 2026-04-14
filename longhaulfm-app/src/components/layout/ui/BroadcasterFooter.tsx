// src/components/layout/BroadcasterFooter.tsx
import { ShieldCheck, Radio } from 'lucide-react';

export function BroadcasterFooter() {
  return (
    <footer className="mt-auto bg-brand-dark border-t border-white/10 p-4 pb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        
        {/* Secure Session Card */}
        <div className="flex-1 flex items-center gap-3 bg-brand border border-white/5 p-3 rounded-full h-14 px-5">
           <ShieldCheck className="text-signal-green" size={24} />
           <div className="flex flex-col">
             <span className="font-header text-sm tracking-wider text-white">SECURE SESSION</span>
             <span className="text-[10px] text-white/40 uppercase font-ui">Master Account Active</span>
           </div>
        </div>

        {/* THE MAIN ON-AIR BUTTON */}
        <button className="btn-engage flex-1 flex items-center justify-center gap-2 h-14">
           <Radio size={20} className="animate-pulse" />
           ENGAGE ON-AIR
        </button>
      </div>

      {/* Branded Sign-off */}
      <div className="text-center">
         <p className="text-[10px] font-header text-white/20 tracking-[0.3em] uppercase italic">
           By the Isuhamba Group
         </p>
      </div>
    </footer>
  );
}