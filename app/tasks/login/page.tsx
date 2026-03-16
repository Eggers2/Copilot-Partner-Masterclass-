"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TasksLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/tasks/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/tasks");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Login fehlgeschlagen.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05015B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">NextSkills</h1>
          <p className="text-[#DCDCEE] mt-2">Launch Tasks</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-2xl p-8 space-y-5"
        >
          <h2 className="text-xl font-bold text-[#3B3B39] text-center">
            Anmelden
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Benutzername
            </label>
            <input
              name="username"
              type="text"
              required
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#030386] focus:border-transparent outline-none text-[#3B3B39]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Passwort
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#030386] focus:border-transparent outline-none text-[#3B3B39]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#030386] text-white rounded-lg font-semibold hover:bg-[#05015B] transition-colors disabled:opacity-50"
          >
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
