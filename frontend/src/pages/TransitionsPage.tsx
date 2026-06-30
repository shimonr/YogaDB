import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { RankStars } from "../components/RankStars";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../lib/auth";
import type { Asana, Transition } from "../lib/types";

export function TransitionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Transition[]>([]);
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [asanaMap, setAsanaMap] = useState<Record<number, Asana>>({});
  const [name, setName] = useState("");
  const [startAsanaId, setStartAsanaId] = useState<number>(0);
  const [endAsanaId, setEndAsanaId] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [editDifficulty, setEditDifficulty] = useState(2);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; label: string } | null>(null);

  const refresh = () =>
    api.get("/transitions/top").then((r) => setItems(r.data)).catch(() => setError("Failed to load transitions."));

  useEffect(() => {
    Promise.all([api.get("/transitions/top"), api.get("/asanas?limit=200")])
      .then(([transRes, asanaRes]) => {
        setItems(transRes.data);
        const rows = asanaRes.data as Asana[];
        setAsanas(rows);
        const map: Record<number, Asana> = {};
        rows.forEach((a) => { map[a.id] = a; });
        setAsanaMap(map);
        if (rows[0]?.id) setStartAsanaId(rows[0].id);
        if (rows[1]?.id) setEndAsanaId(rows[1].id);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!name.trim()) { setCreateStatus("Please enter a transition name."); return; }
    if (startAsanaId === endAsanaId) { setCreateStatus("Start and end pose must be different."); return; }
    setSubmitting(true);
    setCreateStatus("");
    try {
      await api.post("/transitions", {
        name: name.trim(), start_asana_id: startAsanaId, end_asana_id: endAsanaId,
        difficulty_level: difficulty, rank: 50,
      });
      setName(""); setCreateStatus("Transition created"); refresh();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setCreateStatus(typeof detail === "string" ? detail : "Failed to create transition.");
    } finally { setSubmitting(false); }
  };

  const update = async (id: number) => {
    if (!editName.trim() || editStart === editEnd) return;
    try {
      const t = items.find((x) => x.id === id);
      if (!t) return;
      await api.put(`/transitions/${id}`, {
        name: editName.trim(), start_asana_id: editStart, end_asana_id: editEnd,
        difficulty_level: editDifficulty, rank: t.rank,
      });
      setEditingId(null); refresh();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Update failed");
    }
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    try {
      await api.delete(`/transitions/${confirmTarget.id}`);
      setItems((prev) => prev.filter((x) => x.id !== confirmTarget.id));
    } catch { setError("Delete failed."); }
    setConfirmOpen(false); setConfirmTarget(null);
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Transitions (Top 10)</h1>

      {user?.role === "admin" && (
        <div className="bg-white rounded-xl border border-sand-100 p-4 space-y-2">
          <div className="grid md:grid-cols-4 gap-2">
            <input className="border border-sand-200 rounded px-3 py-2 md:col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Transition name (required)..." />
            <select className={`border rounded px-2 ${startAsanaId === endAsanaId ? "border-red-400" : "border-sand-200"}`} value={startAsanaId} onChange={(e) => setStartAsanaId(Number(e.target.value))}>
              {asanas.map((a) => <option key={`s-${a.id}`} value={a.id}>{a.english_name}</option>)}
            </select>
            <select className={`border rounded px-2 ${startAsanaId === endAsanaId ? "border-red-400" : "border-sand-200"}`} value={endAsanaId} onChange={(e) => setEndAsanaId(Number(e.target.value))}>
              {asanas.map((a) => <option key={`e-${a.id}`} value={a.id}>{a.english_name}</option>)}
            </select>
          </div>
          {startAsanaId === endAsanaId && <p className="text-xs text-red-500">Start and end pose must be different.</p>}
          <div className="flex items-center gap-2">
            <select className="border border-sand-200 rounded px-2 py-1 text-sm" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Difficulty {d}</option>)}
            </select>
            <button onClick={create} disabled={submitting || !name.trim() || startAsanaId === endAsanaId}
              className="bg-sage-500 text-white px-4 py-1 rounded text-sm disabled:opacity-50">
              {submitting ? "Creating..." : "Create"}
            </button>
            {createStatus && <span className="text-xs text-slate-600">{createStatus}</span>}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {items.map((t) => {
          const startName = asanaMap[t.start_asana_id]?.english_name || `#${t.start_asana_id}`;
          const endName = asanaMap[t.end_asana_id]?.english_name || `#${t.end_asana_id}`;
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} className="bg-white rounded-xl border border-sand-100 p-4">
              {isEditing ? (
                <div className="space-y-2">
                  <input className="border border-sand-200 rounded px-2 py-1 w-full text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="border border-sand-200 rounded px-2 py-1 text-sm" value={editStart} onChange={(e) => setEditStart(Number(e.target.value))}>
                      {asanas.map((a) => <option key={`es-${a.id}`} value={a.id}>{a.english_name}</option>)}
                    </select>
                    <select className="border border-sand-200 rounded px-2 py-1 text-sm" value={editEnd} onChange={(e) => setEditEnd(Number(e.target.value))}>
                      {asanas.map((a) => <option key={`ee-${a.id}`} value={a.id}>{a.english_name}</option>)}
                    </select>
                  </div>
                  {editStart === editEnd && <p className="text-xs text-red-500">Positions must differ.</p>}
                  <select className="border border-sand-200 rounded px-2 py-1 text-sm" value={editDifficulty} onChange={(e) => setEditDifficulty(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Difficulty {d}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => update(t.id)} disabled={editStart === editEnd || !editName.trim()}
                      className="text-xs bg-sage-500 text-white px-3 py-1 rounded disabled:opacity-50">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to={`/transitions/${t.id}`} className="font-medium text-sage-700 hover:underline">{t.name}</Link>
                  <p className="text-xs text-slate-500 mt-1">
                    <Link to={`/asanas/${t.start_asana_id}`} className="hover:text-sage-700 underline">{startName}</Link>
                    {" → "}
                    <Link to={`/asanas/${t.end_asana_id}`} className="hover:text-sage-700 underline">{endName}</Link>
                    <span className="text-slate-400 ml-2">· Difficulty {t.difficulty_level}</span>
                  </p>
                  <RankStars rank={t.rank} />
                  {user?.role === "admin" && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => {
                        setEditingId(t.id); setEditName(t.name); setEditStart(t.start_asana_id);
                        setEditEnd(t.end_asana_id); setEditDifficulty(t.difficulty_level);
                      }} className="text-xs text-sage-600 underline">Edit</button>
                      <button onClick={() => { setConfirmTarget({ id: t.id, label: t.name }); setConfirmOpen(true); }}
                        className="text-xs text-red-500 underline">Delete</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Transition"
        message={`Are you sure you want to delete "${confirmTarget?.label}"? This action cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />
    </div>
  );
}
