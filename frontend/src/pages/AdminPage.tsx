import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Asana, Flow, Photo, Transition, User } from "../lib/types";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: number | string; label: string; fn: () => Promise<void> } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/users"), api.get("/asanas?limit=200"),
      api.get("/transitions?limit=200"), api.get("/flows?limit=200"),
      api.get("/photos?limit=200"),
    ])
      .then(([u, a, t, f, p]) => {
        setUsers(u.data); setAsanas(a.data); setTransitions(t.data);
        setFlows(f.data); setPhotos(p.data);
      })
      .catch(() => setError("Failed to load admin data."))
      .finally(() => setLoading(false));
  }, []);

  const askDelete = (id: number | string, label: string, fn: () => Promise<void>) => {
    setConfirmTarget({ id, label, fn }); setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    try { await confirmTarget.fn(); } catch { setError("Delete failed."); }
    setConfirmOpen(false); setConfirmTarget(null);
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-sage-700">Admin Panel</h1>

      <h2 className="text-lg font-medium">Users</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {users.map((u) => (
          <div key={u.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <span>{u.username} ({u.role})</span>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(u.id, u.username, async () => {
                await api.delete(`/users/${u.id}`); setUsers((p) => p.filter((x) => x.id !== u.id));
              })}>Delete</button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">Asanas</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {asanas.map((a) => (
          <div key={a.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <Link to={`/asanas/${a.id}`} className="text-sage-700 hover:underline">{a.english_name}</Link>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(a.id, a.english_name, async () => {
                await api.delete(`/asanas/${a.id}`); setAsanas((p) => p.filter((x) => x.id !== a.id));
              })}>Delete</button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">Transitions</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {transitions.map((t) => (
          <div key={t.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <Link to={`/transitions/${t.id}`} className="text-sage-700 hover:underline">{t.name}</Link>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(t.id, t.name, async () => {
                await api.delete(`/transitions/${t.id}`); setTransitions((p) => p.filter((x) => x.id !== t.id));
              })}>Delete</button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">Flows</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {flows.map((f) => (
          <div key={f.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <Link to={`/flows/${f.id}`} className="text-sage-700 hover:underline">{f.name}</Link>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(f.id, f.name, async () => {
                await api.delete(`/flows/${f.id}`); setFlows((p) => p.filter((x) => x.id !== f.id));
              })}>Delete</button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-medium">Photos</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {photos.map((p) => (
          <div key={p.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <Link to={`/photos/${p.id}`} className="text-sage-700 hover:underline">#{p.id} asana={p.asana_id} ({p.type})</Link>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(p.id, `photo #${p.id}`, async () => {
                await api.delete(`/photos/${p.id}`); setPhotos((prev) => prev.filter((x) => x.id !== p.id));
              })}>Delete</button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${confirmTarget?.label}"? This action cannot be undone.`}
        onConfirm={doDelete}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />
    </div>
  );
}
