"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendTeamsTestInviteAction } from "@/app/admin/actions";

/**
 * Test-Einladung über den nativen Pfad in das Team einer Klasse – analog zur
 * „Test-Mail" bei den E-Mails. Dient zum Verifizieren, bevor der Schalter auf
 * „Nativ" gestellt wird. Setzt kein teams_eingeladen_am.
 */
export function TeamsTestInvite({
  klasseId,
  disabled,
  hint,
}: {
  klasseId: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, start] = useTransition();

  function handleSend() {
    setMsg(null);
    start(async () => {
      const res = await sendTeamsTestInviteAction(klasseId, email);
      if (res.ok) setMsg({ kind: "ok", text: `Test-Einladung an ${email} ausgelöst.` });
      else setMsg({ kind: "err", text: res.error ?? "Test-Einladung fehlgeschlagen." });
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@adresse.de"
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-dark-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#030386]/30 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || isPending || !email}
          className="inline-flex items-center gap-2 px-4 py-2 border border-dark-slate-200 text-dark-slate-700 hover:bg-dark-slate-50 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Senden…" : "Test-Einladung"}
        </button>
      </div>
      {hint && <p className="text-xs text-amber-600 mt-1">{hint}</p>}
      {msg && (
        <p className={`text-sm mt-2 ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
