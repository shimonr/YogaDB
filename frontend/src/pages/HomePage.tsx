import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, BookOpen, Gamepad2, Layers, Route, Search, Sparkles } from "lucide-react";
import { api, fetchAll } from "../lib/api";
import type { Asana } from "../lib/types";
import { photoFileUrl } from "../lib/photoUrl";
import { Lotus } from "../components/Lotus";

const sections = [
  { to: "/asanas", label: "Asanas", text: "Every pose with photos, Sanskrit names and benefits.", icon: Layers, tint: "from-lotus-200 to-lotus-100" },
  { to: "/transitions", label: "Transitions", text: "How to move from one pose to the next.", icon: ArrowRightLeft, tint: "from-lavender-200 to-lavender-100" },
  { to: "/flows", label: "Flows", text: "Sequences of transitions you can practice.", icon: Route, tint: "from-sage-200 to-sage-100" },
  { to: "/classes", label: "Classes", text: "Flows combined into a complete class.", icon: BookOpen, tint: "from-saffron-200 to-saffron-100" },
  { to: "/games", label: "Games", text: "Learn poses and Sanskrit names by playing.", icon: Gamepad2, tint: "from-teal-200 to-teal-100" },
  { to: "/search", label: "Search", text: "Filter by type, category, difficulty and rank.", icon: Search, tint: "from-sky-200 to-sky-100" },
];

export function HomePage() {
  const [top, setTop] = useState<Asana[]>([]);
  const [counts, setCounts] = useState<{ asanas: number; flows: number; classes: number } | null>(null);

  useEffect(() => {
    api.get<Asana[]>("/asanas/top", { params: { limit: 12 } })
      .then((r) => setTop(r.data.filter((a) => a.cover_photo_id).slice(0, 6)))
      .catch(() => {});
    Promise.all([fetchAll<Asana>("/asanas"), fetchAll("/flows"), fetchAll("/classes")])
      .then(([asanas, flows, classes]) => setCounts({ asanas: asanas.length, flows: flows.length, classes: classes.length }))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lotus-100 via-lavender-100 to-sage-100 p-8 md:p-12 shadow-soft">
        <Lotus className="absolute -right-10 -bottom-12 w-72 h-72 opacity-25 animate-breathe" />
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-lotus-600">
          <Sparkles size={16} /> Breathe · Move · Learn
        </p>
        <h1 className="mt-3 text-5xl md:text-6xl font-semibold">Welcome to Yoga DB</h1>
        <p className="mt-4 max-w-xl text-lg text-plum-700">
          Explore asanas, the transitions between them and flowing sequences. Rate what you love, learn the
          Sanskrit names and play your way into a steadier practice.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/asanas" className="btn-primary">Explore asanas</Link>
          <Link to="/games" className="btn-secondary">Play a game</Link>
        </div>
        {counts && (
          <dl className="mt-8 flex flex-wrap gap-8 text-plum-800">
            {[["Asanas", counts.asanas], ["Flows", counts.flows], ["Classes", counts.classes]].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-widest text-plum-600">{label}</dt>
                <dd className="text-3xl font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {top.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl font-bold text-plum-800">Top poses</h2>
            <Link to="/asanas" className="text-sm text-sage-700 hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {top.map((a) => (
              <Link key={a.id} to={`/asanas/${a.id}`} className="group">
                <div className="overflow-hidden rounded-2xl shadow-soft bg-white">
                  <img
                    src={photoFileUrl(a.cover_photo_id!, 400)}
                    alt={a.english_name}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-plum-800 leading-tight">{a.english_name}</p>
                <p className="text-xs text-slate-500">{a.sanskrit_name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ to, label, text, icon: Icon, tint }) => (
          <Link key={to} to={to} className="card card-hover p-5 flex gap-4 items-start">
            <span className={`shrink-0 rounded-2xl bg-gradient-to-br ${tint} p-3 text-plum-700`}>
              <Icon size={22} />
            </span>
            <span>
              <span className="block font-bold text-plum-800">{label}</span>
              <span className="block text-sm text-slate-600">{text}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
