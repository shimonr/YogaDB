import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { AsanaDetailPage } from "./pages/AsanaDetailPage";
import { AsanasPage } from "./pages/AsanasPage";
import { AuthPage } from "./pages/AuthPage";
import { FlowsPage } from "./pages/FlowsPage";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
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
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
