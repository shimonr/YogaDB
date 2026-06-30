import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Photo } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { photoFileUrl } from "../lib/photoUrl";

export function PhotoDetailPage() {
  const { id } = useParams();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [asana, setAsana] = useState<Asana | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/photos/${id}`)
      .then(async (pRes) => {
        const p: Photo = pRes.data;
        setPhoto(p);
        const aRes = await api.get(`/asanas/${p.asana_id}`).catch(() => null);
        if (aRes?.data) setAsana(aRes.data);
      })
      .catch(() => setError("Photo not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!photo) return <p className="text-red-600">Photo not found.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <img src={photoFileUrl(photo.id)} alt="" className="w-full aspect-square object-cover rounded-xl" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold">Photo #{photo.id}</h1>
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-400">Type:</span> {photo.type}</p>
              <p><span className="text-slate-400">Rank:</span> {photo.rank}</p>
              <p><span className="text-slate-400">Asana:</span>{" "}
                {asana ? <Link to={`/asanas/${asana.id}`} className="text-sage-700 underline hover:text-sage-500">{asana.english_name}</Link> : `#${photo.asana_id}`}
              </p>
              <p><span className="text-slate-400">Uploaded by:</span> {photo.user_id ? `User #${photo.user_id}` : "System import"}</p>
              {photo.original_url && (
                <p><span className="text-slate-400">Source:</span>{" "}
                  <a href={photo.original_url} target="_blank" rel="noopener noreferrer" className="text-sage-600 underline hover:text-sage-500">
                    View original
                  </a>
                </p>
              )}
            </div>
            <RankStars rank={photo.rank} />
            {asana && (
              <Link to={`/asanas/${asana.id}`} className="text-sm text-sage-600 underline hover:text-sage-500">
                ← Back to {asana.english_name}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
