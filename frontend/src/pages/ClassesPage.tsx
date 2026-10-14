import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fetchAll } from "../lib/api";
import type { Class, Flow } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../lib/auth";

export function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [selectedFlows, setSelectedFlows] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const refresh = () => {
    setLoading(true);
    Promise.all([fetchAll<Class>("/classes"), fetchAll<Flow>("/flows")])
      .then(([allClasses, allFlows]) => {
        setClasses(allClasses);
        setFlows(allFlows);
      })
      .catch(() => setStatus("Failed to load classes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || selectedFlows.length === 0) return;
    setStatus("");
    try {
      await api.post("/classes", {
        name: name.trim(),
        description,
        flow_ids: selectedFlows,
        difficulty_level: difficulty,
        rank: 50,
      });
      setName("");
      setDescription("");
      setSelectedFlows([]);
      setStatus("Class created");
      refresh();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setStatus(typeof detail === "string" ? detail : "Failed to create class.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/classes/${deleteId}`);
      setClasses((prev) => prev.filter((c) => c.id !== deleteId));
    } catch {
      setStatus("Delete failed.");
    }
    setDeleteId(null);
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Classes</h1>
      {status && <p className="text-sm text-slate-600" role="status">{status}</p>}
      {user?.role === "admin" && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Create Class</h2>
          <input
            placeholder="Class name"
            aria-label="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base px-3 py-1 w-full"
          />
          <textarea
            placeholder="Description (optional)"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-base px-3 py-1 w-full text-sm"
            rows={2}
          />
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="input-base px-3 py-1"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>Difficulty {d}</option>
            ))}
          </select>
          <div>
            <p className="text-sm text-slate-500 mb-1">Select flows ({selectedFlows.length} selected):</p>
            <div className="max-h-48 overflow-y-auto input-base p-2 space-y-1">
              {flows.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-sage-50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={selectedFlows.includes(f.id)}
                    onChange={(e) => {
                      setSelectedFlows((prev) =>
                        e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                      );
                    }}
                  />
                  {f.name} ({f.transition_ids.length} transitions)
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selectedFlows.length === 0}
            className="btn-primary px-4 py-1 disabled:opacity-50"
          >
            Create Class
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="card p-4">
            <Link to={`/classes/${cls.id}`} className="font-semibold text-sage-700 hover:underline">
              {cls.name}
            </Link>
            {cls.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{cls.description}</p>
            )}
            <div className="mt-2 text-xs text-slate-400">
              {cls.flow_ids.length} flows | Difficulty {cls.difficulty_level}/5
            </div>
            <RankStars rank={cls.rank} />
            {user?.role === "admin" && (
              <button
                onClick={() => setDeleteId(cls.id)}
                aria-label={`Delete ${cls.name}`}
                className="text-red-500 text-xs mt-2 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Confirm Deletion"
        message="Are you sure you want to delete this class?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
