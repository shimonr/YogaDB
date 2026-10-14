import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAppConfig } from "../lib/appConfig";

export function ForgotPasswordPage() {
  const config = useAppConfig();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Please enter a valid email address.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-sage-700">Forgot your password?</h1>
      {sent ? (
        <div className="space-y-3 text-sm">
          <p>If that email belongs to an account, a reset link is on its way. It works for one hour.</p>
          {config && !config.email_enabled && (
            <p className="text-slate-600">
              This site doesn't send email yet, so an administrator will send you the link personally.
            </p>
          )}
          <Link to="/auth" className="text-sage-700 underline">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-slate-600">Enter the email of your account and we'll send you a link to choose a new password.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Sending..." : "Send reset link"}</button>
          <Link to="/auth" className="block text-sm text-sage-700">Back to login</Link>
        </form>
      )}
    </div>
  );
}
