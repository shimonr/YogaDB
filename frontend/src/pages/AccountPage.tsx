import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

function errorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join(", ");
  return typeof detail === "string" ? detail : fallback;
}

export function AccountPage() {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return <Navigate to="/auth" replace />;

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);
    try {
      const { data } = await api.put("/auth/me", { email });
      updateUser(data);
      setEmailStatus({ ok: true, text: "Email updated." });
    } catch (err) {
      setEmailStatus({ ok: false, text: errorMessage(err, "Could not update email.") });
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, text: "The new passwords do not match." });
      return;
    }
    try {
      await api.post("/auth/me/password", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordStatus({ ok: true, text: "Password changed." });
    } catch (err) {
      setPasswordStatus({ ok: false, text: errorMessage(err, "Could not change password.") });
    }
  };

  const status = (s: { ok: boolean; text: string } | null) =>
    s && <p className={`text-sm ${s.ok ? "text-green-700" : "text-red-600"}`}>{s.text}</p>;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-sage-700">Account</h1>
      <p className="text-sm text-slate-600">
        Signed in as <span className="font-medium">{user.username}</span> ({user.role})
      </p>

      <form onSubmit={saveEmail} className="bg-white border border-sand-100 rounded-xl p-5 space-y-3">
        <h2 className="font-medium">Email</h2>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" className="w-full border rounded px-3 py-2" />
        {status(emailStatus)}
        <button className="bg-sage-500 text-white rounded px-4 py-2">Save email</button>
      </form>

      <form onSubmit={savePassword} className="bg-white border border-sand-100 rounded-xl p-5 space-y-3">
        <h2 className="font-medium">Change password</h2>
        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full border rounded px-3 py-2" />
        <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (at least 8 characters)" className="w-full border rounded px-3 py-2" />
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full border rounded px-3 py-2" />
        {status(passwordStatus)}
        <button className="bg-sage-500 text-white rounded px-4 py-2">Change password</button>
      </form>
    </div>
  );
}
