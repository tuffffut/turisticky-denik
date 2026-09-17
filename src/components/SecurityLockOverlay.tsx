import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Smartphone, Compass } from 'lucide-react';

interface SecurityLockOverlayProps {
  onUnlock: () => void;
  savedPin: string;
  onSetNewPin?: (pin: string) => void;
}

export const SecurityLockOverlay: React.FC<SecurityLockOverlayProps> = ({
  onUnlock,
  savedPin,
  onSetNewPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newPinConfirm, setNewPinConfirm] = useState('');

  // Check if initial pin setup is needed
  useEffect(() => {
    if (!savedPin) {
      setIsSettingUp(true);
    }
  }, [savedPin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSettingUp) {
      if (pinInput.length < 4) {
        setError('PIN musí mít alespoň 4 číslice nebo znaky.');
        return;
      }
      if (pinInput !== newPinConfirm) {
        setError('Zadané PINy se neshodují.');
        return;
      }
      if (onSetNewPin) {
        onSetNewPin(pinInput);
      }
      onUnlock();
      return;
    }

    if (pinInput === savedPin) {
      onUnlock();
    } else {
      setError('Nesprávný PIN. Zkuste to znovu.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-950">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold font-display text-stone-100 mb-1">
          {isSettingUp ? 'Nastavte si svůj PIN' : 'Soukromý Horský Deník'}
        </h2>
        <p className="text-xs text-stone-400 mb-6 max-w-xs leading-relaxed">
          {isSettingUp
            ? 'Váš deník je soukromý. Zvolte si 4–6místný PIN pro rychlé odemčení na vašich zařízeních.'
            : 'Zadejte váš bezpečnostní PIN pro přístup k trasám, GPX a fotkám.'}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                inputMode="numeric"
                autoFocus
                placeholder="Zadejte PIN..."
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setError(null);
                }}
                className="w-full text-center text-2xl tracking-[0.4em] py-3.5 px-4 bg-stone-950 border border-stone-800 rounded-2xl text-emerald-400 placeholder:text-stone-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600 pointer-events-none" />
            </div>
          </div>

          {isSettingUp && (
            <div>
              <input
                type="password"
                maxLength={8}
                inputMode="numeric"
                placeholder="Potvrďte PIN znovu..."
                value={newPinConfirm}
                onChange={(e) => {
                  setNewPinConfirm(e.target.value);
                  setError(null);
                }}
                className="w-full text-center text-2xl tracking-[0.4em] py-3.5 px-4 bg-stone-950 border border-stone-800 rounded-2xl text-emerald-400 placeholder:text-stone-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/50 py-2 px-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <span>{isSettingUp ? 'Uložit PIN a vstoupit' : 'Odemknout deník'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-800/80 w-full flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>Zařízení si odemčení bezpečně pamatuje</span>
        </div>
      </div>
    </div>
  );
};
