import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Photo } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { useAuth } from "../lib/auth";
import { photoFileUrl } from "../lib/photoUrl";

export function AsanaDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [asana, setAsana] = useState<Asana | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [rank, setRank] = useState(50);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([api.get(`/asanas/${id}`), api.get(`/photos/by-asana/${id}`)])
      .then(([asanaRes, photosRes]) => {
        setAsana(asanaRes.data);
        setPhotos(photosRes.data);
      })
      .catch(() => setError("Failed to load asana details."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!asana) return <p className="text-red-600">Asana not found.</p>;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h1 className="text-2xl font-semibold">{asana.english_name}</h1>
        <p className="text-slate-500">{asana.sanskrit_name}</p>
        <p className="mt-2">{asana.benefits}</p>
        <RankStars rank={asana.rank} />
        <div className="mt-4 flex items-center gap-2">
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
            disabled={!user}
            className="bg-sage-500 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={async () => {
              if (!id) return;
              try {
                await api.post("/ranking/rank", { type: "asana", target_id: Number(id), rank });
                setStatus("Rank submitted");
                refresh();
              } catch {
                setStatus("Failed to rank");
              }
            }}
          >
            Submit Rank
          </button>
          {!user && <span className="text-xs text-slate-500">Login to rank</span>}
          {status && <span className="text-xs text-slate-600">{status}</span>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...photos]
          .sort((a, b) => b.rank - a.rank)
          .map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-sand-100 p-3">
              <img
                src={photoFileUrl(p.id)}
                alt=""
                className="w-full h-40 object-cover rounded"
              />
              <RankStars rank={p.rank} />
            </div>
          ))}
      </div>
    </div>
  );
}
