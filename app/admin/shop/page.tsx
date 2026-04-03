import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getBestellungen, getShopKpis } from "@/lib/db/bestellungen";
import { ShopKpiCards } from "@/components/admin/ShopKpiCards";
import { BestellungenTable } from "@/components/admin/BestellungenTable";

export default async function ShopDashboard() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const [kpi, bestellungen] = await Promise.all([
    getShopKpis(),
    getBestellungen(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Online Shop</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Alle Bestellungen aus dem Online-Shop – unabhängig von der Lead-Liste
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8">
        <ShopKpiCards data={kpi} />
      </div>

      {/* Bestellungen Table */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-dark-slate-900">
          Alle Bestellungen
        </h2>
        <p className="text-dark-slate-400 text-xs mt-0.5">
          Klicke auf den Status-Badge um den Bearbeitungsstatus zu wechseln (Neu → Bearbeitet → Abgeschlossen)
        </p>
      </div>
      <BestellungenTable
        bestellungen={bestellungen.map((b) => ({
          ...b,
          preisNetto: b.preisNetto.toString(),
          mwstBetrag: b.mwstBetrag.toString(),
          preisBrutto: b.preisBrutto.toString(),
          erstelltAm: b.erstelltAm.toISOString(),
        }))}
      />
    </div>
  );
}
