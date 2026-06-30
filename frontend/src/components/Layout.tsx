import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home, Layers, ArrowRightLeft, Route, Gamepad2, Search,
  Info, Shield, BookOpen, LogIn,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/asanas", label: "Asanas", icon: Layers },
  { to: "/transitions", label: "Transitions", icon: ArrowRightLeft },
  { to: "/flows", label: "Flows", icon: Route },
  { to: "/classes", label: "Classes", icon: BookOpen },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/search", label: "Search", icon: Search },
  { to: "/about", label: "About", icon: Info },
];

const staticLabels: Record<string, string> = {
  asanas: "Asanas",
  transitions: "Transitions",
  flows: "Flows",
  classes: "Classes",
  games: "Games",
  search: "Search",
  about: "About",
  admin: "Admin",
  auth: "Login",
};

const gameLabels: Record<string, string> = {
  match_en: "Match the Pose (English)",
  match_sa: "Match the Pose (Sanskrit)",
  name_sa_from_img: "Sanskrit from Image",
  name_sa_from_en: "Sanskrit from English",
};

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const asanaIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "asanas");
    const transIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "transitions");
    const flowIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "flows");
    const photoIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "photos");

    const fetches: Promise<void>[] = [];
    const map: Record<string, string> = {};

    asanaIds.forEach((id) => {
      fetches.push(api.get(`/asanas/${id}`).then((r) => { map[`asanas:${id}`] = r.data.english_name; }).catch(() => {}));
    });
    transIds.forEach((id) => {
      fetches.push(api.get(`/transitions/${id}`).then((r) => { map[`transitions:${id}`] = r.data.name; }).catch(() => {}));
    });
    flowIds.forEach((id) => {
      fetches.push(api.get(`/flows/${id}`).then((r) => { map[`flows:${id}`] = r.data.name; }).catch(() => {}));
    });
    photoIds.forEach((id) => {
      map[`photos:${id}`] = `Photo #${id}`;
    });

    Promise.all(fetches).then(() => setEntityNames(map)).catch(() => {});
  }, [location.pathname]);

  const crumbs: { label: string; to: string }[] = [];
  let path = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    path += "/" + part;
    const prev = parts[i - 1];

    let label: string;
    if (staticLabels[part]) {
      label = staticLabels[part];
    } else if (prev === "asanas" && /^\d+$/.test(part)) {
      label = entityNames[`asanas:${part}`] || `#${part}`;
    } else if (prev === "transitions" && /^\d+$/.test(part)) {
      label = entityNames[`transitions:${part}`] || `#${part}`;
    } else if (prev === "flows" && /^\d+$/.test(part)) {
      label = entityNames[`flows:${part}`] || `#${part}`;
    } else if (prev === "photos" && /^\d+$/.test(part)) {
      label = entityNames[`photos:${part}`] || `#${part}`;
    } else if (prev === "games" && gameLabels[part]) {
      label = gameLabels[part];
    } else {
      label = decodeURIComponent(part);
    }

    crumbs.push({ label, to: path });
  }

  return (
    <nav className="text-sm text-slate-500 mb-4 flex items-center gap-1 flex-wrap">
      <Link to="/" className="hover:text-sage-700">YogaDB</Link>
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex items-center gap-1">
          <span className="text-slate-300">&rsaquo;</span>
          {i < crumbs.length - 1 ? (
            <Link to={c.to} className="hover:text-sage-700">{c.label}</Link>
          ) : (
            <span className="text-slate-700 font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen md:flex">
      <aside className={`bg-white border-r border-sand-100 ${collapsed ? "w-16" : "w-60"} transition-all`}>
        <div className="p-4 border-b border-sand-100 flex justify-between items-center">
          <span className={`font-semibold text-sage-700 ${collapsed ? "hidden" : "inline"}`}>Yoga DB</span>
          <button className="text-xs text-sage-700" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? ">>" : "<<"}
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2 text-sm hover:bg-sage-100 transition-colors"
            >
              {collapsed ? (
                <div className="relative group flex justify-center">
                  <item.icon size={20} />
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <item.icon size={16} />
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink to="/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-sage-100">
              {collapsed ? (
                <div className="relative group flex justify-center">
                  <Shield size={20} />
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Admin
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield size={16} />
                  Admin
                </div>
              )}
            </NavLink>
          )}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="bg-white border-b border-sand-100 p-4 flex justify-between">
          <Breadcrumbs />
          <div className="text-sm">
            {user ? (
              <div className="flex items-center gap-3">
                <span>{user.username}</span>
                <button onClick={logout} className="bg-sage-500 text-white px-3 py-1 rounded">
                  Logout
                </button>
              </div>
            ) : (
              <NavLink to="/auth" className="bg-sage-500 text-white px-3 py-1 rounded">
                Login
              </NavLink>
            )}
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
