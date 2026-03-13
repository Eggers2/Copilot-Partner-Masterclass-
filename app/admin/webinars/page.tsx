import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Video } from "lucide-react";

export default async function WebinarsPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Webinare</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Webinar-Planung und -Verwaltung
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-dark-slate-100 p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-[#E3ECF8] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-[#030386]" />
        </div>
        <h2 className="text-xl font-bold text-dark-slate-900 mb-2">
          Kommt bald
        </h2>
        <p className="text-dark-slate-500 text-sm max-w-md mx-auto">
          Hier kannst du bald Webinare planen, Teilnehmer verwalten und
          Einladungen versenden. Dieses Feature befindet sich in Entwicklung.
        </p>
      </div>
    </div>
  );
}
