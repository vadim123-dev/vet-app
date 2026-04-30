import React, { useState } from "react";
import { apiFetch } from "../api";

const SPECIES = [
  { code: "dog",    label: "Dog",    emoji: "🐕" },
  { code: "cat",    label: "Cat",    emoji: "🐱" },
  { code: "rabbit", label: "Rabbit", emoji: "🐰" },
  { code: "parrot", label: "Parrot", emoji: "🦜" },
];

const BREEDS = {
  dog:    [{ id: 1, name: "Labrador Retriever" }, { id: 2, name: "German Shepherd" }, { id: 3, name: "Border Collie" }],
  cat:    [{ id: 4, name: "Bengal" }, { id: 5, name: "Siamese" }, { id: 6, name: "Persian" }],
  rabbit: [{ id: 7, name: "Holland Lop" }],
  parrot: [{ id: 8, name: "African Grey" }],
};

const FIELD_STYLE = {
  width: "100%", height: 40, padding: "0 12px", borderRadius: 10,
  border: "1.5px solid var(--border)", background: "var(--surface)",
  fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--ink)",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--primary)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: "Owner details" },
    { n: 2, label: "Pet details"   },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => {
        const done    = step > s.n;
        const active  = step === s.n;
        const dotBg   = done || active ? "var(--primary)" : "color-mix(in oklch, var(--ink) 10%, transparent)";
        const textClr = active ? "var(--ink)" : done ? "var(--primary)" : "var(--muted)";
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: dotBg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 200ms" }}>
                {done
                  ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                  : s.n}
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: active ? 600 : 500, color: textClr, transition: "color 200ms" }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "var(--primary)" : "var(--border)", margin: "0 12px", transition: "background 200ms" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function AddOwnerModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);

  const [owner, setOwner] = useState({
    first_name: "", last_name: "", gender: "1", city: "", telephone: "",
  });
  const [pet, setPet] = useState({
    name: "", pet_type_code: "", breed_id: "", birth_date: "", birth_date_is_estimated: false,
  });

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [created, setCreated] = useState(null);

  const setO = (k, v) => setOwner(o => ({ ...o, [k]: v }));
  const setP = (k, v) => setPet(p => ({ ...p, [k]: v }));

  const breeds = BREEDS[pet.pet_type_code] || [];

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pet.pet_type_code) { setError("Please select a species."); return; }
    setSaving(true);
    setError(null);
    try {
      const base = `${owner.first_name}${owner.last_name}`.toLowerCase().replace(/[^a-z0-9]/g, "");
      const user_name = `${base}${Math.floor(Math.random() * 900 + 100)}`;
      const newOwner = await apiFetch("/users/add", {
        method: "POST",
        body: { ...owner, user_name, gender: parseInt(owner.gender) },
      });
      await apiFetch("/pets/add", {
        method: "POST",
        body: {
          owner_user_name:         newOwner.user_name,
          name:                    pet.name,
          pet_type_code:           pet.pet_type_code,
          breed_id:                pet.breed_id ? parseInt(pet.breed_id) : null,
          birth_date:              pet.birth_date || null,
          birth_date_is_estimated: pet.birth_date_is_estimated,
        },
      });
      setCreated(newOwner);
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create owner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.25 0.025 50 / 0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: 22, boxShadow: "0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", padding: 32, border: "1px solid var(--border)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Clinic › People</div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 500, color: "var(--ink)", margin: "6px 0 0", letterSpacing: "-0.01em" }}>New Pet Owner</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {created ? (
          /* ── Success ── */
          <div>
            <div style={{ padding: "16px 20px", borderRadius: 14, background: "color-mix(in oklch, oklch(0.75 0.13 150) 14%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.75 0.13 150) 30%, transparent)", marginBottom: 20 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 600, color: "oklch(0.35 0.12 150)" }}>Owner &amp; pet registered!</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "oklch(0.4 0.1 150)", marginTop: 6 }}>
                Share these login credentials with {created.first_name}:
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                  Username: <strong>{created.user_name}</strong>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
                  Temporary password:{" "}
                  <strong style={{ fontFamily: "monospace", fontSize: 14, letterSpacing: "0.06em", background: "color-mix(in oklch, var(--ink) 7%, transparent)", padding: "2px 10px", borderRadius: 7 }}>
                    {created.temporary_password}
                  </strong>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "100%", height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 22px -10px var(--primary)" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <StepIndicator step={step} />

            {/* ── Step 1: Owner ── */}
            {step === 1 && (
              <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="First name" required>
                    <input required value={owner.first_name} onChange={e => setO("first_name", e.target.value)} placeholder="Jane" style={FIELD_STYLE} />
                  </Field>
                  <Field label="Last name" required>
                    <input required value={owner.last_name} onChange={e => setO("last_name", e.target.value)} placeholder="Smith" style={FIELD_STYLE} />
                  </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="City" required>
                    <input required value={owner.city} onChange={e => setO("city", e.target.value)} placeholder="Tel Aviv" style={FIELD_STYLE} />
                  </Field>
                  <Field label="Phone" required>
                    <input required value={owner.telephone} onChange={e => setO("telephone", e.target.value)} placeholder="050-0000000" style={FIELD_STYLE} />
                  </Field>
                </div>

                <Field label="Gender" required>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[["1", "Male"], ["2", "Female"]].map(([val, label]) => (
                      <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, height: 40, padding: "0 14px", borderRadius: 10, border: `1.5px solid ${owner.gender === val ? "var(--primary)" : "var(--border)"}`, background: owner.gender === val ? "color-mix(in oklch, var(--primary) 10%, var(--surface))" : "var(--surface)", transition: "all 120ms ease" }}>
                        <input type="radio" name="gender" value={val} checked={owner.gender === val} onChange={() => setO("gender", val)} style={{ display: "none" }} />
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${owner.gender === val ? "var(--primary)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {owner.gender === val && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                        </div>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500, color: owner.gender === val ? "var(--primary)" : "var(--ink)" }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="submit" style={{ flex: 1, height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 8px 22px -10px var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Next — Pet details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                  <button type="button" onClick={onClose} style={{ height: 42, padding: "0 18px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 2: Pet ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <Field label="Pet name" required>
                  <input required value={pet.name} onChange={e => setP("name", e.target.value)} placeholder="e.g. Buddy" style={FIELD_STYLE} />
                </Field>

                <Field label="Species" required>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {SPECIES.map(s => (
                      <label key={s.code} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", height: 40, padding: "0 14px", borderRadius: 10, border: `1.5px solid ${pet.pet_type_code === s.code ? "var(--primary)" : "var(--border)"}`, background: pet.pet_type_code === s.code ? "color-mix(in oklch, var(--primary) 10%, var(--surface))" : "var(--surface)", transition: "all 120ms ease" }}>
                        <input type="radio" name="species" value={s.code} checked={pet.pet_type_code === s.code} onChange={() => { setP("pet_type_code", s.code); setP("breed_id", ""); }} style={{ display: "none" }} />
                        <span style={{ fontSize: 18 }}>{s.emoji}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500, color: pet.pet_type_code === s.code ? "var(--primary)" : "var(--ink)" }}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </Field>

                {pet.pet_type_code && (
                  <Field label="Breed">
                    <select value={pet.breed_id} onChange={e => setP("breed_id", e.target.value)} style={{ ...FIELD_STYLE, cursor: "pointer" }}>
                      <option value="">Mixed / Unknown</option>
                      {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "end" }}>
                  <Field label="Date of birth">
                    <input type="date" value={pet.birth_date} onChange={e => setP("birth_date", e.target.value)} style={FIELD_STYLE} />
                  </Field>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, cursor: "pointer", userSelect: "none" }}
                       onClick={() => setP("birth_date_is_estimated", !pet.birth_date_is_estimated)}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${pet.birth_date_is_estimated ? "var(--primary)" : "var(--border)"}`, background: pet.birth_date_is_estimated ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 120ms ease" }}>
                      {pet.birth_date_is_estimated && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                      )}
                    </div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--ink)" }}>Estimated</span>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.96 0.03 30)", border: "1px solid oklch(0.88 0.06 30)", color: "oklch(0.45 0.16 30)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={() => { setStep(1); setError(null); }} style={{ height: 42, padding: "0 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
                    Back
                  </button>
                  <button type="submit" disabled={saving} style={{ flex: 1, height: 42, borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 8px 22px -10px var(--primary)" }}>
                    {saving ? "Creating…" : "Create Owner & Pet"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
