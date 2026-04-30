import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { KlasseForm } from "../klasse-form";

export default async function NewKlassePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/klassen"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate-900">Neue Klasse</h1>
      </div>

      <KlasseForm mode="create" />
    </div>
  );
}
