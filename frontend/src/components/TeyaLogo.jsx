import React from "react";

export function TeyaLogo({
  size = 56,
  primary = "var(--primary)",
  accent = "var(--accent)",
  ink = "var(--ink)",
  surface = "var(--surface)",
  title = "TeyaVet logo",
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <title>{title}</title>

      <circle cx="50" cy="50" r="48" fill={accent} opacity="0.55" />
      <circle cx="50" cy="50" r="42" fill={surface} />

      {/* French Bulldog */}
      <g>
        <path d="M22 30 Q19 16 27 18 Q31 24 30 34 Z" fill={primary} />
        <path d="M44 30 Q47 16 39 18 Q35 24 36 34 Z" fill={primary} />
        <path d="M24 28 Q23 22 27 22 Q29 27 28 32 Z" fill={accent} opacity="0.9" />
        <path d="M42 28 Q43 22 39 22 Q37 27 38 32 Z" fill={accent} opacity="0.9" />
        <ellipse cx="33" cy="48" rx="16" ry="15" fill={primary} />
        <ellipse cx="29" cy="44" rx="6" ry="5" fill={ink} opacity="0.18" />
        <ellipse cx="38" cy="50" rx="4" ry="3" fill={ink} opacity="0.14" />
        <ellipse cx="33" cy="56" rx="9" ry="6" fill={surface} />
        <ellipse cx="33" cy="56" rx="9" ry="6" fill={accent} opacity="0.35" />
        <ellipse cx="33" cy="53" rx="2.6" ry="2" fill={ink} />
        <path d="M33 55 Q33 61 30 62 M33 55 Q33 61 36 62" stroke={ink} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />
        <circle cx="27" cy="46" r="2" fill={ink} />
        <circle cx="39" cy="46" r="2" fill={ink} />
        <circle cx="27.6" cy="45.4" r="0.6" fill={surface} />
        <circle cx="39.6" cy="45.4" r="0.6" fill={surface} />
      </g>

      {/* Heart */}
      <path
        d="M50 58 C 48 54, 44 54, 44 58 C 44 62, 50 66, 50 66 C 50 66, 56 62, 56 58 C 56 54, 52 54, 50 58 Z"
        fill={primary}
        opacity="0.85"
      />

      {/* Cat */}
      <g>
        <path d="M58 32 L62 18 L67 30 Z" fill={ink} />
        <path d="M76 32 L72 18 L82 30 Z" fill={ink} />
        <path d="M61 28 L63 22 L65 28 Z" fill={accent} />
        <path d="M77 28 L75 22 L73 28 Z" fill={accent} />
        <ellipse cx="69" cy="48" rx="14" ry="13" fill={ink} />
        <path d="M60 42 Q63 44 60 46" stroke={surface} strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M78 42 Q75 44 78 46" stroke={surface} strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M64 39 Q66 41 68 39" stroke={surface} strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M70 39 Q72 41 74 39" stroke={surface} strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round" />
        <ellipse cx="69" cy="55" rx="6" ry="4" fill={surface} opacity="0.85" />
        <path d="M67.5 52 L70.5 52 L69 54 Z" fill={primary} />
        <path d="M69 54 Q67 57 65.5 56 M69 54 Q71 57 72.5 56" stroke={ink} strokeWidth="1" fill="none" strokeLinecap="round" />
        <ellipse cx="64" cy="46" rx="2.2" ry="2.6" fill={surface} />
        <ellipse cx="74" cy="46" rx="2.2" ry="2.6" fill={surface} />
        <ellipse cx="64" cy="46.5" rx="1.1" ry="1.8" fill={primary} />
        <ellipse cx="74" cy="46.5" rx="1.1" ry="1.8" fill={primary} />
        <circle cx="64" cy="46" r="0.5" fill={ink} />
        <circle cx="74" cy="46" r="0.5" fill={ink} />
        <path d="M63 56 L57 55 M63 57 L58 58 M75 56 L81 55 M75 57 L80 58" stroke={surface} strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
      </g>

      <ellipse cx="50" cy="80" rx="28" ry="2.5" fill={ink} opacity="0.08" />
    </svg>
  );
}

export function TeyaWordmark({
  size = 44,
  primary = "var(--primary)",
  accent = "var(--accent)",
  ink = "var(--ink)",
  surface = "var(--surface)",
  subtitle = "Patient & client portal",
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <TeyaLogo size={size} primary={primary} accent={accent} ink={ink} surface={surface} />
      <div style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: Math.round(size * 0.42),
            fontWeight: 600,
            color: ink,
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
          }}
        >
          Teya<span style={{ color: primary }}>Vet</span>
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: Math.max(11, Math.round(size * 0.26)),
              color: "var(--muted)",
              letterSpacing: "0.02em",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
