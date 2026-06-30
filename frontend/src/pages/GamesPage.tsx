import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Asana, Photo } from "../lib/types";
import { photoFileUrl } from "../lib/photoUrl";

type GameType = "match_en" | "match_sa" | "name_sa_from_img" | "name_sa_from_en";

const GAMES: { type: GameType; label: string; desc: string }[] = [
  { type: "match_en", label: "Match the Pose (English)", desc: "Click an image, then click its English name" },
  { type: "match_sa", label: "Match the Pose (Sanskrit)", desc: "Click an image, then click its Sanskrit name" },
  { type: "name_sa_from_img", label: "Sanskrit from Image", desc: "See a pose image, pick the correct Sanskrit name" },
  { type: "name_sa_from_en", label: "Sanskrit from English", desc: "See an English name, pick the correct Sanskrit name" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

const isPlaceholder = (name: string) => /^asana\s+\d+/i.test(name.trim());

interface GameAsana {
  id: number;
  english_name: string;
  sanskrit_name: string;
  photoIds: number[];
}

export function GamesPage() {
  const { gameType } = useParams<{ gameType?: string }>();
  const navigate = useNavigate();
  const [allAsanas, setAllAsanas] = useState<GameAsana[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const selected = (gameType && GAMES.find((g) => g.type === gameType)?.type) || null;

  useEffect(() => {
    api.get("/asanas?limit=200").then(async (r) => {
      const asanas: Asana[] = r.data;
      const valid = asanas.filter(
        (a) => !isPlaceholder(a.english_name) && !isPlaceholder(a.sanskrit_name)
      );
      const withPhotos = await Promise.all(
        valid.map(async (a) => {
          try {
            const res = await api.get(`/photos/by-asana/${a.id}`);
            const photos: Photo[] = res.data;
            return { ...a, photoIds: photos.map((p) => p.id) };
          } catch {
            return { ...a, photoIds: [] as number[] };
          }
        })
      );
      setAllAsanas(withPhotos.filter((a) => a.photoIds.length > 0));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading asanas...</p>;

  if (!selected) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-sage-700 mb-4">Games</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          {GAMES.map((g) => (
            <button
              key={g.type}
              onClick={() => navigate(`/games/${g.type}`)}
              className="bg-white p-5 rounded-xl border border-sand-100 text-left hover:shadow-sm"
            >
              <h3 className="font-medium text-sage-700">{g.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-sage-700">{GAMES.find((g) => g.type === selected)?.label}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Score: {score}/{total}</span>
          <button onClick={() => { navigate("/games"); setScore(0); setTotal(0); }} className="text-sm text-sage-600 underline">
            Exit
          </button>
        </div>
      </div>
      {selected === "match_en" || selected === "match_sa" ? (
        <MatchGame asanas={allAsanas} mode={selected} onResult={(correct) => { setScore((s) => s + (correct ? 1 : 0)); setTotal((t) => t + 1); }} />
      ) : selected === "name_sa_from_img" ? (
        <SanskritFromImageGame asanas={allAsanas} onResult={(correct) => { setScore((s) => s + (correct ? 1 : 0)); setTotal((t) => t + 1); }} />
      ) : (
        <SanskritFromEnglishGame asanas={allAsanas} onResult={(correct) => { setScore((s) => s + (correct ? 1 : 0)); setTotal((t) => t + 1); }} />
      )}
    </div>
  );
}

function MatchGame({ asanas, mode, onResult }: { asanas: GameAsana[]; mode: "match_en" | "match_sa"; onResult: (correct: boolean) => void }) {
  const [round, setRound] = useState<{ images: GameAsana[]; labels: { id: number; text: string }[] } | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [done, setDone] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();

  const startRound = useCallback(() => {
    const pool = pickN(asanas, 4);
    setRound({
      images: pool,
      labels: shuffle(pool.map((a) => ({ id: a.id, text: mode === "match_en" ? a.english_name : a.sanskrit_name }))),
    });
    setSelectedImage(null);
    setMatched(new Set());
    setWrongPair(null);
    setDone(false);
  }, [asanas, mode]);

  useEffect(() => { if (asanas.length >= 4) startRound(); }, [startRound, asanas.length]);

  const handleLabelClick = (labelId: number) => {
    if (selectedImage === null || done || matched.has(labelId)) return;

    if (selectedImage === labelId) {
      const next = new Set(matched);
      next.add(labelId);
      setMatched(next);
      setSelectedImage(null);
      setWrongPair(null);

      if (next.size === 4) {
        setDone(true);
        onResult(true);
      }
    } else {
      setWrongPair([selectedImage, labelId]);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedImage(null);
      }, 800);
    }
  };

  if (!round) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {selectedImage !== null
          ? "Now click the matching name below."
          : "Click an image to start matching."}
      </p>
      <div className="grid grid-cols-4 gap-3">
        {round.images.map((a) => {
          const photoId = a.photoIds[0];
          const isMatched = matched.has(a.id);
          const isSelected = selectedImage === a.id;
          return (
            <button
              key={a.id}
              onClick={() => { if (!done && !isMatched) setSelectedImage(a.id); }}
              disabled={isMatched || done}
              className={`rounded-xl border-2 p-2 transition ${
                isMatched
                  ? "border-green-500 bg-green-50 opacity-60"
                  : isSelected
                  ? "border-blue-500 ring-2 ring-blue-300"
                  : "border-sand-100 hover:border-sage-400"
              }`}
            >
              {photoId ? (
                <img src={photoFileUrl(photoId)} alt="" className="w-full aspect-square object-cover rounded" />
              ) : (
                <div className="w-full aspect-square bg-slate-100 rounded" />
              )}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {round.labels.map((lb) => {
          const isMatched = matched.has(lb.id);
          const isWrong = wrongPair && wrongPair[1] === lb.id;
          const content = (
            <span className={`rounded-xl border-2 p-3 text-sm font-medium transition min-h-[60px] block ${
              isMatched
                ? "border-green-500 bg-green-50 opacity-60"
                : isWrong
                ? "border-red-500 bg-red-50 animate-pulse"
                : done
                ? "border-sand-100 hover:border-sage-400 cursor-pointer"
                : "border-sand-100 hover:border-sage-400"
            }`}>
              {lb.text}
            </span>
          );
          if (done) {
            return <Link key={lb.id} to={`/asanas/${lb.id}`}>{content}</Link>;
          }
          return (
            <button key={lb.id} onClick={() => handleLabelClick(lb.id)} disabled={isMatched || done}>
              {content}
            </button>
          );
        })}
      </div>
      {done && (
        <div className="flex items-center gap-3 mt-2">
          <span className="text-green-600 font-medium">All matched!</span>
          <button onClick={startRound} className="bg-sage-500 text-white px-4 py-2 rounded text-sm">Next Round</button>
        </div>
      )}
    </div>
  );
}

function SanskritFromImageGame({ asanas, onResult }: { asanas: GameAsana[]; onResult: (correct: boolean) => void }) {
  const [round, setRound] = useState<{ asana: GameAsana; options: { id: number; text: string }[] } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);

  const startRound = useCallback(() => {
    const target = asanas[Math.floor(Math.random() * asanas.length)];
    const distractors = pickN(asanas.filter((a) => a.id !== target.id), 3);
    setRound({
      asana: target,
      options: shuffle([target, ...distractors]).map((a) => ({ id: a.id, text: a.sanskrit_name })),
    });
    setPicked(null);
    setCorrect(false);
  }, [asanas]);

  useEffect(() => { if (asanas.length >= 4) startRound(); }, [startRound, asanas.length]);

  const handlePick = (id: number) => {
    if (picked !== null) return;
    setPicked(id);
    const isCorrect = id === round!.asana.id;
    setCorrect(isCorrect);
    onResult(isCorrect);
  };

  if (!round) return null;
  const photoId = round.asana.photoIds[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {photoId ? (
          <img src={photoFileUrl(photoId)} alt="" className="w-72 aspect-square object-cover rounded-xl" />
        ) : (
          <div className="w-72 aspect-square bg-slate-100 rounded-xl" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {round.options.map((opt) => {
          const isPicked = picked === opt.id;
          const isCorrectOpt = opt.id === round.asana.id;
          const btnClass = `rounded-xl border-2 p-4 text-sm font-medium transition ${
            picked !== null
              ? isPicked
                ? correct
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
                : isCorrectOpt
                ? "border-green-500 bg-green-50 opacity-60"
                : "opacity-50 border-sand-100"
              : "border-sand-100 hover:border-sage-400"
          }`;
          if (picked !== null) {
            return (
              <Link key={opt.id} to={`/asanas/${opt.id}`} className={btnClass}>
                {opt.text}
              </Link>
            );
          }
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} className={btnClass}>
              {opt.text}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex items-center gap-3">
          <span className={correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {correct ? "Correct!" : `Wrong — it's ${round.asana.sanskrit_name}`}
          </span>
          <button onClick={startRound} className="bg-sage-500 text-white px-4 py-2 rounded text-sm">Next</button>
        </div>
      )}
    </div>
  );
}

function SanskritFromEnglishGame({ asanas, onResult }: { asanas: GameAsana[]; onResult: (correct: boolean) => void }) {
  const [round, setRound] = useState<{ asana: GameAsana; options: { id: number; text: string }[] } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);

  const startRound = useCallback(() => {
    const target = asanas[Math.floor(Math.random() * asanas.length)];
    const distractors = pickN(asanas.filter((a) => a.id !== target.id), 3);
    setRound({
      asana: target,
      options: shuffle([target, ...distractors]).map((a) => ({ id: a.id, text: a.sanskrit_name })),
    });
    setPicked(null);
    setCorrect(false);
  }, [asanas]);

  useEffect(() => { if (asanas.length >= 4) startRound(); }, [startRound, asanas.length]);

  const handlePick = (id: number) => {
    if (picked !== null) return;
    setPicked(id);
    const isCorrect = id === round!.asana.id;
    setCorrect(isCorrect);
    onResult(isCorrect);
  };

  if (!round) return null;

  return (
    <div className="space-y-4">
      <div className="text-center text-2xl font-semibold text-sage-700 py-8">
        {round.asana.english_name}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {round.options.map((opt) => {
          const isPicked = picked === opt.id;
          const isCorrectOpt = opt.id === round.asana.id;
          const btnClass = `rounded-xl border-2 p-4 text-sm font-medium transition ${
            picked !== null
              ? isPicked
                ? correct
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
                : isCorrectOpt
                ? "border-green-500 bg-green-50 opacity-60"
                : "opacity-50 border-sand-100"
              : "border-sand-100 hover:border-sage-400"
          }`;
          if (picked !== null) {
            return (
              <Link key={opt.id} to={`/asanas/${opt.id}`} className={btnClass}>
                {opt.text}
              </Link>
            );
          }
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} className={btnClass}>
              {opt.text}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex items-center gap-3">
          <span className={correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {correct ? "Correct!" : `Wrong — it's ${round.asana.sanskrit_name}`}
          </span>
          <button onClick={startRound} className="bg-sage-500 text-white px-4 py-2 rounded text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
