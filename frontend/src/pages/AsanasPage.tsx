import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fetchAll } from "../lib/api";
import type { Asana } from "../lib/types";
import { RankStars } from "../components/RankStars";
import { photoFileUrl } from "../lib/photoUrl";
import { chipColor, prettyLabel } from "../lib/categoryColors";

export function AsanasPage() {
  const [top, setTop] = useState<Asana[]>([]);
  const [all, setAll] = useState<Asana[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/asanas/top"), fetchAll<Asana>("/asanas")])
      .then(([topRes, allAsanas]) => {
        setTop(topRes.data);
        setAll(allAsanas);
      })
      .catch(() => setError("Failed to load asanas."))
      .finally(() => setLoading(false));
  }, []);

  const list = showAll ? all : top;
  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-sage-700">Asanas</h1>
        <button className="text-sm btn-primary px-3 py-1" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show Top 10" : "View All"}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => (
          <Link key={a.id} to={`/asanas/${a.id}`} className="card card-hover p-3 group">
            {a.cover_photo_id && (
              <div className="overflow-hidden rounded-xl mb-3">
                <img
                  src={photoFileUrl(a.cover_photo_id, 600)}
                  alt={a.english_name}
                  loading="lazy"
                  className="w-full aspect-square object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
            )}
            <div className="px-1 pb-1">
              <h3 className="font-bold text-plum-800">{a.english_name}</h3>
              <p className="text-sm text-slate-500 italic">{a.sanskrit_name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`chip ${chipColor(a.type)}`}>{prettyLabel(a.type)}</span>
                <span className={`chip ${chipColor(a.category)}`}>{prettyLabel(a.category)}</span>
              </div>
              <RankStars rank={a.rank} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
