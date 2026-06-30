import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Flow, Transition, Asana } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../lib/auth";

export function FlowsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Flow[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [asanaMap, setAsanaMap] = useState<Record<number, Asana>>({});
  const [transMap, setTransMap] = useState<Record<number, Transition>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState(2);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; label: string } | null>(null);

  const refresh = () =>
    api.get("/flows/top").then((r) => setItems(r.data)).catch(() => setError("Failed to load flows."));

  useEffect(() => {
    Promise.all([api.get("/flows/top"), api.get("/transitions?limit=200"), api.get("/asanas?limit=200")])
      .then(([flowRes, transRes, asanaRes]) => {
        setItems(flowRes.data);
        const trans = transRes.data as Transition[];
        setTransitions(trans);
        const tMap: Record<number, Transition> = {};
        trans.forEach((t) => { tMap[t.id] = t; });
        setTransMap(tMap);
        const aMap: Record<number, Asana> = {};
        (asanaRes.data as Asana[]).forEach((a) => { aMap[a.id] = a; });
        setAsanaMap(aMap);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const availableForStep = useMemo(() => {
    if (selectedIds.length === 0) return transitions;
    const lastId = selectedIds[selectedIds.length - 1];
    const lastTrans = transMap[lastId];
    if (!lastTrans) return [];
    return transitions.filter((t) => t.start_asana_id === lastTrans.end_asana_id && !selectedIds.includes(t.id));
  }, [selectedIds, transitions, transMap]);

  const addTransition = (id: number) => { if (selectedIds.length < 20) setSelectedIds([...selectedIds, id]); };
  const removeLast = () => setSelectedIds((prev) => prev.slice(0, -1));

  const create = async () => {
    if (!flowName.trim()) { setCreateStatus("Please enter a flow name."); return; }
    if (selectedIds.length < 2) { setCreateStatus("A flow needs at least 2 transitions."); return; }
    setSubmitting(true); setCreateStatus("");
    try {
      await api.post("/flows", { name: flowName, transition_ids: selectedIds, difficulty_level: difficulty, rank: 50 });
      setFlowName(""); setSelectedIds([]); setCreateStatus("Flow created"); refresh();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setCreateStatus(typeof detail === "string" ? detail : "Failed to create flow.");
    } finally { setSubmitting(false); }
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    try { await api.delete(`/flows/${confirmTarget.id}`); setItems((prev) => prev.filter((x) => x.id !== confirmTarget.id)); }
    catch { setError("Delete failed."); }
    setConfirmOpen(false); setConfirmTarget(null);
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Flows (Top 10)</h1>

      {user?.role === "admin" && (
        <div className="bg-white rounded-xl border border-sand-100 p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <input className="border border-sand-200 rounded px-3 py-2 flex-1" value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Flow name..." />
            <select className="border border-sand-200 rounded px-2 py-1 text-sm" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Diff {d}</option>)}
            </select>
          </div>
          {selectedIds.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Selected ({selectedIds.length}/20):</p>
              <div className="flex flex-wrap gap-1">
                {selectedIds.map((sid, i) => {
                  const t = transMap[sid];
                  const s = t ? asanaMap[t.start_asana_id]?.english_name : "?";
                  const e = t ? asanaMap[t.end_asana_id]?.english_name : "?";
                  return <span key={i} className="bg-sage-100 text-sage-700 text-xs px-2 py-1 rounded">{i + 1}. {s} → {e}</span>;
                })}
              </div>
              <button onClick={removeLast} className="text-xs text-red-500 underline">Remove last</button>
            </div>
          )}
          {availableForStep.length > 0 && selectedIds.length < 20 && (
            <div>
              <p className="text-xs text-slate-400 mb-1">
                {selectedIds.length === 0 ? "Pick first transition:" :
                  `From ${asanaMap[transMap[selectedIds[selectedIds.length - 1]]?.end_asana_id]?.english_name || "?"}:`}
              </p>
              <div className="max-h-40 overflow-y-auto border border-sand-200 rounded p-2 space-y-1">
                {availableForStep.map((t) => {
                  const s = asanaMap[t.start_asana_id]?.english_name || "?";
                  const e = asanaMap[t.end_asana_id]?.english_name || "?";
                  return (
                    <button key={t.id} onClick={() => addTransition(t.id)}
                      className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-sage-50">
                      {s} → {e} <span className="text-xs text-slate-400 ml-2">Diff {t.difficulty_level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedIds.length >= 20 && <p className="text-xs text-amber-500">Maximum 20 transitions reached.</p>}
          <div className="flex items-center gap-2">
            <button onClick={create} disabled={submitting || !flowName.trim() || selectedIds.length < 2}
              className="bg-sage-500 text-white px-4 py-1 rounded text-sm disabled:opacity-50">
              {submitting ? "Creating..." : "Create Flow"}
            </button>
            {createStatus && <span className="text-xs text-slate-600">{createStatus}</span>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((f) => (
          <div key={f.id} className="bg-white rounded-xl border border-sand-100 p-4">
            <Link to={`/flows/${f.id}`} className="font-medium text-sage-700 hover:underline">{f.name}</Link>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-1">
              {f.transition_ids.map((tid, i) => {
                const t = transMap[tid];
                const s = t ? asanaMap[t.start_asana_id]?.english_name || "?" : "?";
                const e = t ? asanaMap[t.end_asana_id]?.english_name || "?" : "?";
                return (
                  <span key={tid}>
                    {i > 0 && <span className="text-slate-300">→</span>}
                    {t ? <Link to={`/transitions/${t.id}`} className="underline hover:text-sage-700">{s}→{e}</Link> : `#${tid}`}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">{f.transition_ids.length} transitions · Difficulty {f.difficulty_level}</p>
            <RankStars rank={f.rank} />
            {user?.role === "admin" && (
              <button onClick={() => { setConfirmTarget({ id: f.id, label: f.name }); setConfirmOpen(true); }}
                className="text-xs text-red-500 underline mt-1">Delete</button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Flow"
        message={`Are you sure you want to delete "${confirmTarget?.label}"? This cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />
    </div>
  );
}
