import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import VisitModal from "./VisitModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_EMOJI = { dog:"🐕", cat:"🐱", rabbit:"🐰", parrot:"🦜", reptile:"🦎", other:"🐾" };
const TYPE_COLOR = {
  dog:    { bg:"oklch(0.90 0.06 250)", color:"oklch(0.35 0.12 250)" },
  cat:    { bg:"oklch(0.90 0.06 320)", color:"oklch(0.38 0.10 320)" },
  rabbit: { bg:"oklch(0.90 0.06 160)", color:"oklch(0.35 0.10 160)" },
  parrot: { bg:"oklch(0.90 0.07 140)", color:"oklch(0.35 0.13 140)" },
  other:  { bg:"oklch(0.90 0.02  60)", color:"oklch(0.40 0.05  60)" },
};

const VACCINE_SCHEDULE = {
  dog:    ["Rabies", "DHPP", "Bordetella", "Leptospirosis"],
  cat:    ["Rabies", "FVRCP", "FeLV"],
  rabbit: ["RHDV2", "Myxomatosis"],
  parrot: ["Polyomavirus"],
  other:  ["Annual wellness exam"],
};

const TEMP_NORMAL = {
  dog:[37.5,39.5], cat:[37.5,39.5], rabbit:[38.0,40.0], parrot:[40.0,42.0], default:[37.5,40.0],
};

// Placeholder data — replace with API calls once DB tables exist
const SAMPLE_LAB_RESULTS = [
  { id:"l1", test:"Complete Blood Count (CBC)",  date:"2026-04-20", vet:"Dr. Amy Stone",     status:"normal"   },
  { id:"l2", test:"Urinalysis",                  date:"2026-03-15", vet:"Dr. David Hoffman", status:"pending"  },
  { id:"l3", test:"Chest X-Ray",                 date:"2026-02-10", vet:"Dr. Amy Stone",     status:"normal"   },
  { id:"l4", test:"Biochemistry Panel",          date:"2025-11-05", vet:"Dr. Amy Stone",     status:"abnormal" },
];

const SAMPLE_PRESCRIPTIONS = [
  { id:"p1", medication:"Amoxicillin",   dosage:"250mg", frequency:"Twice daily",       vet:"Dr. Amy Stone",     start:"2026-04-20", end:"2026-04-30", status:"active"    },
  { id:"p2", medication:"Meloxicam",     dosage:"1.5mg", frequency:"Once daily",        vet:"Dr. David Hoffman", start:"2026-03-01", end:"2026-03-15", status:"completed" },
  { id:"p3", medication:"Metronidazole", dosage:"250mg", frequency:"Three times daily", vet:"Dr. Amy Stone",     start:"2025-12-10", end:"2025-12-20", status:"completed" },
];

const SAMPLE_DOCUMENTS = [
  { id:"d1", name:"Blood Count Report.pdf",          type:"PDF",   date:"2026-04-20", vet:"Dr. Amy Stone"     },
  { id:"d2", name:"Chest X-Ray Scan.jpg",            type:"X-Ray", date:"2026-02-10", vet:"Dr. Amy Stone"     },
  { id:"d3", name:"Annual Wellness Certificate.pdf", type:"PDF",   date:"2026-01-05", vet:"Dr. David Hoffman" },
  { id:"d4", name:"Abdominal Ultrasound.jpg",        type:"Scan",  date:"2025-09-22", vet:"Dr. Amy Stone"     },
];

const PROFILE_TABS = [
  { id:"overview",      emoji:"📋", label:"Overview"            },
  { id:"lab",           emoji:"🧪", label:"Lab Results"         },
  { id:"prescriptions", emoji:"💊", label:"Prescriptions"       },
  { id:"documents",     emoji:"📁", label:"Documents"           },
  { id:"appointments",  emoji:"🗓", label:"Appointment History" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(bd, est) {
  if (!bd) return "—";
  const d = new Date(bd), now = new Date();
  const months = (now.getFullYear()-d.getFullYear())*12+(now.getMonth()-d.getMonth());
  const y=Math.floor(months/12), m=months%12;
  const s = y>0?`${y} yr${y>1?"s":""}${m>0?` ${m} mo`:""}`:(`${months} mo`);
  return est?`~${s} (est.)`:s;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
}
function fmtDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}
function relDays(iso) {
  const diff=Math.floor((new Date(iso)-Date.now())/86400000);
  if(diff<-365) return `${Math.floor(-diff/365)}yr ago`;
  if(diff<-30)  return `${Math.floor(-diff/30)}mo ago`;
  if(diff<-1)   return `${-diff}d ago`;
  if(diff===-1) return "Yesterday";
  if(diff===0)  return "Today";
  if(diff===1)  return "Tomorrow";
  if(diff<=7)   return `in ${diff}d`;
  if(diff<=30)  return `in ${Math.floor(diff/7)}wk`;
  return `in ${Math.floor(diff/30)}mo`;
}
function healthStatus(pet) {
  const m=pet.measurements?.[0];
  if(!m||m.temperature_celsius==null) return "needs_attention";
  const [lo,hi]=TEMP_NORMAL[pet.type_code]||TEMP_NORMAL.default;
  return (m.temperature_celsius<lo||m.temperature_celsius>hi)?"critical":"healthy";
}
function apptStatus(a) {
  if(a.status==="completed")  return "completed";
  if(a.status==="cancelled")  return "cancelled";
  if(new Date(a.appointment_date)>new Date()) return "upcoming";
  return "no_show";
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function HealthBadge({ status }) {
  const map={
    healthy:        {bg:"color-mix(in oklch,oklch(0.75 0.13 150) 20%,transparent)",color:"oklch(0.38 0.13 150)",label:"Healthy"},
    needs_attention:{bg:"color-mix(in oklch,oklch(0.78 0.15 80)  20%,transparent)",color:"oklch(0.45 0.14 70)", label:"Needs Attention"},
    critical:       {bg:"color-mix(in oklch,oklch(0.65 0.18 25)  22%,transparent)",color:"oklch(0.45 0.18 25)", label:"Critical"},
  };
  const s=map[status]||map.needs_attention;
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,background:s.bg,color:s.color,fontFamily:"Inter, sans-serif",fontSize:13,fontWeight:600}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>{s.label}
    </span>
  );
}

function StatusBadge({ label, bg, color }) {
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:8,background:bg,color,fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0}}/>{label}
    </span>
  );
}

function StatPill({ label, value, unit, warn }) {
  return(
    <div style={{display:"flex",flexDirection:"column",gap:2,padding:"10px 14px",borderRadius:12,background:"var(--surface)",border:`1px solid ${warn?"oklch(0.88 0.06 30)":"var(--border)"}`,minWidth:80}}>
      <span style={{fontFamily:"Inter, sans-serif",fontSize:10.5,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
      <span style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:20,fontWeight:500,color:warn?"oklch(0.45 0.16 30)":"var(--ink)",lineHeight:1}}>
        {value!=null?value:"—"}
        {value!=null&&unit&&<span style={{fontFamily:"Inter, sans-serif",fontSize:12,marginLeft:2,color:"var(--muted)"}}>{unit}</span>}
      </span>
    </div>
  );
}

function AddBtn({ label }) {
  return(
    <button onClick={()=>alert(`${label} — coming soon`)} style={{height:30,padding:"0 12px",borderRadius:8,border:"1.5px solid var(--primary)",background:"transparent",color:"var(--primary)",fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
      {label}
    </button>
  );
}

function GhostBtn({ label }) {
  return(
    <button style={{height:28,padding:"0 11px",borderRadius:7,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--ink)",fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600,cursor:"pointer"}}>
      {label}
    </button>
  );
}

// Reusable table shell
function DataTable({ columns, rows, empty }) {
  const [hovered, setHovered] = useState(null);
  if (rows.length===0) return(
    <div style={{textAlign:"center",padding:"36px 0",fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--muted)",fontStyle:"italic"}}>{empty}</div>
  );
  return(
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead>
        <tr>
          {columns.map(c=>(
            <th key={c.key} style={{textAlign:"left",padding:"10px 14px",fontFamily:"Inter, sans-serif",fontSize:11,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid var(--border)",background:"color-mix(in oklch,var(--ink) 2%,var(--surface))",whiteSpace:"nowrap"}}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row,i)=>(
          <tr key={row.id||i} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
            style={{background:hovered===i?"color-mix(in oklch,var(--primary) 5%,transparent)":"transparent",transition:"background 100ms ease",borderBottom:"1px solid var(--border)"}}>
            {columns.map(c=>(
              <td key={c.key} style={{padding:"13px 14px",verticalAlign:"middle"}}>{row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Section wrapper for each tab panel
function Panel({ title, action, children }) {
  return(
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid var(--border)"}}>
        <span style={{fontFamily:"Inter, sans-serif",fontSize:13,fontWeight:700,color:"var(--ink)",textTransform:"uppercase",letterSpacing:"0.03em"}}>{title}</span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return(
    <div style={{display:"flex",gap:2,padding:"5px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,overflowX:"auto",flexShrink:0}}>
      {tabs.map(t=>{
        const on=active===t.id;
        return(
          <button key={t.id} onClick={()=>onChange(t.id)}
            style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:11,border:"none",background:on?"var(--primary)":"transparent",color:on?"white":"var(--ink)",fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:on?600:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all 140ms ease"}}
            onMouseEnter={e=>{if(!on)e.currentTarget.style.background="color-mix(in oklch,var(--ink) 6%,transparent)";}}
            onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent";}}>
            <span>{t.emoji}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ pet, status, onViewOwner }) {
  const tc=TYPE_COLOR[pet.type_code]||TYPE_COLOR.other;
  const latest=pet.measurements?.[0];
  const tempWarn = latest?.temperature_celsius!=null && (()=>{
    const [lo,hi]=TEMP_NORMAL[pet.type_code]||TEMP_NORMAL.default;
    return latest.temperature_celsius<lo||latest.temperature_celsius>hi;
  })();
  return(
    <div style={{background:"color-mix(in oklch,var(--primary) 8%,var(--bg))",border:"1px solid var(--border)",borderRadius:22,padding:"28px 32px",display:"flex",gap:28,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div style={{position:"relative",flexShrink:0}}>
        <div style={{width:110,height:110,borderRadius:26,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:58,boxShadow:"0 8px 24px -12px oklch(0.3 0.08 40 / 0.25)"}}>{TYPE_EMOJI[pet.type_code]||"🐾"}</div>
        <div style={{position:"absolute",bottom:-6,right:-6,width:28,height:28,borderRadius:"50%",background:"var(--surface)",border:"2px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
      </div>
      <div style={{flex:1,minWidth:200}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div>
            <h1 style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:36,fontWeight:600,color:"var(--ink)",margin:0,lineHeight:1.05,letterSpacing:"-0.02em"}}>{pet.name}</h1>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:8,background:tc.bg,color:tc.color,fontFamily:"Inter, sans-serif",fontSize:12.5,fontWeight:600}}>{TYPE_EMOJI[pet.type_code]} {pet.type_name}</span>
              {pet.breed&&<span style={{fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--muted)"}}>{pet.breed}</span>}
            </div>
          </div>
          <HealthBadge status={status}/>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
          <StatPill label="Age"    value={calcAge(pet.birth_date,pet.birth_date_is_estimated)}/>
          <StatPill label="Weight" value={latest?.weight_kg}           unit="kg"/>
          <StatPill label="Height" value={latest?.height_cm}           unit="cm"/>
          <StatPill label="Temp"   value={latest?.temperature_celsius} unit="°C" warn={tempWarn}/>
        </div>
        <div style={{marginTop:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
          <span style={{fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--muted)"}}>Owner:</span>
          <button onClick={()=>onViewOwner(pet.owner?.user_name)}
            style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--primary)",background:"none",border:"none",cursor:"pointer",padding:0}}
            onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
            onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
            {pet.owner?.first_name} {pet.owner?.last_name}
          </button>
          {pet.owner?.telephone&&<span style={{fontFamily:"Inter, sans-serif",fontSize:12.5,color:"var(--muted)"}}> · {pet.owner.telephone}</span>}
          {pet.owner?.city&&<span style={{fontFamily:"Inter, sans-serif",fontSize:12.5,color:"var(--muted)"}}> · {pet.owner.city}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ profile }) {
  const [lo,hi]=TEMP_NORMAL[profile.type_code]||TEMP_NORMAL.default;
  const vaccines=VACCINE_SCHEDULE[profile.type_code]||VACCINE_SCHEDULE.other;
  const baseDate=profile.measurements?.[0]?.measured_at?new Date(profile.measurements[0].measured_at):null;
  const aboutRows=[
    ["Species",      profile.type_name],
    ["Breed",        profile.breed||"Mixed / Unknown"],
    ["Date of birth",profile.birth_date?`${fmtDate(profile.birth_date)}${profile.birth_date_is_estimated?" (estimated)":""}` : "Unknown"],
    ["Age",          calcAge(profile.birth_date,profile.birth_date_is_estimated)],
    ["Sex",          "Not recorded"],
    ["Microchip",    "Not recorded"],
    ["City",         profile.owner?.city||"—"],
  ];

  return(
    <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:14}}>
      {/* Left */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* About */}
        <Panel title="🐾 About">
          <div style={{padding:"4px 20px 4px"}}>
            {aboutRows.map(([label,val],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<aboutRows.length-1?"1px solid var(--border)":"none"}}>
                <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--muted)"}}>{label}</span>
                <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)",fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{val}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Measurements */}
        <Panel title="📊 Measurements & Vitals" action={<AddBtn label="Log Measurement"/>}>
          {profile.measurements.length===0?(
            <div style={{padding:"24px",textAlign:"center",fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--muted)",fontStyle:"italic"}}>No measurements recorded yet.</div>
          ):(
            <div>
              {profile.measurements.map((m,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,padding:"12px 20px",borderBottom:i<profile.measurements.length-1?"1px solid var(--border)":"none",alignItems:"start"}}>
                  {[["Date",fmtDateShort(m.measured_at)],["Weight",m.weight_kg!=null?`${m.weight_kg} kg`:"—"],["Height",m.height_cm!=null?`${m.height_cm} cm`:"—"],["Temp",m.temperature_celsius!=null?`${m.temperature_celsius}°C`:"—"]].map(([lbl,val],j)=>(
                    <div key={j}>
                      <div style={{fontFamily:"Inter, sans-serif",fontSize:10.5,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{lbl}</div>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:15,color:lbl==="Temp"&&m.temperature_celsius!=null&&(m.temperature_celsius<lo||m.temperature_celsius>hi)?"oklch(0.45 0.18 25)":"var(--ink)"}}>{val}</div>
                    </div>
                  ))}
                  {m.notes&&<div style={{gridColumn:"1/-1",fontFamily:"Inter, sans-serif",fontSize:12,color:"var(--muted)",fontStyle:"italic"}}>{m.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Right */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Vaccinations */}
        <Panel title="💉 Vaccinations" action={<AddBtn label="Log Vaccine"/>}>
          <div style={{padding:"12px 20px",display:"flex",flexDirection:"column",gap:8}}>
            {vaccines.map((name,i)=>{
              let dueLabel="No record", badgeStyle={bg:"color-mix(in oklch,var(--ink) 6%,transparent)",color:"var(--muted)"};
              if(baseDate){
                const due=new Date(baseDate); due.setMonth(due.getMonth()+12+i*2);
                const days=Math.floor((due-Date.now())/86400000);
                if(days<0){dueLabel=`Overdue ${-days}d`;badgeStyle={bg:"color-mix(in oklch,oklch(0.65 0.18 25) 15%,transparent)",color:"oklch(0.45 0.18 25)"};}
                else if(days<=30){dueLabel=`Due in ${days}d`;badgeStyle={bg:"color-mix(in oklch,oklch(0.78 0.15 70) 18%,transparent)",color:"oklch(0.42 0.14 65)"};}
                else{dueLabel=`Due ${fmtDateShort(due.toISOString())}`;badgeStyle={bg:"color-mix(in oklch,oklch(0.75 0.13 150) 18%,transparent)",color:"oklch(0.38 0.13 150)"};}
              }
              return(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:10,background:"color-mix(in oklch,var(--ink) 2%,transparent)",border:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{name}</div>
                    <div style={{fontFamily:"Inter, sans-serif",fontSize:11.5,color:"var(--muted)",marginTop:2}}>Annual · no records logged</div>
                  </div>
                  <span style={{padding:"3px 10px",borderRadius:8,background:badgeStyle.bg,color:badgeStyle.color,fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{dueLabel}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Billing */}
        <Panel title="💳 Billing & Payments" action={<AddBtn label="Create Invoice"/>}>
          <div style={{textAlign:"center",padding:"28px 20px"}}>
            <div style={{fontSize:32,marginBottom:10}}>🧾</div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,fontWeight:500,color:"var(--ink)",marginBottom:6}}>No billing records</div>
            <div style={{fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--muted)",lineHeight:1.5}}>Invoices and receipts for this patient<br/>will appear here once created.</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── Tab: Lab Results ─────────────────────────────────────────────────────────

const LAB_STATUS = {
  normal:   { label:"Normal",   bg:"color-mix(in oklch,oklch(0.75 0.13 150) 20%,transparent)", color:"oklch(0.38 0.13 150)" },
  pending:  { label:"Pending",  bg:"color-mix(in oklch,oklch(0.78 0.15 80)  20%,transparent)", color:"oklch(0.45 0.14 70)"  },
  abnormal: { label:"Abnormal", bg:"color-mix(in oklch,oklch(0.65 0.18 25)  22%,transparent)", color:"oklch(0.45 0.18 25)"  },
};

function LabResultsTab() {
  const cols=[
    { key:"test",    label:"Test Name"    },
    { key:"date",    label:"Date"         },
    { key:"vet",     label:"Requested By" },
    { key:"status",  label:"Status"       },
    { key:"actions", label:"Actions"      },
  ];
  const rows=SAMPLE_LAB_RESULTS.map(r=>{
    const s=LAB_STATUS[r.status]||LAB_STATUS.pending;
    return{
      ...r,
      test:    <span style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{r.test}</span>,
      date:    <div><div style={{fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--ink)",fontWeight:500}}>{fmtDateShort(r.date)}</div><div style={{fontFamily:"Inter, sans-serif",fontSize:11.5,color:"var(--muted)",marginTop:1}}>{relDays(r.date)}</div></div>,
      vet:     <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)"}}>{r.vet}</span>,
      status:  <StatusBadge label={s.label} bg={s.bg} color={s.color}/>,
      actions: <GhostBtn label="View Report"/>,
    };
  });
  return(
    <Panel title="🧪 Lab Results" action={<AddBtn label="Add Lab Result"/>}>
      <DataTable columns={cols} rows={rows} empty="No lab results on record for this patient."/>
    </Panel>
  );
}

// ─── Tab: Prescriptions ───────────────────────────────────────────────────────

const RX_STATUS = {
  active:    { label:"Active",    bg:"color-mix(in oklch,oklch(0.75 0.13 150) 20%,transparent)", color:"oklch(0.38 0.13 150)" },
  completed: { label:"Completed", bg:"color-mix(in oklch,var(--ink) 8%,transparent)",             color:"var(--muted)"         },
  stopped:   { label:"Stopped",   bg:"color-mix(in oklch,oklch(0.65 0.18 25) 20%,transparent)",  color:"oklch(0.45 0.18 25)"  },
};

function PrescriptionsTab() {
  const cols=[
    { key:"medication", label:"Medication"     },
    { key:"dosage",     label:"Dosage & Freq."  },
    { key:"vet",        label:"Prescribed By"   },
    { key:"duration",   label:"Duration"        },
    { key:"status",     label:"Status"          },
    { key:"actions",    label:"Actions"         },
  ];
  const rows=SAMPLE_PRESCRIPTIONS.map(r=>{
    const s=RX_STATUS[r.status]||RX_STATUS.completed;
    return{
      ...r,
      medication:<span style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{r.medication}</span>,
      dosage:    <div><div style={{fontFamily:"Inter, sans-serif",fontSize:13.5,color:"var(--ink)",fontWeight:500}}>{r.dosage}</div><div style={{fontFamily:"Inter, sans-serif",fontSize:11.5,color:"var(--muted)",marginTop:1}}>{r.frequency}</div></div>,
      vet:       <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)"}}>{r.vet}</span>,
      duration:  <div><div style={{fontFamily:"Inter, sans-serif",fontSize:12,color:"var(--ink)"}}>{fmtDateShort(r.start)}</div><div style={{fontFamily:"Inter, sans-serif",fontSize:11,color:"var(--muted)"}}>→ {fmtDateShort(r.end)}</div></div>,
      status:    <StatusBadge label={s.label} bg={s.bg} color={s.color}/>,
      actions:   <GhostBtn label="View Details"/>,
    };
  });
  return(
    <Panel title="💊 Prescriptions" action={<AddBtn label="Add Prescription"/>}>
      <DataTable columns={cols} rows={rows} empty="No prescriptions recorded for this patient."/>
    </Panel>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

const DOC_TYPE_STYLE = {
  PDF:   { bg:"oklch(0.92 0.04 25)",  color:"oklch(0.45 0.14 25)",  icon:"📄" },
  Image: { bg:"oklch(0.92 0.04 240)", color:"oklch(0.42 0.10 240)", icon:"🖼"  },
  "X-Ray":{ bg:"oklch(0.92 0.04 280)", color:"oklch(0.40 0.10 280)", icon:"🔬" },
  Scan:  { bg:"oklch(0.92 0.06 180)", color:"oklch(0.38 0.10 180)", icon:"📡" },
};

function DocumentsTab() {
  const cols=[
    { key:"file",       label:"File"          },
    { key:"type",       label:"Type"          },
    { key:"date",       label:"Upload Date"   },
    { key:"vet",        label:"Uploaded By"   },
    { key:"actions",    label:"Actions"       },
  ];
  const rows=SAMPLE_DOCUMENTS.map(r=>{
    const ts=DOC_TYPE_STYLE[r.type]||DOC_TYPE_STYLE["PDF"];
    return{
      ...r,
      file:   <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{width:34,height:34,borderRadius:9,background:ts.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{ts.icon}</span>
                <span style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{r.name}</span>
              </div>,
      type:   <span style={{padding:"3px 10px",borderRadius:7,background:ts.bg,color:ts.color,fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600}}>{r.type}</span>,
      date:   <div><div style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)",fontWeight:500}}>{fmtDateShort(r.date)}</div><div style={{fontFamily:"Inter, sans-serif",fontSize:11.5,color:"var(--muted)",marginTop:1}}>{relDays(r.date)}</div></div>,
      vet:    <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)"}}>{r.vet}</span>,
      actions:<div style={{display:"inline-flex",gap:6}}><GhostBtn label="View"/><GhostBtn label="Download"/></div>,
    };
  });
  return(
    <Panel title="📁 Documents" action={<AddBtn label="Upload Document"/>}>
      <DataTable columns={cols} rows={rows} empty="No documents uploaded for this patient."/>
    </Panel>
  );
}

// ─── Tab: Appointment History ─────────────────────────────────────────────────

const APPT_STATUS_STYLE = {
  completed:{ label:"Completed", bg:"color-mix(in oklch,oklch(0.75 0.13 150) 20%,transparent)", color:"oklch(0.38 0.13 150)" },
  upcoming: { label:"Upcoming",  bg:"color-mix(in oklch,oklch(0.65 0.12 240) 20%,transparent)", color:"oklch(0.40 0.12 240)" },
  no_show:  { label:"No Show",   bg:"color-mix(in oklch,oklch(0.78 0.15 80)  20%,transparent)", color:"oklch(0.45 0.14 70)"  },
  cancelled:{ label:"Cancelled", bg:"color-mix(in oklch,oklch(0.65 0.18 25)  20%,transparent)", color:"oklch(0.45 0.18 25)"  },
};

function AppointmentsTab({ appointments, onViewVisit }) {
  const sorted=[...appointments].sort((a,b)=>new Date(b.appointment_date)-new Date(a.appointment_date));
  const cols=[
    { key:"datetime", label:"Date & Time"    },
    { key:"reason",   label:"Reason"         },
    { key:"vet",      label:"Attending Vet"  },
    { key:"status",   label:"Status"         },
    { key:"actions",  label:"Actions"        },
  ];
  const rows=sorted.map(a=>{
    const st=APPT_STATUS_STYLE[apptStatus(a)]||APPT_STATUS_STYLE.upcoming;
    return{
      id:a.id,
      datetime:<div><div style={{fontFamily:"Inter, sans-serif",fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{fmtDateTime(a.appointment_date)}</div><div style={{fontFamily:"Inter, sans-serif",fontSize:11.5,color:"var(--muted)",marginTop:1}}>{relDays(a.appointment_date)}</div></div>,
      reason:  <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)"}}>{a.notes||"—"}</span>,
      vet:     <span style={{fontFamily:"Inter, sans-serif",fontSize:13,color:"var(--ink)"}}>{a.vet_name||"Not assigned"}</span>,
      status:  <StatusBadge label={st.label} bg={st.bg} color={st.color}/>,
      actions: a.status==="completed"
        ? <button onClick={()=>onViewVisit?.(a)} style={{height:28,padding:"0 11px",borderRadius:7,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--ink)",fontFamily:"Inter, sans-serif",fontSize:12,fontWeight:600,cursor:"pointer"}}>View Visit</button>
        : <GhostBtn label="View Details"/>,
    };
  });
  return(
    <Panel title="🗓 Appointment History" action={<AddBtn label="Book Appointment"/>}>
      <DataTable columns={cols} rows={rows} empty="No appointment history for this patient."/>
    </Panel>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  const bar=(w,h=14)=><div style={{height:h,borderRadius:h/2,background:"color-mix(in oklch,var(--ink) 7%,transparent)",width:w,animation:"lc-fade 1.4s ease infinite alternate"}}/>;
  return(
    <div style={{padding:"32px 28px",maxWidth:1140,margin:"0 auto"}}>
      <div style={{display:"flex",gap:28,padding:"28px 32px",borderRadius:22,background:"color-mix(in oklch,var(--primary) 8%,var(--bg))",border:"1px solid var(--border)"}}>
        <div style={{width:110,height:110,borderRadius:26,background:"color-mix(in oklch,var(--ink) 8%,transparent)",flexShrink:0}}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>{bar("220px",32)}{bar("140px")}{bar("300px")}</div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PetProfileView({ pet, user, onBack, onViewOwner }) {
  const roles = user?.roles || [];
  const isVet = roles.includes("vet");
  const canWrite = isVet || roles.includes("admin");

  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab,  setActiveTab]  = useState("overview");
  const [visitModal, setVisitModal] = useState(null);

  useEffect(()=>{
    setLoading(true); setFetchError(null);
    apiFetch(`/pets/${pet.id}`)
      .then(d=>setProfile(d))
      .catch(e=>setFetchError(e.message))
      .finally(()=>setLoading(false));
  },[pet.id]);

  const openVisit = async (appointment, readOnly) => {
    let existing = null;
    try {
      existing = await apiFetch(`/visits/appointment/${appointment.id}`);
    } catch { existing = null; }
    setVisitModal({ appointment, existing: existing || null, readOnly });
  };

  const todayAppt = profile?.appointments?.find(a => {
    if (a.status !== "scheduled") return false;
    const d = new Date(a.appointment_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  if(loading) return <LoadingSkeleton/>;
  if(fetchError||!profile) return(
    <div style={{padding:"48px 28px",textAlign:"center"}}>
      <div style={{fontFamily:"Inter, sans-serif",fontSize:15,color:"oklch(0.45 0.16 30)"}}>Could not load profile: {fetchError}</div>
      <button onClick={onBack} style={{marginTop:16,fontFamily:"Inter, sans-serif",fontSize:14,color:"var(--primary)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>← Back to Patients</button>
    </div>
  );

  const status=healthStatus(profile);

  return(
    <div style={{padding:"24px 28px 80px",maxWidth:1140,margin:"0 auto",animation:"lc-fade 220ms ease both"}}>

      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <button onClick={onBack}
          style={{display:"flex",alignItems:"center",gap:8,fontFamily:"Inter, sans-serif",fontSize:14,fontWeight:600,color:"var(--ink)",background:"none",border:"none",cursor:"pointer",padding:"6px 10px",borderRadius:10,transition:"background 120ms ease"}}
          onMouseEnter={e=>e.currentTarget.style.background="color-mix(in oklch,var(--ink) 6%,transparent)"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Patients
        </button>
        <div style={{display:"flex",gap:8}}>
          {canWrite && todayAppt && (
            <button onClick={()=>openVisit(todayAppt, false)}
              style={{height:36,padding:"0 16px",borderRadius:10,border:"none",background:"var(--primary)",color:"white",fontFamily:"Inter, sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7,boxShadow:"0 4px 14px -6px var(--primary)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Start Visit
            </button>
          )}
          {!isVet && (
            <button style={{height:36,padding:"0 16px",borderRadius:10,border:"none",background:"var(--primary)",color:"white",fontFamily:"Inter, sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7,boxShadow:"0 4px 14px -6px var(--primary)"}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <Hero pet={profile} status={status} onViewOwner={onViewOwner}/>

      {/* Tab bar */}
      <div style={{marginTop:16}}>
        <TabBar tabs={PROFILE_TABS} active={activeTab} onChange={setActiveTab}/>
      </div>

      {/* Tab content */}
      <div style={{marginTop:14,animation:"lc-fade 180ms ease both"}} key={activeTab}>
        {activeTab==="overview"      && <OverviewTab       profile={profile}/>}
        {activeTab==="lab"           && <LabResultsTab/>}
        {activeTab==="prescriptions" && <PrescriptionsTab/>}
        {activeTab==="documents"     && <DocumentsTab/>}
        {activeTab==="appointments"  && <AppointmentsTab appointments={profile.appointments} onViewVisit={a=>openVisit(a, true)}/>}
      </div>

      {visitModal && (
        <VisitModal
          appointment={visitModal.appointment}
          pet={profile}
          vetUserId={null}
          existingVisit={visitModal.existing}
          readOnly={visitModal.readOnly && !canWrite}
          onClose={()=>setVisitModal(null)}
          onSaved={()=>{ setVisitModal(null); apiFetch(`/pets/${pet.id}`).then(d=>setProfile(d)).catch(()=>{}); }}
        />
      )}
    </div>
  );
}
