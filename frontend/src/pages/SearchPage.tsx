import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Asana, Transition } from "../lib/types";

export function SearchPage() {
  const [mode, setMode] = useState<"asana" | "transition">("asana");
  const [q, setQ] = useState("");
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/asanas"), api.get("/transitions")])
      .then(([aRes, tRes]) => {
        setAsanas(aRes.data);
        setTransitions(tRes.data);
      })
      .catch(() => setError("Failed to load search data."))
      .finally(() => setLoading(false));
  }, []);

  const asanaFiltered = useMemo(() => {
    const s = q.toLowerCase();
    return asanas.filter((a) =>
      [a.english_name, a.sanskrit_name, a.type, a.category, a.benefits].join(" ").toLowerCase().includes(s),
    );
  }, [asanas, q]);

  const transitionFiltered = useMemo(() => {
    const s = q.toLowerCase();
    return transitions.filter((t) => t.name.toLowerCase().includes(s));
  }, [transitions, q]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Search</h1>
      <div className="bg-white rounded-xl border border-sand-100 p-4 space-y-2">
        <div className="flex gap-3 text-sm">
          <button className={`px-3 py-1 rounded ${mode === "asana" ? "bg-sage-500 text-white" : "bg-sand-100"}`} onClick={() => setMode("asana")}>Asana</button>
          <button className={`px-3 py-1 rounded ${mode === "transition" ? "bg-sage-500 text-white" : "bg-sand-100"}`} onClick={() => setMode("transition")}>Transition</button>
        </div>
        <input className="border border-sand-200 rounded px-3 py-2 w-full" placeholder="Filter by all fields..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {mode === "asana"
          ? asanaFiltered.map((a) => <div key={a.id} className="bg-white border border-sand-100 rounded p-3">{a.english_name} - {a.sanskrit_name}</div>)
          : transitionFiltered.map((t) => <div key={t.id} className="bg-white border border-sand-100 rounded p-3">{t.name}</div>)}
      </div>
    </div>
  );
}
