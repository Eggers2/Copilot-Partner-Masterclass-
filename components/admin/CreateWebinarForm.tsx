"use client";

import { useState, useActionState } from "react";
import { Plus, X } from "lucide-react";
import { createWebinarAction } from "@/app/admin/actions";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateWebinarForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [state, formAction, isPending] = useActionState(
    createWebinarAction,
    null
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Neues Webinar
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-slate-900">
          Neues Webinar anlegen
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-dark-slate-400 hover:text-dark-slate-600 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Titel *
            </label>
            <input
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Copilot Partner Masterclass – April"
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Slug (URL)
            </label>
            <input
              name="slug"
              required
              value={slugify(title)}
              readOnly
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg bg-dark-slate-50 text-dark-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Datum & Uhrzeit *
            </label>
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Dauer (Minuten)
            </label>
            <input
              name="durationMin"
              type="number"
              defaultValue={60}
              min={15}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Zoom-Link
            </label>
            <input
              name="zoomLink"
              type="url"
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Max. Teilnehmer
            </label>
            <input
              name="maxAttendees"
              type="number"
              defaultValue={50}
              min={1}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate-600 mb-1">
            Beschreibung
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Kurze Beschreibung des Webinars..."
            className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Webinar anlegen
          </button>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
        </div>
      </form>
    </div>
  );
}
