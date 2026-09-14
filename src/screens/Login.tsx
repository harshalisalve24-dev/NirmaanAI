import { useState, useMemo } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { getPublicDatasetStats } from "../utils/importProjects";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dynamically compute real dataset statistics for public display
  const stats = useMemo(() => getPublicDatasetStats(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) {
      setError("Please enter your Official ID and Password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (!auth) {
      setLoading(false);
      setError("Firebase Authentication is not configured.");
      return;
    }

    const email = id.includes("@") ? id.trim() : `${id.trim().toLowerCase()}@nirmaan.gov.in`;

    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setLoading(false);
      onLogin();
    } catch (err: any) {
      console.error("[LoginScreen] Firebase auth error:", err);
      setLoading(false);
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This Official ID / Email is already registered. Please Sign In instead.");
      } else if (code === "auth/operation-not-allowed") {
        setError(
          "Firebase Email/Password provider is not enabled in Firebase Console. Please enable Email/Password under Authentication -> Sign-in method."
        );
      } else if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email"
      ) {
        setError("Invalid Official ID or password.");
      } else {
        setError(err?.message || "Authentication failed. Please check credentials.");
      }
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const demoEmail = "demo.officer@nirmaan.gov.in";
    const demoPassword = "DemoUser@123";

    if (!auth) {
      setLoading(false);
      onLogin();
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      setLoading(false);
      onLogin();
    } catch (err: any) {
      // If demo user does not exist yet in Firebase, create it automatically
      try {
        await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        setLoading(false);
        onLogin();
      } catch (createErr: any) {
        console.error("[LoginScreen] Demo login error:", createErr);
        setLoading(false);
        // Fallback login so portfolio reviewers can always test
        onLogin();
      }
    }
  };

  return (
    <div className="h-full flex" style={{ background: "#04080f" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-14 relative overflow-hidden"
        style={{ background: "#0a1628" }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Infrastructure illustration */}
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none">
          <svg viewBox="0 0 600 260" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
            {/* Skyline silhouette */}
            <rect x="0" y="180" width="600" height="80" fill="rgba(14,30,60,0.8)"/>
            {/* Buildings */}
            <rect x="20" y="140" width="30" height="40" fill="rgba(22,48,88,0.9)"/>
            <rect x="55" y="120" width="25" height="60" fill="rgba(22,48,88,0.9)"/>
            <rect x="85" y="100" width="40" height="80" fill="rgba(30,64,120,0.9)"/>
            <rect x="130" y="130" width="20" height="50" fill="rgba(22,48,88,0.9)"/>
            <rect x="155" y="90" width="45" height="90" fill="rgba(30,64,120,0.9)"/>
            <rect x="205" y="110" width="30" height="70" fill="rgba(22,48,88,0.9)"/>
            {/* Tower */}
            <rect x="250" y="60" width="8" height="120" fill="rgba(37,99,235,0.5)"/>
            <circle cx="254" cy="58" r="3" fill="#2563eb" opacity="0.8"/>
            {/* Bridge */}
            <path d="M300 180 Q350 140 400 180" stroke="rgba(37,99,235,0.4)" strokeWidth="2" fill="none"/>
            <line x1="300" y1="180" x2="300" y2="155" stroke="rgba(37,99,235,0.3)" strokeWidth="1.5"/>
            <line x1="350" y1="180" x2="350" y2="140" stroke="rgba(37,99,235,0.3)" strokeWidth="1.5"/>
            <line x1="400" y1="180" x2="400" y2="155" stroke="rgba(37,99,235,0.3)" strokeWidth="1.5"/>
            <line x1="295" y1="180" x2="405" y2="180" stroke="rgba(37,99,235,0.5)" strokeWidth="2"/>
            {/* More buildings right */}
            <rect x="420" y="120" width="35" height="60" fill="rgba(22,48,88,0.9)"/>
            <rect x="460" y="100" width="50" height="80" fill="rgba(30,64,120,0.9)"/>
            <rect x="515" y="130" width="25" height="50" fill="rgba(22,48,88,0.9)"/>
            <rect x="545" y="110" width="40" height="70" fill="rgba(22,48,88,0.9)"/>
            {/* Road */}
            <rect x="0" y="195" width="600" height="10" fill="rgba(20,40,80,0.5)"/>
            <line x1="0" y1="200" x2="600" y2="200" stroke="rgba(37,99,235,0.2)" strokeWidth="1" strokeDasharray="20 15"/>
            {/* Power lines */}
            <line x1="80" y1="60" x2="80" y2="130" stroke="rgba(37,99,235,0.25)" strokeWidth="1"/>
            <line x1="160" y1="60" x2="160" y2="110" stroke="rgba(37,99,235,0.25)" strokeWidth="1"/>
            <path d="M80 65 Q120 55 160 65" stroke="rgba(37,99,235,0.2)" strokeWidth="0.8" fill="none"/>
            {/* Glowing dots */}
            <circle cx="85" cy="98" r="2" fill="#2563eb" opacity="0.7"/>
            <circle cx="160" cy="88" r="2" fill="#2563eb" opacity="0.5"/>
            <circle cx="254" cy="58" r="4" fill="#2563eb" opacity="0.3"/>
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#2563eb" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 16L8 10L11 13L15 7L19 11" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="19" cy="6" r="2.5" fill="#93c5fd"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white text-xl">NirmaanAI</span>
          </div>

          <h1 className="font-display font-bold text-white leading-tight mb-4" style={{ fontSize: "2.4rem" }}>
            Infrastructure Risk,<br />Seen Before It Strikes.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(148,163,184,0.75)", maxWidth: "380px" }}>
            An AI-powered early-warning system for government infrastructure projects — highways, railways, metros, bridges and power grids.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: "Projects Monitored", value: stats.totalProjects.toLocaleString("en-IN") },
              { label: "States Covered", value: String(stats.statesCount) },
              { label: "Sectors", value: String(stats.sectorsCount) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="font-display font-bold text-white text-xl">{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
            Secure Government System · Ministry of Road Transport & Highways
          </span>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center px-8 py-14">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#2563eb" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 14L7 9L10 12L14 6L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white text-lg">NirmaanAI</span>
          </div>

          <div className="mb-6">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: "rgba(37,99,235,0.15)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.3)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Secure Government Access
            </div>

            {/* Mode Switcher: Sign In vs Create Account */}
            <div className="flex items-center gap-2 mb-4 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(""); setSuccessMsg(""); }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={{
                  background: mode === "signin" ? "#2563eb" : "transparent",
                  color: mode === "signin" ? "white" : "rgba(148,163,184,0.6)",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(""); setSuccessMsg(""); }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={{
                  background: mode === "signup" ? "#2563eb" : "transparent",
                  color: mode === "signup" ? "white" : "rgba(148,163,184,0.6)",
                }}
              >
                Create Account
              </button>
            </div>

            <h2 className="font-display font-bold text-white text-2xl mb-1">
              {mode === "signin" ? "Sign In" : "Register Officer Account"}
            </h2>
            <p className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>
              {mode === "signin"
                ? "Authorised personnel only. Enter Official ID or Email."
                : "Register a new officer account to access the Infrastructure Risk Platform."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "rgba(148,163,184,0.7)" }}>
                {mode === "signin" ? "Official ID / Email" : "Create Official ID or Email"}
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={mode === "signin" ? "e.g. IAS-MH-2026-224 or officer@nirmaan.gov.in" : "e.g. IAS-DL-2026-001"}
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-600"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "rgba(148,163,184,0.7)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-600"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 rounded-lg px-3 py-2">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm text-white relative overflow-hidden shadow-md"
              style={{
                background: loading ? "#1e40af" : "#2563eb",
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Authenticating…
                </span>
              ) : mode === "signin" ? (
                "Access Dashboard →"
              ) : (
                "Register & Access Dashboard →"
              )}
            </button>
          </form>

          {/* 1-Click Demo Login Button for Portfolio Reviewers */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀 Portfolio Reviewer? 1-Click Quick Demo Access →</span>
            </button>
          </div>

          <div className="mt-6 flex items-start gap-2.5 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="rgba(148,163,184,0.5)" strokeWidth="1.2"/>
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="rgba(148,163,184,0.5)" strokeWidth="1.2"/>
              <circle cx="8" cy="11" r="1.2" fill="rgba(148,163,184,0.5)"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(148,163,184,0.45)" }}>
              This system is for authorised government use only. Unauthorised access is a punishable offence under the IT Act, 2000.
            </p>
          </div>

          <div className="mt-6 text-center text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>
            NirmaanAI v2.4.1 · Government of India
          </div>
        </div>
      </div>
    </div>
  );
}
