"use client";

import { useActionState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, Zap, Shield } from "lucide-react";
import { useState } from "react";
import { loginAction } from "@/app/admin/actions";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-dark-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#030386]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#030386]/20 border border-[#030386]/30 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-[#DCDCEE]" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-[#030386] rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-dark-slate-400 text-sm">Next Skills</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin-Bereich</h1>
          <p className="text-dark-slate-400 text-sm mt-1">
            Copilot Partner Masterclass – CRM
          </p>
        </div>

        <div className="bg-dark-slate-800 border border-dark-slate-700 rounded-2xl p-8 shadow-2xl">
          <form action={formAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-slate-300 mb-2">
                <Lock className="w-4 h-4 inline mr-1.5" />
                Admin-Passwort
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Passwort eingeben..."
                  required
                  disabled={isPending}
                  className="w-full px-4 py-3 pr-12 bg-dark-slate-900 border border-dark-slate-600 focus:border-[#030386] rounded-xl text-white placeholder-dark-slate-500 outline-none transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-slate-400 hover:text-dark-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[#030386] hover:bg-[#05015B] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Anmelden...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Anmelden
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-dark-slate-600 text-xs mt-6">
          Geschützter Bereich. Nur für autorisierte Nutzer.
        </p>
      </div>
    </div>
  );
}
