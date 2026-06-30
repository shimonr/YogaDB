import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Flow, Transition, Asana, Photo } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { photoFileUrl } from "../lib/photoUrl";

interface StepData {
  transition: Transition | null;
  startAsana: Asana | null;
  endAsana: Asana | null;
  startPhoto: Photo | null;
  endPhoto: Photo | null;
}

export function FlowDetailPage() {
  const { id } = useParams();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/flows/${id}`)
      .then(async (flowRes) => {
        const f: Flow = flowRes.data;
        setFlow(f);

        const [transRes, asanaRes] = await Promise.all([
          api.get("/transitions?limit=200"),
          api.get("/asanas?limit=200"),
        ]);
        const tMap: Record<number, Transition> = {};
        (transRes.data as Transition[]).forEach((t) => { tMap[t.id] = t; });
        const aMap: Record<number, Asana> = {};
        (asanaRes.data as Asana[]).forEach((a) => { aMap[a.id] = a; });

        const built: StepData[] = [];
        for (const tid of f.transition_ids) {
          const t = tMap[tid] || null;
          const startA = t ? aMap[t.start_asana_id] || null : null;
          const endA = t ? aMap[t.end_asana_id] || null : null;

          let sp: Photo | null = null;
          let ep: Photo | null = null;
          if (startA) {
            const spRes = await api.get(`/photos/by-asana/${startA.id}`).catch(() => null);
            if (spRes?.data?.length) {
              const photos: Photo[] = spRes.data;
              photos.sort((a, b) => b.rank - a.rank);
              sp = photos[0];
            }
          }
          if (endA) {
            const epRes = await api.get(`/photos/by-asana/${endA.id}`).catch(() => null);
            if (epRes?.data?.length) {
              const photos: Photo[] = epRes.data;
              photos.sort((a, b) => b.rank - a.rank);
              ep = photos[0];
            }
          }

          built.push({ transition: t, startAsana: startA, endAsana: endA, startPhoto: sp, endPhoto: ep });
        }
        setSteps(built);
      })
      .catch(() => setError("Failed to load flow."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!flow) return <p className="text-red-600">Flow not found.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h1 className="text-2xl font-semibold">{flow.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{flow.transition_ids.length} transitions · Difficulty {flow.difficulty_level}</p>
        <RankStars rank={flow.rank} />
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i}>
            {step.startPhoto ? (
              <Link to={`/photos/${step.startPhoto.id}`}>
                <img src={photoFileUrl(step.startPhoto.id)} alt="" className="w-48 h-48 object-cover rounded-xl mx-auto" />
              </Link>
            ) : step.startAsana ? (
              <Link to={`/asanas/${step.startAsana.id}`}>
                <div className="w-48 h-48 bg-slate-100 rounded-xl mx-auto flex items-center justify-center text-slate-400 text-sm">
                  {step.startAsana.english_name}
                </div>
              </Link>
            ) : (
              <div className="w-48 h-48 bg-slate-100 rounded-xl mx-auto" />
            )}

            {step.transition && (
              <div className="text-center py-2">
                <Link to={`/transitions/${step.transition.id}`} className="text-sm font-medium text-sage-700 hover:underline">
                  {step.transition.name}
                </Link>
                <span className="text-xs text-slate-400 ml-2">Diff {step.transition.difficulty_level}</span>
              </div>
            )}
          </div>
        ))}

        {steps.length > 0 && (() => {
          const last = steps[steps.length - 1];
          return last.endPhoto ? (
            <Link to={`/photos/${last.endPhoto.id}`}>
              <img src={photoFileUrl(last.endPhoto.id)} alt="" className="w-48 h-48 object-cover rounded-xl mx-auto" />
            </Link>
          ) : last.endAsana ? (
            <Link to={`/asanas/${last.endAsana.id}`}>
              <div className="w-48 h-48 bg-slate-100 rounded-xl mx-auto flex items-center justify-center text-slate-400 text-sm">
                {last.endAsana.english_name}
              </div>
            </Link>
          ) : null;
        })()}
      </div>
    </div>
  );
}
