import React, { useState } from "react";
import { apiFetch } from "../api";

const COMMON_DRUGS = [
  "Amoxicillin", "Clavamox", "Doxycycline", "Metronidazole", "Enrofloxacin",
  "Prednisolone", "Meloxicam", "Tramadol", "Gabapentin", "Furosemide",
  "Enalapril", "Atenolol", "Metoclopramide", "Famotidine", "Omeprazole",
  "Benadryl (Diphenhydramine)", "Cerenia (Maropitant)", "Apoquel (Oclacitinib)",
  "Cytopoint", "Frontline", "NexGard", "Heartgard", "Revolution",
  "Baytril (Enrofloxacin)", "Convenia", "Other",
];
const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Every 8 hours", "Every 12 hours", "Every 48 hours", "Weekly", "As needed"];

function PrescriptionRow({ presc, onChange, onRemove, readOnly }) {
  const inputStyle = {
    height: 34, borderRadius: 8, border: "1px solid var(--border)",
    padding: "0 10px", fontFamily: "Inter, sans-serif", fontSize: 13,
    color: "var(--ink)", background: readOnly ? "color-mix(in oklch, var(--ink) 3%, var(--surface))" : "var(--surface)",
    width: "100%", boxSizing: "border-box",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 0.8fr auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
      <select style={inputStyle} value={presc.drug_name} onChange={e => onChange("drug_name", e.target.value)} disabled={readOnly}>
        <option value="">Select drug…</option>
        {COMMON_DRUGS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <input style={inputStyle} placeholder="Dosage" value={presc.dosage || ""} onChange={e => onChange("dosage", e.target.value)} readOnly={readOnly} />
      <select style={inputStyle} value={presc.frequency || ""} onChange={e => onChange("frequency", e.target.value)} disabled={readOnly}>
        <option value="">Frequency…</option>
        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <input style={inputStyle} placeholder="Days" type="number" min={1} value={presc.duration_days || ""} onChange={e => onChange("duration_days", e.target.value ? Number(e.target.value) : null)} readOnly={readOnly} />
      {!readOnly && (
        <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "oklch(0.45 0.16 30)", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
        </button>
      )}
      {readOnly && <div />}
    </div>
  );
}

export default function VisitModal({ appointment, pet, vetUserId, existingVisit, readOnly, onClose, onSaved }) {
  const [fields, setFields] = useState({
    chief_complaint: existingVisit?.chief_complaint || "",
    exam_notes:      existingVisit?.exam_notes      || "",
    assessment:      existingVisit?.assessment      || "",
    plan:            existingVisit?.plan            || "",
  });
  const [prescriptions, setPrescriptions] = useState(existingVisit?.prescriptions || []);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const setField = (k, v) => setFields(f => ({ ...f, [k]: v }));

  const addPrescription = () => {
    setPrescriptions(ps => [...ps, { drug_name: "", dosage: "", frequency: "", duration_days: null, notes: "" }]);
  };

  const updatePrescription = (i, key, val) => {
    setPrescriptions(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
  };

  const removePrescription = (i) => {
    setPrescriptions(ps => ps.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const body = {
        ...fields,
        prescriptions: prescriptions.filter(p => p.drug_name),
      };
      if (existingVisit?.id) {
        await apiFetch(`/visits/${existingVisit.id}`, { method: "PATCH", body });
      } else {
        body.appointment_id = appointment.id;
        body.pet_id         = pet.id;
        body.vet_user_id    = vetUserId || null;
        await apiFetch("/visits/", { method: "POST", body });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.responseData?.error || err.message || "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const textareaStyle = {
    width: "100%", borderRadius: 10, border: "1px solid var(--border)",
    padding: "10px 12px", fontFamily: "Inter, sans-serif", fontSize: 13.5,
    color: "var(--ink)", background: readOnly ? "color-mix(in oklch, var(--ink) 3%, var(--surface))" : "var(--surface)",
    resize: "vertical", minHeight: 90, boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: 11.5,
    fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em",
    textTransform: "uppercase", marginBottom: 6,
  };
  const sectionStyle = { marginBottom: 20 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0.25 0.025 50 / 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 24px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, background: "var(--surface)", borderRadius: 22, boxShadow: "0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", border: "1px solid var(--border)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {readOnly ? "Visit Record" : (existingVisit ? "Edit Visit" : "Start Visit")}
            </div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, fontWeight: 500, color: "var(--ink)", margin: "4px 0 0", letterSpacing: "-0.01em" }}>
              {pet?.name}
            </h2>
            {appointment && (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginTop: 3 }}>
                {new Date(appointment.appointment_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {appointment.procedure_type ? ` · ${appointment.procedure_type}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Chief complaint</label>
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={fields.chief_complaint} onChange={e => setField("chief_complaint", e.target.value)} placeholder="Why is the patient here today?" readOnly={readOnly} />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Exam notes</label>
            <textarea style={textareaStyle} value={fields.exam_notes} onChange={e => setField("exam_notes", e.target.value)} placeholder="Physical examination findings…" readOnly={readOnly} />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Assessment</label>
            <textarea style={{ ...textareaStyle, minHeight: 70 }} value={fields.assessment} onChange={e => setField("assessment", e.target.value)} placeholder="Diagnosis / differential diagnoses…" readOnly={readOnly} />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Plan</label>
            <textarea style={textareaStyle} value={fields.plan} onChange={e => setField("plan", e.target.value)} placeholder="Treatment plan, follow-up instructions…" readOnly={readOnly} />
          </div>

          {/* Prescriptions */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Prescriptions</label>
              {!readOnly && (
                <button onClick={addPrescription} style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Add drug
                </button>
              )}
            </div>

            {prescriptions.length === 0 ? (
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", fontStyle: "italic", padding: "10px 0" }}>
                {readOnly ? "No prescriptions recorded." : "No prescriptions added yet."}
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 0.8fr auto", gap: 8, marginBottom: 6 }}>
                  {["Drug", "Dosage", "Frequency", "Days", ""].map((h, i) => (
                    <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>
                {prescriptions.map((p, i) => (
                  <PrescriptionRow
                    key={i}
                    presc={p}
                    readOnly={readOnly}
                    onChange={(k, v) => updatePrescription(i, k, v)}
                    onRemove={() => removePrescription(i)}
                  />
                ))}
              </>
            )}
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "oklch(0.95 0.04 30)", color: "oklch(0.45 0.18 30)", fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <button onClick={onClose} style={{ height: 42, padding: "0 20px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button onClick={handleSave} disabled={saving} style={{ height: 42, padding: "0 24px", borderRadius: 12, border: "none", background: "var(--primary)", color: "white", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 18px -8px var(--primary)", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : (existingVisit ? "Save changes" : "Save & complete visit")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
