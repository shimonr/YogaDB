import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(", ") : detail || "Could not reset the password.");
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Choose a new password</h1>
      {!token ? (
        <p className="text-sm">This page needs the link from your reset email. <Link to="/forgot-password" className="text-sage-700 underline">Request a new link</Link>.</p>
      ) : done ? (
        <p className="text-sm">Your password has been changed. <Link to="/auth" className="text-sage-700 underline">Log in</Link> with your new password.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (at least 8 characters)" className="input" />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" className="input" />
          {error && (
            <p className="text-sm text-red-600">
              {error} {error.includes("expired") && <Link to="/forgot-password" className="underline">Request a new link</Link>}
            </p>
          )}
          <button className="btn-primary w-full">Save new password</button>
        </form>
      )}
    </div>
  );
}
