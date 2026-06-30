import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Photo } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { PhotoUpload } from "../components/PhotoUpload";
import { useAuth } from "../lib/auth";
import { photoFileUrl } from "../lib/photoUrl";

function PhotoCard({ photo, user, onRanked }: { photo: Photo; user: any; onRanked: () => void }) {
  const [photoRank, setPhotoRank] = useState(50);
  const [photoStatus, setPhotoStatus] = useState("");

  return (
    <div className="bg-white rounded-xl border border-sand-100 p-3">
      <Link to={`/photos/${photo.id}`}>
        <img
          src={photoFileUrl(photo.id)}
          alt=""
          className="w-full aspect-square object-cover rounded hover:opacity-90 transition"
        />
      </Link>
      <RankStars rank={photo.rank} />
      {photo.original_url && (
        <a
          href={photo.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sage-600 underline mt-1 block"
        >
          Link to original
        </a>
      )}
      {user && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={photoRank}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPhotoRank(isNaN(v) ? 50 : Math.min(100, Math.max(1, v)));
            }}
            className="border rounded px-2 py-1 w-20 text-sm"
          />
          <button
            className="bg-sage-500 text-white px-2 py-1 rounded text-sm"
            onClick={async () => {
              try {
                await api.post("/ranking/rank", { type: "photo", target_id: photo.id, rank: photoRank });
                setPhotoStatus("Ranked");
                onRanked();
              } catch (err: any) {
                const detail = err?.response?.data?.detail;
                setPhotoStatus(typeof detail === "string" ? detail : "Failed to rank.");
              }
            }}
          >
            Rank
          </button>
          {photoStatus && <span className="text-xs text-slate-500">{photoStatus}</span>}
        </div>
      )}
    </div>
  );
}

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

  const fields = [
    { label: "English Name", value: asana.english_name },
    { label: "Sanskrit Name", value: asana.sanskrit_name },
    { label: "Alt Name 1", value: asana.alt_name_1 },
    { label: "Alt Name 2", value: asana.alt_name_2 },
    { label: "Type", value: asana.type },
    { label: "Category", value: asana.category },
    { label: "Difficulty", value: `${asana.difficulty_level} / 5` },
    { label: "Classic Pose", value: asana.is_classic ? "Yes" : "No" },
    { label: "Benefits", value: asana.benefits },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h1 className="text-2xl font-semibold">{asana.english_name}</h1>
        <p className="text-slate-500 text-lg">{asana.sanskrit_name}</p>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {fields.map((f) =>
            f.value ? (
              <div key={f.label}>
                <span className="text-slate-400">{f.label}:</span>{" "}
                <span className="text-slate-700">{f.value}</span>
              </div>
            ) : null,
          )}
        </div>

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
              } catch (err: any) {
                const detail = err?.response?.data?.detail;
                setStatus(typeof detail === "string" ? detail : "Failed to rank.");
              }
            }}
          >
            Submit Rank
          </button>
          {!user && <span className="text-xs text-slate-500">Login to rank</span>}
          {status && <span className="text-xs text-slate-600">{status}</span>}
        </div>
      </div>
      {user && <PhotoUpload asanaId={Number(id)} onUploaded={refresh} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...photos]
          .sort((a, b) => b.rank - a.rank)
          .map((p) => (
            <PhotoCard key={p.id} photo={p} user={user} onRanked={refresh} />
          ))}
      </div>
    </div>
  );
}
