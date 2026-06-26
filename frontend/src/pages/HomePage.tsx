export function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-sage-700">Welcome to Yoga DB</h1>
      <p className="text-slate-700 max-w-2xl">
        Explore asanas, transitions, and flows with ranking and community-powered contributions.
      </p>
      <div className="bg-white rounded-xl border border-sand-100 p-5">
        <h2 className="font-medium mb-2">What you can do</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Browse top asanas and full asana catalog.</li>
          <li>Discover transition and flow sequences.</li>
          <li>Rate items on a 1-100 scale displayed as stars.</li>
          <li>Use search to filter content quickly.</li>
        </ul>
      </div>
    </div>
  );
}
