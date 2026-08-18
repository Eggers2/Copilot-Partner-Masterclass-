import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { listNewsletters } from "@/lib/db/newsletters";
import { NewsletterCard } from "@/components/admin/NewsletterCard";
import { createDraftAction } from "./actions";
import { Sparkles } from "lucide-react";

export default async function NewsletterListPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const newsletters = await listNewsletters();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate-900">Newsletter</h1>
          <p className="text-dark-slate-500 text-sm mt-1">
            Copilot Insider Update – wöchentliche News für alle Masterclass-Teilnehmer
          </p>
        </div>
        <form action={createDraftAction}>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[#030386] hover:bg-[#040499] text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Neuer Newsletter
          </button>
        </form>
      </div>

      <p className="text-xs text-dark-slate-400 mb-4">
        Hinweis: Nach Klick auf &quot;Neuer Newsletter&quot; springst du sofort in den Editor –
        News und Termine werden im Hintergrund generiert (ca. 20–40 s) und erscheinen
        dort live. Die Box &bdquo;Masterclass Inside&ldquo; füllst du selbst; bleibt sie
        leer, erscheint sie nicht im Newsletter.
      </p>

      {newsletters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dark-slate-100 p-12 shadow-sm text-center">
          <p className="text-dark-slate-500 text-sm">
            Noch keine Newsletter angelegt. Starte mit &quot;Neuer Newsletter&quot;.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((nl) => (
            <NewsletterCard
              key={nl.id}
              id={nl.id}
              ausgabeNr={nl.ausgabeNr}
              kw={nl.kw}
              jahr={nl.jahr}
              titel={nl.titel}
              status={nl.status}
              gesendetAm={nl.gesendetAm}
              erstelltAm={nl.erstelltAm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
