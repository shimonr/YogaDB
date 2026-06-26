import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../lib/auth";

const nav = [
  { to: "/", label: "Home" },
  { to: "/asanas", label: "Asanas" },
  { to: "/transitions", label: "Transitions" },
  { to: "/flows", label: "Flows" },
  { to: "/search", label: "Search" },
  { to: "/about", label: "About" },
];

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
              {collapsed ? item.label.charAt(0) : item.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink to="/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-sage-100">
              {collapsed ? "A" : "Admin"}
            </NavLink>
          )}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="bg-white border-b border-sand-100 p-4 flex justify-between">
          <span className="text-sm text-slate-600">Calm movement, clean data.</span>
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
