"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { sendCustomerOtpCodeAction } from "@/app/admin/actions";

export function SendCustomerOtpCodeButton({
  bestellungId,
  kundenEmail,
}: {
  bestellungId: number;
  kundenEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    setStatus("idle");
    setMessage(null);
    startTransition(async () => {
      const result = await sendCustomerOtpCodeAction(bestellungId);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("success");
        setMessage(`Login-Code an ${kundenEmail} gesendet.`);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#030386] bg-white border border-[#030386]/30 rounded-lg hover:bg-[#030386]/5 disabled:opacity-50 transition-colors"
      >
        <Send className="w-4 h-4" />
        {isPending ? "Sende…" : "Login-Code senden"}
      </button>
      {status === "success" && message && (
        <p className="flex items-center gap-1 text-xs text-green-700">
          <CheckCircle className="w-3.5 h-3.5" />
          {message}
        </p>
      )}
      {status === "error" && message && (
        <p className="flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {message}
        </p>
      )}
    </div>
  );
}
