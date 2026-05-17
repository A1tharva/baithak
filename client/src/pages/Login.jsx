import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/GoogleLoginButton";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      login(data.user, data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.03] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.03] rounded-full blur-[120px]" />

      <div className="w-full max-w-md animate-fadeIn z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dim)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 mb-4 transform hover:rotate-6 transition-transform">
            <svg width="32" height="32" className="text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Baithak</h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Connect and chat instantly</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl backdrop-blur-xl bg-opacity-80">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2 px-1">Email Address</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="block text-sm font-semibold text-[var(--text-secondary)]">Password</label>
                <Link to="/forgot-password" size="sm" className="text-xs text-[var(--accent)] hover:underline">Forgot?</Link>
              </div>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-[var(--radius-sm)] flex items-center gap-2 animate-shake">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-[var(--bg-primary)] font-bold py-3.5 rounded-[var(--radius-md)] shadow-lg shadow-[var(--accent)]/10 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <GoogleLoginButton />

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
            <p className="text-[var(--text-secondary)] text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-[var(--accent)] font-bold hover:underline">
                Create One
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
