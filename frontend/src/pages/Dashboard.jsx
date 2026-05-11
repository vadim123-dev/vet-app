import React, { useState, useEffect, useCallback } from "react";
import TopNav, { getTabsForRole, NavIcon } from "../components/TopNav";
import PetOwnersPage, { formatDateLong } from "./PetOwnersPage";
import PatientsPage from "./PatientsPage";
import PetProfileView from "./PetProfileView";
import AppointmentsPage from "./AppointmentsPage";
import DashboardPage from "./DashboardPage";
import UserManagementPage from "./UserManagementPage";
import AddOwnerModal from "./AddOwnerModal";
import AddPatientModal from "./AddPatientModal";
import CheckInModal from "./CheckInModal";
import { apiFetch } from "../api";
import { useAuth } from "../auth/AuthContext";

const PET_TYPE_EMOJI = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🦜", reptile: "🦎", parrot: "🦜", other: "🐾" };

function DetailRow({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"var(--ink)", marginTop:4 }}>{value || "—"}</div>
    </div>
  );
}

function OwnerDetailModal({ owner, onClose }) {
  const [pets, setPets]         = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);

  useEffect(() => {
    if (!owner) return;
    setPets([]);
    setPetsLoading(true);
    apiFetch(`/users/${owner.user_name}`)
      .then(data => setPets(data.pets || []))
      .catch(() => setPets([]))
      .finally(() => setPetsLoading(false));
  }, [owner]);

  if (!owner) return null;

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:100, background:"oklch(0.25 0.025 50 / 0.35)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, animation:"modal-fade 160ms ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:520, background:"var(--surface)", borderRadius:22, boxShadow:"0 40px 80px -30px oklch(0.3 0.08 40 / 0.4)", padding:32, animation:"modal-pop 220ms cubic-bezier(.2,1,.4,1) both", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Owner profile</div>
            <h2 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:28, fontWeight:500, color:"var(--ink)", margin:"6px 0 0", letterSpacing:"-0.01em" }}>{owner.first_name} {owner.last_name}</h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
          </button>
        </div>
        <div style={{ marginTop:22, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <DetailRow label="Phone"        value={owner.telephone} />
          <DetailRow label="City"         value={owner.city} />
          <DetailRow label="Last visit"   value={owner.last_appointment ? formatDateLong(owner.last_appointment) : "No visits yet"} />
          <DetailRow label="Member since" value={formatDateLong(owner.created_at)} />
        </div>
        <div style={{ marginTop:22 }}>
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, fontWeight:600, color:"var(--muted)", letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:10 }}>
            Pets ({petsLoading ? "…" : pets.length})
          </div>
          {petsLoading ? (
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--muted)", padding:"12px 0" }}>Loading pets…</div>
          ) : pets.length === 0 ? (
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"var(--muted)", fontStyle:"italic" }}>No pets on record.</div>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {pets.map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:12, background:"color-mix(in oklch, var(--accent) 30%, var(--surface))", border:"1px solid var(--border)" }}>
                  <span style={{ fontSize:18 }}>{PET_TYPE_EMOJI[p.type] || "🐾"}</span>
                  <div style={{ lineHeight:1.2 }}>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, fontWeight:600, color:"var(--ink)" }}>{p.name}</div>
                    <div style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"var(--muted)", textTransform:"capitalize" }}>
                      {p.breed ? `${p.breed} · ` : ""}{p.type}
                      {p.latest_measurement?.weight_kg ? ` · ${p.latest_measurement.weight_kg}kg` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:26 }}>
          <button style={{ flex:1, height:42, borderRadius:12, border:"none", background:"var(--primary)", color:"white", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", boxShadow:"0 8px 22px -10px var(--primary)" }}>
            Open full record
          </button>
          <button onClick={onClose} style={{ height:42, padding:"0 18px", borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--ink)", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ tabId }) {
  const tab = getTabsForRole(["admin", "vet", "coordinator"]).find(t => t.id === tabId) || { label: tabId, icon: "home" };
  return (
    <div style={{ padding:"80px 28px", maxWidth:1440, margin:"0 auto", textAlign:"center" }}>
      <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:84, height:84, borderRadius:24, background:"color-mix(in oklch, var(--primary) 14%, var(--surface))", color:"var(--primary)", marginBottom:20 }}>
        <NavIcon name={tab.icon} size={36} color="var(--primary)" />
      </div>
      <h1 style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize:36, fontWeight:500, color:"var(--ink)", margin:0, letterSpacing:"-0.015em" }}>{tab.label}</h1>
      <p style={{ fontFamily:"Inter, sans-serif", fontSize:15, color:"var(--muted)", marginTop:10 }}>
        This screen is coming soon.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { logout, user } = useAuth();
  const roles = user?.roles || [];
  const isVet = roles.includes("vet");

  const tabs = getTabsForRole(roles);
  const defaultTab = tabs[0]?.id || "dashboard";

  const [active,         setActive]         = useState(defaultTab);
  const [viewing,        setViewing]        = useState(null);
  const [walkInPending,  setWalkInPending]  = useState(false);
  const [viewingPatient, setViewingPatient] = useState(null);

  const [owners,        setOwners]        = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownersError,   setOwnersError]   = useState(null);

  const [patients,        setPatients]        = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError,   setPatientsError]   = useState(null);

  const [shiftCheckedIn, setShiftCheckedIn] = useState(false);

  const [showAddOwner,   setShowAddOwner]   = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showCheckIn,    setShowCheckIn]    = useState(false);
  const [activityFeed,   setActivityFeed]   = useState([]);
  const [dashRefreshKey, setDashRefreshKey] = useState(0);

  const fetchOwners = useCallback(() => {
    setOwnersLoading(true);
    apiFetch("/users/all")
      .then(data => { setOwners(Array.isArray(data) ? data : []); setOwnersError(null); })
      .catch(err  => setOwnersError(err.message || "Failed to load owners"))
      .finally(()  => setOwnersLoading(false));
  }, []);

  const fetchPatients = useCallback(() => {
    setPatientsLoading(true);
    apiFetch("/pets/all")
      .then(data => { setPatients(Array.isArray(data) ? data : []); setPatientsError(null); })
      .catch(err  => setPatientsError(err.message || "Failed to load patients"))
      .finally(()  => setPatientsLoading(false));
  }, []);

  useEffect(() => {
    fetchOwners();
    fetchPatients();
    apiFetch("/shifts/my-status")
      .then(d => setShiftCheckedIn(!!d))
      .catch(() => {});
  }, [fetchOwners, fetchPatients]);

  const handleShiftToggle = useCallback(async () => {
    try {
      if (shiftCheckedIn) {
        await apiFetch("/shifts/checkout", { method: "POST" });
        setShiftCheckedIn(false);
      } else {
        await apiFetch("/shifts/checkin", { method: "POST" });
        setShiftCheckedIn(true);
      }
      setDashRefreshKey(k => k + 1);
    } catch { /* silent */ }
  }, [shiftCheckedIn]);

  const handleTabChange = (tab) => {
    setActive(tab);
    setViewingPatient(null);
  };

  const handleCheckedIn = useCallback(({ petName, ownerName, vetName, time }) => {
    setShowCheckIn(false);
    setDashRefreshKey(k => k + 1);
    const now = new Date();
    const at  = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
    setActivityFeed(prev => [{
      id:     `ci-${Date.now()}`,
      at,
      who:    "Front desk",
      verb:   "checked in",
      what:   petName,
      detail: `${ownerName}${vetName ? ` · ${vetName}` : ""}${time ? ` ${time}` : ""}`,
    }, ...prev]);
  }, []);

  function renderPage() {
    if (active === "dashboard") {
      return (
        <DashboardPage
          user={user}
          onNavigate={(tab, opts = {}) => { setActive(tab); if (opts?.walkIn) setWalkInPending(true); }}
          onCheckIn={() => setShowCheckIn(true)}
          activityFeed={activityFeed}
          refreshKey={dashRefreshKey}
        />
      );
    }
    if (active === "owners") {
      return (
        <PetOwnersPage
          owners={owners}
          loading={ownersLoading}
          error={ownersError}
          onView={setViewing}
          onAddOwner={!isVet ? () => setShowAddOwner(true) : undefined}
        />
      );
    }
    if (active === "patients") {
      if (viewingPatient) {
        return (
          <PetProfileView
            pet={viewingPatient}
            user={user}
            onBack={() => setViewingPatient(null)}
            onViewOwner={() => { setViewingPatient(null); setActive("owners"); }}
          />
        );
      }
      return (
        <PatientsPage
          patients={patients}
          loading={patientsLoading}
          error={patientsError}
          onViewOwner={() => setActive("owners")}
          onViewPet={setViewingPatient}
          onAddPatient={!isVet ? () => setShowAddPatient(true) : undefined}
        />
      );
    }
    if (active === "appointments") {
      return (
        <AppointmentsPage
          walkIn={walkInPending}
          onWalkInHandled={() => setWalkInPending(false)}
          onWalkInDismissed={() => { setWalkInPending(false); setActive("dashboard"); }}
          patients={patients}
        />
      );
    }
    if (active === "users") {
      return <UserManagementPage />;
    }
    return <PlaceholderPage tabId={active} />;
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <TopNav active={active} onChange={handleTabChange} onLogout={logout} user={user} shiftCheckedIn={shiftCheckedIn} onShiftToggle={handleShiftToggle} />

      <main style={{ flex:1 }}>
        {renderPage()}
      </main>

      <OwnerDetailModal owner={viewing} onClose={() => setViewing(null)} />

      {showAddOwner && (
        <AddOwnerModal onClose={() => setShowAddOwner(false)} onCreated={fetchOwners} />
      )}
      {showAddPatient && (
        <AddPatientModal owners={owners} onClose={() => setShowAddPatient(false)} onCreated={fetchPatients} />
      )}
      <CheckInModal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        patients={patients}
        owners={owners}
        onCheckedIn={handleCheckedIn}
      />
    </div>
  );
}
