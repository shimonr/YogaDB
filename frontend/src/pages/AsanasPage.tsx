import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana } from "../lib/types";
import { RankStars } from "../components/RankStars";

export function AsanasPage() {
  const [top, setTop] = useState<Asana[]>([]);
  const [all, setAll] = useState<Asana[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/asanas/top"), api.get("/asanas")])
      .then(([topRes, allRes]) => {
        setTop(topRes.data);
        setAll(allRes.data);
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
        <button className="text-sm bg-sage-500 text-white px-3 py-1 rounded" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show Top 10" : "View All"}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => (
          <Link key={a.id} to={`/asanas/${a.id}`} className="bg-white p-4 rounded-xl border border-sand-100 hover:shadow-sm">
            <h3 className="font-medium">{a.english_name}</h3>
            <p className="text-sm text-slate-500">{a.sanskrit_name}</p>
            <p className="text-xs mt-1">{a.type} - {a.category}</p>
            <RankStars rank={a.rank} />
          </Link>
        ))}
      </div>
    </div>
  );
}
