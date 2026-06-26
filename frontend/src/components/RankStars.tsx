export function RankStars({ rank }: { rank: number }) {
  const stars = Math.max(1, Math.min(5, Math.round(rank / 20)));
  return (
    <div className="text-amber-500 text-sm" title={`Rank ${rank}/100`}>
      {"★".repeat(stars)}
      <span className="text-slate-400 ml-1">({rank})</span>
    </div>
  );
}
