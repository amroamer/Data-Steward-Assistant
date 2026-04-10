import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/hooks/use-branding";
import { apiUrl } from "@/lib/api";
import { Lock, Mail, ArrowLeft, KeyRound } from "lucide-react";

interface LoginPageProps {
  onLogin: (user: { id: number; name: string; email: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const theme = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");

  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Allow guest login with empty credentials
    if (!email.trim() && !password.trim()) {
      onLogin({ id: 0, name: "Guest", email: "guest" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      onLogin(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 4) { setError("Password must be at least 4 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Reset failed"); return; }
      setSuccess("Password reset successfully. You can now sign in.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setMode("login"); setEmail(resetEmail); setSuccess(""); }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8fafc" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[480px] flex-col items-center justify-center px-12 relative overflow-hidden"
        style={{ backgroundColor: theme.sidebarBg }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative z-10 text-center">
          <img
            src={theme.logo}
            alt=""
            className={`h-16 mx-auto mb-8 ${theme.logoInvert ? "brightness-0 invert" : ""}`}
          />
          <h2 className="text-2xl font-bold text-white mb-3">{theme.appTitle}</h2>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">
            AI-powered data governance platform for data classification, quality rules, and compliance analysis.
          </p>
        </div>
        <div className="absolute bottom-8 text-[11px] text-white/30">
          Powered by AI
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: theme.sidebarBg }}
            >
              <img
                src={theme.logo}
                alt=""
                className={`h-10 ${theme.logoInvert ? "brightness-0 invert" : ""}`}
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{theme.appTitle}</h1>
          </div>

          <div className="lg:block hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" ? "Welcome back" : "Reset password"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "login" ? "Sign in to your account to continue" : "Enter your email and set a new password"}
            </p>
          </div>

          <div className="lg:hidden mb-6 text-center">
            <p className="text-sm text-gray-500">
              {mode === "login" ? "Sign in to continue" : "Reset your password"}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10 h-11 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 h-11 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(""); }}
                  className="text-xs font-medium hover:underline transition-colors"
                  style={{ color: theme.primary }}
                >
                  Forgot password?
                </button>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-sm"
                disabled={loading}
                style={{ backgroundColor: theme.primary }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                  {success}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10 h-11 text-sm border-gray-200"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="pl-10 h-11 text-sm border-gray-200"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pl-10 h-11 text-sm border-gray-200"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-sm"
                disabled={loading}
                style={{ backgroundColor: theme.primary }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1 pt-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
