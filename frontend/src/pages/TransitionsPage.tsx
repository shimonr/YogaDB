import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { RankStars } from "../components/RankStars";
import type { Asana, Transition } from "../lib/types";

export function TransitionsPage() {
  const [items, setItems] = useState<Transition[]>([]);
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [name, setName] = useState("");
  const [startAsanaId, setStartAsanaId] = useState<number>(0);
  const [endAsanaId, setEndAsanaId] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    api
      .get("/transitions/top")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load transitions."));

  useEffect(() => {
    Promise.all([api.get("/transitions/top"), api.get("/asanas?limit=200")])
      .then(([transRes, asanaRes]) => {
        setItems(transRes.data);
        const rows = asanaRes.data as Asana[];
        setAsanas(rows);
        if (rows[0]?.id) setStartAsanaId(rows[0].id);
        if (rows[1]?.id) setEndAsanaId(rows[1].id);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    setSubmitting(true);
    try {
      await api.post("/transitions", {
        name: name || "New Transition",
        start_asana_id: startAsanaId,
        end_asana_id: endAsanaId,
        difficulty_level: difficulty,
        rank: 50,
      });
      setName("");
      refresh();
    } catch {
      setError("Failed to create transition.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Transitions (Top 10)</h1>
      <div className="bg-white rounded-xl border border-sand-100 p-4 grid md:grid-cols-4 gap-2">
        <input className="border border-sand-200 rounded px-3 py-2 md:col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Create new transition..." />
        <select className="border border-sand-200 rounded px-2" value={startAsanaId} onChange={(e) => setStartAsanaId(Number(e.target.value))}>
          {asanas.map((a) => <option key={`start-${a.id}`} value={a.id}>{a.english_name}</option>)}
        </select>
        <select className="border border-sand-200 rounded px-2" value={endAsanaId} onChange={(e) => setEndAsanaId(Number(e.target.value))}>
          {asanas.map((a) => <option key={`end-${a.id}`} value={a.id}>{a.english_name}</option>)}
        </select>
        <select className="border border-sand-200 rounded px-2" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Difficulty {d}</option>)}
        </select>
        <button onClick={create} disabled={submitting} className="bg-sage-500 text-white px-4 rounded disabled:opacity-50">
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-sand-100 p-4">
            <h3 className="font-medium">{t.name}</h3>
            <RankStars rank={t.rank} />
          </div>
        ))}
      </div>
    </div>
  );
}
