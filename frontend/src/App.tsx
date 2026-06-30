import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminUserPage } from "./pages/AdminUserPage";
import { AsanaDetailPage } from "./pages/AsanaDetailPage";
import { AsanasPage } from "./pages/AsanasPage";
import { AuthPage } from "./pages/AuthPage";
import { FlowDetailPage } from "./pages/FlowDetailPage";
import { FlowsPage } from "./pages/FlowsPage";
import { ClassesPage } from "./pages/ClassesPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { GamesPage } from "./pages/GamesPage";
import { HomePage } from "./pages/HomePage";
import { PhotoDetailPage } from "./pages/PhotoDetailPage";
import { SearchPage } from "./pages/SearchPage";
import { TransitionDetailPage } from "./pages/TransitionDetailPage";
import { TransitionsPage } from "./pages/TransitionsPage";
import { useAuth } from "./lib/auth";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/asanas" element={<AsanasPage />} />
        <Route path="/asanas/:id" element={<AsanaDetailPage />} />
        <Route path="/transitions" element={<TransitionsPage />} />
        <Route path="/transitions/:id" element={<TransitionDetailPage />} />
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/flows/:id" element={<FlowDetailPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route path="/photos/:id" element={<PhotoDetailPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:gameType" element={<GamesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="/admin/user/:id" element={<AdminGuard><AdminUserPage /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
