import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fetchAll } from "../lib/api";
import type { Flow, Transition, Asana } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { photoFileUrl } from "../lib/photoUrl";

interface StepData {
  transition: Transition | null;
  startAsana: Asana | null;
  endAsana: Asana | null;
  startPhotoId: number | null;
  endPhotoId: number | null;
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

        const [transitions, asanas] = await Promise.all([
          fetchAll<Transition>("/transitions"),
          fetchAll<Asana>("/asanas"),
        ]);
        const tMap: Record<number, Transition> = {};
        transitions.forEach((t) => { tMap[t.id] = t; });
        const aMap: Record<number, Asana> = {};
        asanas.forEach((a) => { aMap[a.id] = a; });

        const built: StepData[] = [];
        for (const tid of f.transition_ids) {
          const t = tMap[tid] || null;
          const startA = t ? aMap[t.start_asana_id] || null : null;
          const endA = t ? aMap[t.end_asana_id] || null : null;

          built.push({
            transition: t,
            startAsana: startA,
            endAsana: endA,
            startPhotoId: startA?.cover_photo_id ?? null,
            endPhotoId: endA?.cover_photo_id ?? null,
          });
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
      <div className="card p-5">
        <h1 className="text-2xl font-semibold">{flow.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{flow.transition_ids.length} transitions · Difficulty {flow.difficulty_level}</p>
        <RankStars rank={flow.rank} />
      </div>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i}>
            {step.startPhotoId ? (
              <Link to={`/photos/${step.startPhotoId}`}>
                <img src={photoFileUrl(step.startPhotoId, 400)} alt="" className="w-48 h-48 object-cover rounded-xl mx-auto" />
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
          return last.endPhotoId ? (
            <Link to={`/photos/${last.endPhotoId}`}>
              <img src={photoFileUrl(last.endPhotoId, 400)} alt="" className="w-48 h-48 object-cover rounded-xl mx-auto" />
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
