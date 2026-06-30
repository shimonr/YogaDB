import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
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

  const refresh = () => {
    setLoading(true);
    Promise.all([api.get("/classes?limit=50"), api.get("/flows?limit=200")])
      .then(([clsRes, flowRes]) => {
        setClasses(clsRes.data);
        setFlows(flowRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || selectedFlows.length === 0) return;
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
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/classes/${deleteId}`);
    setDeleteId(null);
    refresh();
  };

  const flowNameMap = Object.fromEntries(flows.map((f) => [f.id, f.name]));

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {user?.role === "admin" && (
        <div className="bg-white rounded-xl border border-sand-100 p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Create Class</h2>
          <input
            placeholder="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-1 w-full"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border rounded px-3 py-1 w-full text-sm"
            rows={2}
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="border rounded px-3 py-1"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>Difficulty {d}</option>
            ))}
          </select>
          <div>
            <p className="text-sm text-slate-500 mb-1">Select flows ({selectedFlows.length} selected):</p>
            <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
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
            className="bg-sage-500 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            Create Class
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl border border-sand-100 p-4">
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
