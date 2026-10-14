import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Home, Layers, ArrowRightLeft, Route, Gamepad2, Search,
  Info, Shield, BookOpen, Menu, X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/appConfig";
import { Lotus } from "./Lotus";

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
  account: "Account",
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
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const asanaIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "asanas");
    const transIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "transitions");
    const flowIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "flows");
    const classIds = parts.filter((p, i) => /^\d+$/.test(p) && parts[i - 1] === "classes");
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
    classIds.forEach((id) => {
      fetches.push(api.get(`/classes/${id}`).then((r) => { map[`classes:${id}`] = r.data.name; }).catch(() => {}));
    });
    photoIds.forEach((id) => {
      map[`photos:${id}`] = `Photo #${id}`;
    });

    Promise.all(fetches).then(() => setEntityNames(map)).catch(() => {});
  }, [location.pathname]);

  if (parts.length === 0) return null;

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
    } else if (prev === "classes" && /^\d+$/.test(part)) {
      label = entityNames[`classes:${part}`] || `#${part}`;
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
    <nav className="text-sm text-slate-500 flex items-center gap-1 flex-wrap pt-1">
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

function NavItems({ collapsed, isAdmin }: { collapsed: boolean; isAdmin: boolean }) {
  const items = isAdmin ? [...nav, { to: "/admin", label: "Admin", icon: Shield }] : nav;
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `block rounded-full px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-lotus-100 via-lavender-100 to-sage-100 text-plum-800 shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-plum-700"
            }`
          }
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
    </>
  );
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const config = useAppConfig();

  // Close the phone menu after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen md:flex">
      {config?.qa_mode && (
        <div className="fixed bottom-3 right-3 z-50 chip bg-saffron-300 text-plum-900 shadow-soft px-3 py-1">QA environment</div>
      )}
      {/* Phone: top bar with a menu button */}
      <div className="md:hidden bg-white/80 backdrop-blur border-b border-white sticky top-0 z-40">
        <div className="px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-plum-800">
            <Lotus className="w-7 h-7" /> Yoga DB
          </Link>
          <button
            className="p-1 text-sage-700"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="px-3 pb-3 space-y-1">
            <NavItems collapsed={false} isAdmin={isAdmin} />
          </nav>
        )}
      </div>

      {/* Tablet and desktop: collapsible sidebar */}
      <aside className={`hidden md:flex md:flex-col sticky top-0 h-screen bg-white/60 backdrop-blur border-r border-white ${collapsed ? "w-16" : "w-64"} transition-all`}>
        <div className={`p-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/" className={`flex items-center gap-2 font-display text-2xl font-semibold text-plum-800 ${collapsed ? "hidden" : ""}`}>
            <Lotus className="w-8 h-8" /> Yoga DB
          </Link>
          <button
            className="text-xs text-sage-700"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? ">>" : "<<"}
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <NavItems collapsed={collapsed} isAdmin={isAdmin} />
        </nav>
        {!collapsed && <p className="px-4 py-3 text-xs text-slate-400">v{import.meta.env.VITE_APP_VERSION}</p>}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="px-4 py-3 md:px-8 md:py-5 flex justify-between items-start gap-3">
          <Breadcrumbs />
          <div className="text-sm shrink-0 ml-auto">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/account" className="text-sage-700 hover:underline" title="Account settings">
                  {user.username}
                </Link>
                <button onClick={logout} className="btn-secondary px-4 py-1">
                  Logout
                </button>
              </div>
            ) : (
              <NavLink to="/auth" className="btn-primary px-3 py-1">
                Login
              </NavLink>
            )}
          </div>
        </header>
        <main className="px-4 pb-10 md:px-8 max-w-6xl animate-fade-up" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
