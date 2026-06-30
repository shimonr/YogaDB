import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { User } from "../lib/types";

const ENTITY_ROUTES: Record<string, (id: number) => string> = {
  asana: (id) => `/asanas/${id}`,
  photo: (id) => `/photos/${id}`,
  flow: (id) => `/flows/${id}`,
  transition: (id) => `/transitions/${id}`,
  class: (id) => `/classes/${id}`,
};

export function AdminUserPage() {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get("/users").then((r) => r.data.find((u: User) => u.id === Number(id))),
      api.get(`/admin/activity-logs?user_id=${id}&per_page=50`),
    ])
      .then(([u, l]) => { setUser(u); setLogs(l.data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!user) return <p className="text-red-600">User not found.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <Link to="/admin" className="text-sm text-sage-600 hover:underline">&larr; Back to Admin</Link>
        <h1 className="text-2xl font-semibold mt-2">{user.username}</h1>
        <div className="mt-2 space-y-1 text-sm">
          <p><span className="text-slate-400">Email:</span> {user.email}</p>
          <p><span className="text-slate-400">Role:</span> <span className="bg-sage-100 text-sage-700 px-2 py-0.5 rounded">{user.role}</span></p>
          <p><span className="text-slate-400">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h2 className="text-lg font-medium mb-3">Activity Log ({logs.length} recent entries)</h2>
        {logs.length === 0 ? (
          <p className="text-slate-400 text-sm">No activity recorded.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm border-b border-sand-100 pb-2">
                <span className="text-slate-400 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</span>
                <span className="font-medium">{l.action}</span>
                <span>{l.entity_type}</span>
                {l.entity_id != null && ENTITY_ROUTES[l.entity_type] ? (
                  <Link to={ENTITY_ROUTES[l.entity_type](l.entity_id)} className="text-sage-700 hover:underline">
                    #{l.entity_id}
                  </Link>
                ) : l.entity_id != null ? (
                  <span>#{l.entity_id}</span>
                ) : null}
                {l.ip_address && <span className="text-slate-400 text-xs">{l.ip_address}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
