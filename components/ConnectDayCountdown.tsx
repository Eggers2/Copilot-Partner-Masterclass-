"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    tage: Math.floor(ms / 86_400_000),
    stunden: Math.floor(ms / 3_600_000) % 24,
    minuten: Math.floor(ms / 60_000) % 60,
    sekunden: Math.floor(ms / 1000) % 60,
    vorbei: ms === 0,
  };
}

/** Live-Countdown bis zum Anmeldestart (tickt sekündlich). */
export function ConnectDayCountdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  // Erst nach dem Mount rendern, um Hydration-Differenzen zu vermeiden.
  const [state, setState] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setState(diff(target));
    const timer = setInterval(() => setState(diff(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!state || state.vorbei) return null;

  const boxes = [
    { value: state.tage, label: "Tage" },
    { value: state.stunden, label: "Std" },
    { value: state.minuten, label: "Min" },
    { value: state.sekunden, label: "Sek" },
  ];

  return (
    <div className="flex items-center justify-center gap-3">
      {boxes.map((b) => (
        <div
          key={b.label}
          className="w-16 rounded-xl border border-white/15 bg-white/5 py-2.5 text-center"
        >
          <div className="text-2xl font-bold text-white tabular-nums">
            {String(b.value).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            {b.label}
          </div>
        </div>
      ))}
    </div>
  );
}
