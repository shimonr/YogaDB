import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Flow, Transition } from "../lib/types";
import { RankStars } from "../components/RankStars";

export function FlowsPage() {
  const [items, setItems] = useState<Flow[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [name, setName] = useState("");
  const [t1, setT1] = useState<number>(0);
  const [t2, setT2] = useState<number>(0);
  const [t3, setT3] = useState<number>(0);
  const [t4, setT4] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    api
      .get("/flows/top")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load flows."));

  useEffect(() => {
    Promise.all([api.get("/flows/top"), api.get("/transitions?limit=200")])
      .then(([flowRes, transRes]) => {
        setItems(flowRes.data);
        const rows = transRes.data as Transition[];
        setTransitions(rows);
        if (rows[0]?.id) {
          setT1(rows[0].id);
          setT2(rows[0].id);
          setT3(rows[0].id);
          setT4(rows[0].id);
        }
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    setSubmitting(true);
    try {
      await api.post("/flows", {
        name: name || "New Flow",
        transition_1_id: t1,
        transition_2_id: t2,
        transition_3_id: t3,
        transition_4_id: t4,
        difficulty_level: difficulty,
        rank: 50,
      });
      setName("");
      refresh();
    } catch {
      setError("Failed to create flow.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Flows (Top 10)</h1>
      <div className="bg-white rounded-xl border border-sand-100 p-4 grid md:grid-cols-4 gap-2">
        <input className="border border-sand-200 rounded px-3 py-2 md:col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Create new flow..." />
        {[t1, t2, t3, t4].map((value, idx) => (
          <select
            key={idx}
            className="border border-sand-200 rounded px-2"
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (idx === 0) setT1(next);
              if (idx === 1) setT2(next);
              if (idx === 2) setT3(next);
              if (idx === 3) setT4(next);
            }}
          >
            {transitions.map((t) => <option key={`${idx}-${t.id}`} value={t.id}>{t.name}</option>)}
          </select>
        ))}
        <select className="border border-sand-200 rounded px-2" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Difficulty {d}</option>)}
        </select>
        <button onClick={create} disabled={submitting} className="bg-sage-500 text-white px-4 rounded disabled:opacity-50">
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((f) => (
          <div key={f.id} className="bg-white rounded-xl border border-sand-100 p-4">
            <h3 className="font-medium">{f.name}</h3>
            <RankStars rank={f.rank} />
          </div>
        ))}
      </div>
    </div>
  );
}
