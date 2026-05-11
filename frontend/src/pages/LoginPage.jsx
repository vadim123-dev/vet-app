import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api";
import { TeyaLogo } from "../components/TeyaLogo";
import brandPhoto from "../assets/brand-photo.jpeg";
import happyPuppyPhoto from "../assets/happy-puppy.jpeg";

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconEye({ open = true, size = 18 }) {
  return open ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.2 3.9" />
      <path d="M6.6 6.6A17 17 0 0 0 2 13s3.5 7 10 7a9.7 9.7 0 0 0 4.6-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function IconSpinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "lc-spin 0.9s linear infinite" }}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function IconCheck({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

// ─── Paw background tile ──────────────────────────────────────────────────────

function PawPattern() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><g fill="#b85c2e" opacity="0.18"><ellipse cx="45" cy="52" rx="10" ry="8"/><ellipse cx="30" cy="40" rx="4" ry="5"/><ellipse cx="60" cy="40" rx="4" ry="5"/><ellipse cx="37" cy="30" rx="3.5" ry="4.5"/><ellipse cx="53" cy="30" rx="3.5" ry="4.5"/></g></svg>`;
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`,
      backgroundRepeat: "repeat",
      backgroundSize: "90px 90px",
    }} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focus, setFocus] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [error, setError] = useState("");

  const fieldH = 52;
  const radius = 14;

  const labelStyle = {
    display: "block",
    marginBottom: 8,
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#7a6155",
  };

  const fieldWrapStyle = (focused) => ({
    display: "flex",
    alignItems: "center",
    height: fieldH,
    padding: "0 16px",
    background: "#f7ede0",
    border: `1.5px solid ${focused ? "#b85c2e" : "#dfc9b3"}`,
    borderRadius: radius,
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    boxShadow: focused ? "0 0 0 4px rgba(184,92,46,0.15)" : "none",
  });

  const inputStyle = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 15.5,
    color: "#3a2418",
    fontFamily: "Inter, sans-serif",
    height: "100%",
  };

  async function submit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both fields.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const data = await apiFetch("/users/authenticate", {
        method: "POST",
        body: { user_name: username, password },
      });
      if (!data?.access_token) throw new Error("Login failed — please try again.");
      login(data.access_token, data.refresh_token, data.user);
      setStatus("success");
      setTimeout(() => navigate("/", { replace: true }), 900);
    } catch (err) {
      setStatus("error");
      setError(err.message || "That username and password don't match.");
    }
  }

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      background: "#f9ead5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      overflow: "hidden",
    }}>
      <PawPattern />

      {/* Decorative radial wash */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 65% 55% at 50% 30%, rgba(184,92,46,0.12), transparent 70%)",
      }} />

      {/* Corner pet photos */}
      <div style={{ position: "absolute", top: 40, left: 40, width: 140, height: 140, transform: "rotate(-8deg)", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 50px -18px rgba(58,36,24,0.4)", zIndex: 0 }}>
        <img src={brandPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", bottom: 50, right: 50, width: 150, height: 150, transform: "rotate(6deg)", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 50px -18px rgba(58,36,24,0.4)", zIndex: 0 }}>
        <img src={happyPuppyPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Card */}
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 440,
        background: "#fff8f0",
        borderRadius: 28,
        padding: "40px 38px 36px",
        boxShadow: "0 32px 80px -24px rgba(58,36,24,0.28), 0 8px 24px -10px rgba(58,36,24,0.16)",
        border: "1px solid #e8d0b8",
      }}>

        {status === "success" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0", animation: "lc-fade 320ms ease both" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(184,92,46,0.15)",
              color: "#b85c2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "lc-pop 320ms cubic-bezier(.2,1.2,.4,1) both",
            }}>
              <IconCheck />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 600, color: "#3a2418", lineHeight: 1.1 }}>
                Welcome back!
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#7a6155", marginTop: 6 }}>
                Fetching your appointments…
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20, animation: status === "error" ? "lc-shake 380ms ease" : "none" }}>

            {/* Brand header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <TeyaLogo
                size={48}
                primary="#b85c2e"
                accent="#e8a87c"
                ink="#3a2418"
                surface="#fff8f0"
              />
              <div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 600, color: "#3a2418", lineHeight: 1.2 }}>
                  Teya<span style={{ color: "#b85c2e" }}>Vet</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#7a6155", marginTop: 2 }}>
                  Patient & client portal
                </div>
              </div>
            </div>

            {/* Heading */}
            <div>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 34, fontWeight: 500, color: "#3a2418", margin: 0, lineHeight: 1.05, letterSpacing: "-0.015em" }}>
                Hi there, friend.
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14.5, color: "#7a6155", margin: "8px 0 0", lineHeight: 1.5 }}>
                Sign in to check on your pet, book a visit, or chat with our team.
              </p>
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle} htmlFor="login-username">Username</label>
              <div style={fieldWrapStyle(focus === "u")}>
                <input
                  id="login-username"
                  type="text"
                  placeholder="e.g. luna_owner"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.trim()); if (status === "error") setStatus("idle"); }}
                  onFocus={() => setFocus("u")}
                  onBlur={() => setFocus(null)}
                  style={inputStyle}
                  disabled={status === "loading"}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="login-password">Password</label>
                <a href="#forgot" style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 500, color: "#b85c2e", textDecoration: "none" }}>
                  Forgot?
                </a>
              </div>
              <div style={fieldWrapStyle(focus === "p")}>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (status === "error") setStatus("idle"); }}
                  onFocus={() => setFocus("p")}
                  onBlur={() => setFocus(null)}
                  style={inputStyle}
                  disabled={status === "loading"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ background: "none", border: "none", color: "#7a6155", cursor: "pointer", display: "flex", alignItems: "center", padding: 4, marginRight: -4 }}
                >
                  <IconEye open={showPw} />
                </button>
              </div>
            </div>

            {/* Error */}
            {status === "error" && error && (
              <div style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13.5,
                color: "#8b2a1a",
                background: "#fdf0ee",
                border: "1px solid #f0c4bc",
                padding: "10px 14px",
                borderRadius: 10,
                animation: "lc-fade 240ms ease both",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                height: fieldH,
                marginTop: 4,
                background: "#b85c2e",
                color: "#ffffff",
                border: "none",
                borderRadius: radius,
                fontFamily: "Inter, sans-serif",
                fontSize: 15.5,
                fontWeight: 600,
                letterSpacing: "0.01em",
                cursor: status === "loading" ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                boxShadow: "0 8px 22px -10px rgba(184,92,46,0.6)",
                transition: "transform 120ms ease, filter 160ms ease",
                opacity: status === "loading" ? 0.8 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(1px)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {status === "loading" ? <><IconSpinner /> Signing in…</> : "Sign in"}
            </button>

            {/* Footer */}
            <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13.5, color: "#7a6155" }}>
              New to our practice?{" "}
              <a href="#signup" style={{ color: "#b85c2e", fontWeight: 600, textDecoration: "none" }}>
                Create an account
              </a>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
