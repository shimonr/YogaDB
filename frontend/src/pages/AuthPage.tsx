import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate("/");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Authentication failed.";
      setError(Array.isArray(msg) ? msg.map((e: any) => e.msg).join(", ") : String(msg));
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-sand-100 rounded-xl p-6">
      <h1 className="text-xl font-semibold mb-4">{isRegister ? "Register" : "Login"}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full border rounded px-3 py-2" />
        {isRegister && (
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
        )}
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border rounded px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full bg-sage-500 text-white rounded py-2">{isRegister ? "Create account" : "Login"}</button>
      </form>
      <button className="text-sm mt-3 text-sage-700" onClick={() => setIsRegister((v) => !v)}>
        {isRegister ? "Have an account? Login" : "Need an account? Register"}
      </button>
    </div>
  );
}
