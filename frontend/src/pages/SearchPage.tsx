import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Transition } from "../lib/types";

export function SearchPage() {
  const [mode, setMode] = useState<"asana" | "transition">("asana");
  const [q, setQ] = useState("");
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterClassic, setFilterClassic] = useState<"all" | "yes" | "no">("all");
  const [filterDifficulty, setFilterDifficulty] = useState<number[]>([]);
  const [filterRankMin, setFilterRankMin] = useState(0);
  const [filterRankMax, setFilterRankMax] = useState(100);

  useEffect(() => {
    Promise.all([api.get("/asanas?limit=200"), api.get("/transitions?limit=200")])
      .then(([aRes, tRes]) => {
        setAsanas(aRes.data);
        setTransitions(tRes.data);
      })
      .catch(() => setError("Failed to load search data."))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => [...new Set(asanas.map((a) => a.category))].sort(), [asanas]);
  const types = useMemo(() => [...new Set(asanas.map((a) => a.type))].sort(), [asanas]);
  const maxRank = useMemo(() => Math.max(...asanas.map((a) => a.rank), 50), [asanas]);

  const toggleDifficulty = (d: number) => {
    setFilterDifficulty((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const resetFilters = () => {
    setFilterCategory("");
    setFilterType("");
    setFilterClassic("all");
    setFilterDifficulty([]);
    setFilterRankMin(0);
    setFilterRankMax(100);
    setQ("");
  };

  const asanaFiltered = useMemo(() => {
    const s = q.toLowerCase();
    return asanas.filter((a) => {
      if (s && ![a.english_name, a.sanskrit_name, a.alt_name_1, a.alt_name_2, a.type, a.category, a.benefits]
        .filter(Boolean).join(" ").toLowerCase().includes(s)) return false;
      if (filterCategory && a.category !== filterCategory) return false;
      if (filterType && a.type !== filterType) return false;
      if (filterClassic === "yes" && !a.is_classic) return false;
      if (filterClassic === "no" && a.is_classic) return false;
      if (filterDifficulty.length > 0 && !filterDifficulty.includes(a.difficulty_level)) return false;
      if (a.rank < filterRankMin || a.rank > filterRankMax) return false;
      return true;
    });
  }, [asanas, q, filterCategory, filterType, filterClassic, filterDifficulty, filterRankMin, filterRankMax]);

  const transitionFiltered = useMemo(() => {
    const s = q.toLowerCase();
    return transitions.filter((t) => t.name.toLowerCase().includes(s));
  }, [transitions, q]);

  const starValues = [0, 20, 40, 60, 80, 100];

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Search</h1>
      <div className="bg-white rounded-xl border border-sand-100 p-4 space-y-3">
        <div className="flex gap-3 text-sm">
          <button className={`px-3 py-1 rounded ${mode === "asana" ? "bg-sage-500 text-white" : "bg-sand-100"}`} onClick={() => setMode("asana")}>Asana</button>
          <button className={`px-3 py-1 rounded ${mode === "transition" ? "bg-sage-500 text-white" : "bg-sand-100"}`} onClick={() => setMode("transition")}>Transition</button>
        </div>
        <input className="border border-sand-200 rounded px-3 py-2 w-full" placeholder="Search by name, benefits, type..." value={q} onChange={(e) => setQ(e.target.value)} />

        {mode === "asana" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select className="border border-sand-200 rounded px-2 py-1 w-full" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Type</label>
              <select className="border border-sand-200 rounded px-2 py-1 w-full" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Classic</label>
              <select className="border border-sand-200 rounded px-2 py-1 w-full" value={filterClassic} onChange={(e) => setFilterClassic(e.target.value as any)}>
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Min Rank</label>
              <select className="border border-sand-200 rounded px-2 py-1 w-full" value={filterRankMin} onChange={(e) => setFilterRankMin(Number(e.target.value))}>
                {starValues.map((v) => <option key={v} value={v}>{v === 0 ? "Any" : `${v}+`}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Rank</label>
              <select className="border border-sand-200 rounded px-2 py-1 w-full" value={filterRankMax} onChange={(e) => setFilterRankMax(Number(e.target.value))}>
                {starValues.map((v) => <option key={v} value={v}>{v === 100 ? "Any" : v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Difficulty</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDifficulty(d)}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      filterDifficulty.includes(d)
                        ? "bg-sage-500 text-white border-sage-500"
                        : "bg-white text-slate-600 border-sand-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={resetFilters} className="text-xs text-sage-600 underline">Reset filters</button>
      </div>

      <p className="text-xs text-slate-400">{mode === "asana" ? asanaFiltered.length : transitionFiltered.length} results</p>

      <div className="space-y-2">
        {mode === "asana"
          ? asanaFiltered.map((a) => (
              <Link
                key={a.id}
                to={`/asanas/${a.id}`}
                className="block bg-white border border-sand-100 rounded p-3 hover:shadow-sm transition-colors"
              >
                <span className="font-medium text-sage-700">{a.english_name}</span>
                <span className="text-slate-500 ml-2">— {a.sanskrit_name}</span>
                <span className="text-xs text-slate-400 ml-2">{a.type} · {a.category} · Diff {a.difficulty_level}</span>
                {a.is_classic && <span className="text-xs text-amber-500 ml-2">Classic</span>}
              </Link>
            ))
          : transitionFiltered.map((t) => (
              <div key={t.id} className="bg-white border border-sand-100 rounded p-3">
                <span className="font-medium text-sage-700">{t.name}</span>
                <span className="text-xs text-slate-400 ml-2">Difficulty {t.difficulty_level}</span>
              </div>
            ))}
        {mode === "asana" && asanaFiltered.length === 0 && (
          <p className="text-slate-400 text-sm">No asanas match the current filters.</p>
        )}
        {mode === "transition" && transitionFiltered.length === 0 && (
          <p className="text-slate-400 text-sm">No transitions match "{q}"</p>
        )}
      </div>
    </div>
  );
}
