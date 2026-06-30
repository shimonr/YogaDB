import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Photo, Transition } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { photoFileUrl } from "../lib/photoUrl";

export function TransitionDetailPage() {
  const { id } = useParams();
  const [transition, setTransition] = useState<Transition | null>(null);
  const [startAsana, setStartAsana] = useState<Asana | null>(null);
  const [endAsana, setEndAsana] = useState<Asana | null>(null);
  const [startPhoto, setStartPhoto] = useState<Photo | null>(null);
  const [endPhoto, setEndPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/transitions/${id}`)
      .then(async (r) => {
        const t: Transition = r.data;
        setTransition(t);
        const [startRes, endRes, spRes, epRes] = await Promise.all([
          api.get(`/asanas/${t.start_asana_id}`),
          api.get(`/asanas/${t.end_asana_id}`),
          api.get(`/photos/by-asana/${t.start_asana_id}`),
          api.get(`/photos/by-asana/${t.end_asana_id}`),
        ]);
        setStartAsana(startRes.data);
        setEndAsana(endRes.data);
        const sp: Photo[] = spRes.data;
        const ep: Photo[] = epRes.data;
        sp.sort((a, b) => b.rank - a.rank);
        ep.sort((a, b) => b.rank - a.rank);
        setStartPhoto(sp[0] || null);
        setEndPhoto(ep[0] || null);
      })
      .catch(() => setError("Failed to load transition."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!transition) return <p className="text-red-600">Transition not found.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h1 className="text-2xl font-semibold">{transition.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Difficulty {transition.difficulty_level} / 5</p>
        <RankStars rank={transition.rank} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-sage-700">
            Start: <Link to={`/asanas/${transition.start_asana_id}`} className="underline hover:text-sage-500">{startAsana?.english_name || `#${transition.start_asana_id}`}</Link>
          </h2>
          {startAsana && <p className="text-sm text-slate-500">{startAsana.sanskrit_name}</p>}
          {startPhoto ? (
            <Link to={`/photos/${startPhoto.id}`}>
              <img src={photoFileUrl(startPhoto.id)} alt="" className="w-full aspect-square object-cover rounded-xl" />
            </Link>
          ) : (
            <div className="w-full aspect-square bg-slate-100 rounded-xl" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-sage-700">
            End: <Link to={`/asanas/${transition.end_asana_id}`} className="underline hover:text-sage-500">{endAsana?.english_name || `#${transition.end_asana_id}`}</Link>
          </h2>
          {endAsana && <p className="text-sm text-slate-500">{endAsana.sanskrit_name}</p>}
          {endPhoto ? (
            <Link to={`/photos/${endPhoto.id}`}>
              <img src={photoFileUrl(endPhoto.id)} alt="" className="w-full aspect-square object-cover rounded-xl" />
            </Link>
          ) : (
            <div className="w-full aspect-square bg-slate-100 rounded-xl" />
          )}
        </div>
      </div>
    </div>
  );
}
