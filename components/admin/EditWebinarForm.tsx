"use client";

import { useState, useActionState } from "react";
import { X, Save } from "lucide-react";
import { updateWebinarAction } from "@/app/admin/actions";

interface EditWebinarFormProps {
  webinar: {
    id: string;
    title: string;
    scheduledAt: string;
    streamyardLink: string | null;
    description: string | null;
  };
  onClose: () => void;
}

export function EditWebinarForm({ webinar, onClose }: EditWebinarFormProps) {
  const [title, setTitle] = useState(webinar.title);
  const [state, formAction, isPending] = useActionState(
    updateWebinarAction,
    null
  );

  // Format datetime for input
  const scheduledDate = new Date(webinar.scheduledAt);
  const defaultDateTime = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, "0")}-${String(scheduledDate.getDate()).padStart(2, "0")}T${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`;

  if (state?.success) {
    onClose();
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-slate-900">
          Webinar bearbeiten
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-dark-slate-400 hover:text-dark-slate-600 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={webinar.id} />

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
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
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
              defaultValue={defaultDateTime}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              StreamYard Anmelde-Link
            </label>
            <input
              name="streamyardLink"
              type="url"
              defaultValue={webinar.streamyardLink ?? ""}
              placeholder="https://streamyard.com/watch/..."
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
            defaultValue={webinar.description ?? ""}
            className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isPending ? "Wird gespeichert..." : "Speichern"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50"
          >
            Abbrechen
          </button>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
        </div>
      </form>
    </div>
  );
}
