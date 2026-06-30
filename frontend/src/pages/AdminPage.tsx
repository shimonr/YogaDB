import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Asana, Flow, Photo, Transition, User } from "../lib/types";

type Tab = "overview" | "ranking-log" | "activity-log" | "db-browser" | "sql-query";

function OverviewTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ label: string; fn: () => Promise<void> } | null>(null);

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
      .finally(() => setLoading(false));
  }, []);

  const askDelete = (label: string, fn: () => Promise<void>) => {
    setConfirmTarget({ label, fn }); setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    try { await confirmTarget.fn(); } catch {}
    setConfirmOpen(false); setConfirmTarget(null);
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Users</h2>
      <div className="bg-white rounded-xl border border-sand-100 max-h-72 overflow-auto">
        {users.map((u) => (
          <div key={u.id} className="border-b last:border-b-0 p-3 flex justify-between">
            <span>{u.username} ({u.role})</span>
            <button className="text-red-600 text-sm"
              onClick={() => askDelete(u.username, async () => {
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
              onClick={() => askDelete(a.english_name, async () => {
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
              onClick={() => askDelete(t.name, async () => {
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
              onClick={() => askDelete(f.name, async () => {
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
              onClick={() => askDelete(`photo #${p.id}`, async () => {
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

function RankingLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/ranking-logs?page=${page}&per_page=50`)
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <div className="bg-white rounded-xl border border-sand-100 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-sage-50 sticky top-0">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">User ID</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Target</th>
              <th className="text-left p-2">Old</th>
              <th className="text-left p-2">New</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-b-0">
                <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.user_id}</td>
                <td className="p-2">{l.type}</td>
                <td className="p-2">{l.target_id}</td>
                <td className="p-2">{l.old_rank ?? "-"}</td>
                <td className="p-2">{l.new_rank}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="p-3 text-center text-slate-400">No ranking logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 mt-3">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Prev</button>
        <span className="text-sm text-slate-500 py-1">Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={logs.length < 50} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function ActivityLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: "50" });
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity_type", entityFilter);
    api.get(`/admin/activity-logs?${params}`)
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter]);

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm">
          <option value="">All actions</option>
          <option value="rank">Rank</option>
          <option value="upload">Upload</option>
          <option value="delete">Delete</option>
          <option value="create">Create</option>
          <option value="login">Login</option>
          <option value="register">Register</option>
        </select>
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm">
          <option value="">All entities</option>
          <option value="asana">Asana</option>
          <option value="photo">Photo</option>
          <option value="flow">Flow</option>
          <option value="transition">Transition</option>
          <option value="class">Class</option>
          <option value="user">User</option>
        </select>
      </div>
      <div className="bg-white rounded-xl border border-sand-100 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-sage-50 sticky top-0">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">User</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Entity</th>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Details</th>
              <th className="text-left p-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-b-0">
                <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.user_id ?? "-"}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">{l.entity_type}</td>
                <td className="p-2">{l.entity_id ?? "-"}</td>
                <td className="p-2 max-w-[200px] truncate">{l.details ?? "-"}</td>
                <td className="p-2">{l.ip_address ?? "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={7} className="p-3 text-center text-slate-400">No activity logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2 mt-3">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Prev</button>
        <span className="text-sm text-slate-500 py-1">Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={logs.length < 50} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function DBBrowserTab() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    api.get("/admin/tables").then((r) => { setTables(r.data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTableLoading(true);
    api.get(`/admin/table/${selected}?page=${page}&per_page=50`)
      .then((r) => { setColumns(r.data.columns); setRows(r.data.rows); setTotal(r.data.total); })
      .finally(() => setTableLoading(false));
  }, [selected, page]);

  if (loading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <select value={selected} onChange={(e) => { setSelected(e.target.value); setPage(1); }} className="border rounded px-3 py-1 mb-3">
        <option value="">Select a table...</option>
        {tables.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {selected && (
        <>
          <p className="text-sm text-slate-500 mb-2">{total} total rows</p>
          {tableLoading ? <p className="text-slate-500">Loading...</p> : (
            <div className="bg-white rounded-xl border border-sand-100 overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-sage-50 sticky top-0">
                  <tr>{columns.map((c) => <th key={c} className="text-left p-2 font-medium">{c}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      {columns.map((c) => <td key={c} className="p-2 max-w-[200px] truncate">{String(r[c] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-center gap-2 mt-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="text-sm text-slate-500 py-1">Page {page} of {Math.ceil(total / 50)}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total} className="text-sm px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

function SQLQueryTab() {
  const [sql, setSql] = useState("SELECT * FROM asanas LIMIT 10");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true); setError(""); setColumns([]); setRows([]);
    try {
      const r = await api.post("/admin/query", { sql });
      setColumns(r.data.rows.length > 0 ? Object.keys(r.data.rows[0]) : []);
      setRows(r.data.rows);
      setCount(r.data.count);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Query failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        className="w-full border rounded p-3 font-mono text-sm h-32"
        placeholder="Enter a SELECT query..."
      />
      <button
        onClick={handleRun}
        disabled={running || !sql.trim().toUpperCase().startsWith("SELECT")}
        className="mt-2 bg-sage-500 text-white px-4 py-1 rounded disabled:opacity-50"
      >
        {running ? "Running..." : "Execute"}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {rows.length > 0 && (
        <>
          <p className="text-sm text-slate-500 mt-3">{count} rows returned</p>
          <div className="bg-white rounded-xl border border-sand-100 overflow-auto max-h-96 mt-2">
            <table className="w-full text-sm">
              <thead className="bg-sage-50 sticky top-0">
                <tr>{columns.map((c) => <th key={c} className="text-left p-2 font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    {columns.map((c) => <td key={c} className="p-2 max-w-[200px] truncate">{String(r[c] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "ranking-log", label: "Ranking Log" },
    { id: "activity-log", label: "Activity Log" },
    { id: "db-browser", label: "DB Browser" },
    { id: "sql-query", label: "SQL Query" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Admin Panel</h1>

      <div className="flex gap-1 border-b border-sand-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-sage-500 text-sage-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "ranking-log" && <RankingLogTab />}
      {tab === "activity-log" && <ActivityLogTab />}
      {tab === "db-browser" && <DBBrowserTab />}
      {tab === "sql-query" && <SQLQueryTab />}
    </div>
  );
}
