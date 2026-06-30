import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Class, Flow, Transition, Asana } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { useAuth } from "../lib/auth";

export function ClassDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cls, setCls] = useState<Class | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [asanas, setAsanas] = useState<Asana[]>([]);
  const [rank, setRank] = useState(50);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/classes/${id}`),
      api.get("/flows?limit=200"),
      api.get("/transitions?limit=200"),
      api.get("/asanas?limit=300"),
    ])
      .then(([clsRes, flowRes, transRes, asanaRes]) => {
        setCls(clsRes.data);
        setFlows(flowRes.data);
        setTransitions(transRes.data);
        setAsanas(asanaRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!cls) return <p className="text-red-600">Class not found.</p>;

  const flowMap = Object.fromEntries(flows.map((f) => [f.id, f]));
  const transMap = Object.fromEntries(transitions.map((t) => [t.id, t]));
  const asanaMap = Object.fromEntries(asanas.map((a) => [a.id, a]));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h1 className="text-2xl font-semibold">{cls.name}</h1>
        {cls.description && <p className="text-slate-500 mt-1">{cls.description}</p>}
        <div className="mt-2 text-sm text-slate-400">
          Difficulty {cls.difficulty_level}/5 | {cls.flow_ids.length} flows
        </div>
        <RankStars rank={cls.rank} />
        {user && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={rank}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRank(isNaN(v) ? 50 : Math.min(100, Math.max(1, v)));
              }}
              className="border rounded px-2 py-1 w-24"
            />
            <button
              className="bg-sage-500 text-white px-3 py-1 rounded"
              onClick={async () => {
                try {
                  await api.post("/ranking/rank", { type: "class", target_id: Number(id), rank });
                  setStatus("Rank submitted");
                  refresh();
                } catch (err: any) {
                  setStatus("Failed to rank.");
                }
              }}
            >
              Submit Rank
            </button>
            {status && <span className="text-xs text-slate-600">{status}</span>}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {cls.flow_ids.map((flowId, idx) => {
          const flow = flowMap[flowId];
          if (!flow) return null;
          return (
            <div key={flowId} className="bg-white rounded-xl border border-sand-100 p-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-mono">{idx + 1}.</span>
                <Link to={`/flows/${flow.id}`} className="font-medium text-sage-700 hover:underline">
                  {flow.name}
                </Link>
                <span className="text-xs text-slate-400">
                  ({flow.transition_ids.length} transitions, Difficulty {flow.difficulty_level}/5)
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {flow.transition_ids.map((tId) => {
                  const t = transMap[tId];
                  if (!t) return null;
                  const start = asanaMap[t.start_asana_id];
                  const end = asanaMap[t.end_asana_id];
                  return (
                    <span key={tId} className="text-xs bg-sage-50 text-sage-700 px-2 py-0.5 rounded">
                      {start?.english_name || "?"} &rarr; {end?.english_name || "?"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
