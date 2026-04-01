import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  LayoutDashboard, List, Bell, Settings, Search, Clock, AlertTriangle,
  CheckCircle, Calendar, X, ArrowUpRight, ArrowDownRight, RefreshCw,
  ExternalLink, FileText, Loader2
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────
// Replace these with your published Google Sheets CSV URLs
// Google Sheets → File → Share → Publish to web → Select sheet → CSV → Publish
const SHEET_URLS = {
  "RCM 2026": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmyObj3nXTpzttVuLxKXzOx8cQIvVHHm82skeIMLRlvhOsVlgResd724alk0pOU2aegxWNwD4dbbkD/pub?gid=393774978&single=true&output=csv",
  "RCM 2025": "PASTE_YOUR_RCM_2025_CSV_URL_HERE",
};

// Column mapping (0-indexed) — matches your Google Sheet
const COL = {
  DATE_RECEIVED: 0, DATE_PUBLISHED: 1, REGULATION_NO: 2, SUBJECT: 3,
  CHANNEL: 4, SENDER: 5, RECIPIENT: 6, REGULATOR: 7, ATTACHMENT: 8,
  APPLICABILITY: 9, ENTITY: 10, DEPARTMENT: 11, BUSINESS_OWNER: 12,
  REG_DEADLINE: 13, INTERNAL_TIMELINE: 14, STATUS: 15, COMPLIANCE_OWNER: 16,
  GAP_ANALYSIS: 17, GAP_LINK: 18, COMMENTS: 19, STAKEHOLDER_INFORMED: 20,
  ACKNOWLEDGED: 21, DATE_SENT: 22, DATE_ACK: 23, ACK_STATUS: 24,
  STAKEHOLDER_COMMENTS: 25,
};

const STATUS_CONFIG = {
  "Compliant":   { label: "Compliant",   color: "#6CFF93", textColor: "#080707", icon: "✓" },
  "In progress": { label: "In Progress", color: "#50ACFF", textColor: "#FFFFFF", icon: "⟳" },
  "Delayed":     { label: "Delayed",     color: "#F06859", textColor: "#FFFFFF", icon: "!" },
  "N/A":         { label: "N/A",         color: "#D1CCC7", textColor: "#080707", icon: "—" },
  "Not Started": { label: "Not Started", color: "#F2CC33", textColor: "#080707", icon: "○" },
  "Unknown":     { label: "Unknown",     color: "#99938E", textColor: "#FFFFFF", icon: "?" },
};

const APPLICABILITY_CONFIG = {
  "Applicable":           { color: "#6CFF93", textColor: "#080707" },
  "Not Applicable":       { color: "#D1CCC7", textColor: "#080707" },
  "Partially Applicable": { color: "#F2CC33", textColor: "#080707" },
  "Info Only":            { color: "#50ACFF", textColor: "#FFFFFF" },
};

function getStatusConfig(status) {
  if (!status || !status.trim()) return STATUS_CONFIG["Unknown"];
  const key = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === status.trim().toLowerCase());
  return key ? STATUS_CONFIG[key] : STATUS_CONFIG["Unknown"];
}

function getApplicabilityConfig(val) {
  if (!val) return { color: "#D1CCC7", textColor: "#080707" };
  const key = Object.keys(APPLICABILITY_CONFIG).find(k => k.toLowerCase() === val.trim().toLowerCase());
  return key ? APPLICABILITY_CONFIG[key] : { color: "#D1CCC7", textColor: "#080707" };
}

// ─── CSV Parser ──────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  for (const line of text.split("\n")) {
    if (inQuotes) {
      current += "\n" + line;
      if ((line.match(/"/g) || []).length % 2 === 1) { inQuotes = false; rows.push(current); current = ""; }
    } else {
      if ((line.match(/"/g) || []).length % 2 === 1) { inQuotes = true; current = line; }
      else rows.push(line);
    }
  }
  return rows.filter(r => r.trim()).map(row => {
    const cells = []; let cell = ""; let q = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { cells.push(cell.trim()); cell = ""; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  });
}

function parseDate(val) {
  if (!val) return null;
  const s = val.trim();
  let d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  const parts = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) { d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1])); if (!isNaN(d.getTime())) return d; }
  return null;
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 86400000);
}

// ─── Demo Data (from your actual RCM Tracker) ───────────────────
function getDemoData() {
  const items = [
    { dateReceived: "16/12/2025", regulationNo: "Notice No. 6689/2025", subject: "Cyber Security Advisory", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Cyber Security", businessOwner: "Rajat Rao", regDeadline: "Immediate Action", internalTimeline: "", status: "", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2025" },
    { dateReceived: "17/12/2025", regulationNo: "No. 6651/2025", subject: "Virtual Asset Service Providers (VASPs) Travel Rule", applicability: "Not Applicable", entity: "N/A", department: "N/A", businessOwner: "N/A", regDeadline: "N/A", internalTimeline: "", status: "N/A", complianceOwner: "N/A", gapAnalysis: "N/A", comments: "Not applicable - applies to VASPs", stakeholderInformed: "Yes", sheet: "RCM 2025" },
    { dateReceived: "17/12/2025", regulationNo: "Notice No. 6439/2025", subject: "Administrative and Financial Penalties for Emiratisation", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "HR", businessOwner: "Halyna Kitor", regDeadline: "Next Board Meeting", internalTimeline: "2026-05-01", status: "In progress", complianceOwner: "Nitesh Vasudev", gapAnalysis: "No", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2025" },
    { dateReceived: "17/12/2025", regulationNo: "Notice No. 6165/2025", subject: "Integration of Transactional Data Elements for Fraud Prevention", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Fraud, Product", businessOwner: "Sergey Bogdanov Andrei Kazarinov", regDeadline: "31/12/2025", internalTimeline: "", status: "Delayed", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Transactional data integration for fraud prevention", stakeholderInformed: "No", sheet: "RCM 2025" },
    { dateReceived: "17/12/2025", regulationNo: "Notice No. 6716/2025", subject: "Cyber Security Advisory", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Cyber Security", businessOwner: "Rajat Rao", regDeadline: "Immediate Action", internalTimeline: "", status: "", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2025" },
    { dateReceived: "18/12/2025", regulationNo: "Notice No. 6762/2025", subject: "Cyber Security Advisory", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Cyber Security", businessOwner: "Rajat Rao", regDeadline: "No deadline identified", internalTimeline: "", status: "", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2025" },
    { dateReceived: "02/01/2026", regulationNo: "Notice No. 6/2026", subject: "Cyber Security Advisory", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Cyber Security", businessOwner: "Rajat Rao", regDeadline: "No deadline identified", internalTimeline: "", status: "", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "05/01/2026", regulationNo: "Notice No. 35/2026", subject: "Cyber Security Advisory", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Cyber Security", businessOwner: "Rajat Rao", regDeadline: "No deadline identified", internalTimeline: "", status: "", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "13/01/2026", regulationNo: "Notice No. 272/2026", subject: "Consumer Protection Standards – Customer Disclosure Requirements", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Compliance, Product", businessOwner: "Nitesh Vasudev Sara Hassan", regDeadline: "30/06/2026", internalTimeline: "2026-05-31", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Consumer disclosure requirements", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "20/01/2026", regulationNo: "Notice No. 380/2026", subject: "AML/CFT Risk Assessment Methodology Update", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Compliance, Risk, IT", businessOwner: "Nitesh Vasudev Sara Hassan", regDeadline: "31/07/2026", internalTimeline: "2026-06-30", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Updated risk assessment methodology", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "02/02/2026", regulationNo: "Notice No. 520/2026", subject: "Identity Verification and eKYC Standards", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Identity Team", businessOwner: "Vladislav Konchakov", regDeadline: "31/08/2026", internalTimeline: "2026-07-31", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "eKYC standards update", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "15/02/2026", regulationNo: "Notice No. 650/2026", subject: "Fraud Prevention Supervision Framework", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Fraud", businessOwner: "Sergey Bogdanov", regDeadline: "30/06/2026", internalTimeline: "2026-05-15", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Fraud supervision framework compliance", stakeholderInformed: "No", sheet: "RCM 2026" },
    { dateReceived: "01/03/2026", regulationNo: "Notice No. 1200/2026", subject: "Annual Compliance Return – SVF Licensees", applicability: "Applicable", entity: "SVF", department: "Compliance", businessOwner: "Nitesh Vasudev Sara Hassan", regDeadline: "30/04/2026", internalTimeline: "2026-04-15", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Annual compliance return", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "10/03/2026", regulationNo: "Notice No. 1400/2026", subject: "Outsourcing Arrangements – Notification Requirements", applicability: "Applicable", entity: "Both (BNPL & SVF)", department: "Compliance, Audit", businessOwner: "Litesh Lalchandani", regDeadline: "30/09/2026", internalTimeline: "2026-08-31", status: "In progress", complianceOwner: "Nitesh Vasudev Sara Hassan", gapAnalysis: "", comments: "Outsourcing notification to CBUAE", stakeholderInformed: "Yes", sheet: "RCM 2026" },
    { dateReceived: "20/03/2026", regulationNo: "Notice No. 1600/2026", subject: "Financial Reporting Standards – Quarterly Prudential Returns", applicability: "Applicable", entity: "SVF", department: "Finance", businessOwner: "Sara Hassan", regDeadline: "15/04/2026", internalTimeline: "2026-04-10", status: "In progress", complianceOwner: "Sara Hassan", gapAnalysis: "", comments: "Q1 2026 prudential returns", stakeholderInformed: "Yes", sheet: "RCM 2026" },
  ];
  return items.map((item, i) => ({ id: i + 1, ...item, acknowledged: "", regulator: "CBUAE", deadlineDays: daysUntil(item.internalTimeline) ?? daysUntil(item.regDeadline) }));
}

// ─── Data Loading ────────────────────────────────────────────────
function useSheetData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const hasRealUrls = Object.values(SHEET_URLS).every(u => u && !u.includes("PASTE_YOUR"));
    if (!hasRealUrls) { setData(getDemoData()); setUsingDemo(true); setLoading(false); setLastRefresh(new Date()); return; }
    try {
      const allRows = [];
      for (const [sheetName, url] of Object.entries(SHEET_URLS)) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
        const parsed = parseCSV(await res.text());
        parsed.slice(1).forEach(row => {
          if (row[COL.DATE_RECEIVED]?.trim()) allRows.push({ cells: row, sheet: sheetName });
        });
      }
      setData(allRows.map((row, i) => {
        const c = row.cells;
        return {
          id: i + 1, dateReceived: c[COL.DATE_RECEIVED] || "", datePublished: c[COL.DATE_PUBLISHED] || "",
          regulationNo: c[COL.REGULATION_NO] || "", subject: c[COL.SUBJECT] || "", regulator: c[COL.REGULATOR] || "CBUAE",
          applicability: c[COL.APPLICABILITY] || "", entity: c[COL.ENTITY] || "", department: c[COL.DEPARTMENT] || "",
          businessOwner: c[COL.BUSINESS_OWNER] || "", regDeadline: c[COL.REG_DEADLINE] || "",
          internalTimeline: c[COL.INTERNAL_TIMELINE] || "", status: c[COL.STATUS] || "",
          complianceOwner: c[COL.COMPLIANCE_OWNER] || "", gapAnalysis: c[COL.GAP_ANALYSIS] || "",
          gapLink: c[COL.GAP_LINK] || "", comments: c[COL.COMMENTS] || "",
          stakeholderInformed: c[COL.STAKEHOLDER_INFORMED] || "", acknowledged: c[COL.ACKNOWLEDGED] || "",
          sheet: row.sheet, deadlineDays: daysUntil(c[COL.INTERNAL_TIMELINE]) ?? daysUntil(c[COL.REG_DEADLINE]),
        };
      }));
      setUsingDemo(false); setLastRefresh(new Date());
    } catch (err) { setError(err.message); setData(getDemoData()); setUsingDemo(true); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, lastRefresh, refresh: fetchData, usingDemo };
}

// ─── Components ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = getStatusConfig(status);
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: s.color, color: s.textColor }}>{s.icon} {s.label}</span>;
}

function ApplicabilityBadge({ value }) {
  const c = getApplicabilityConfig(value);
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={{ background: c.color, color: c.textColor }}>{value || "—"}</span>;
}

function KPICard({ label, value, color = "#6CFF93", sub }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40 hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold uppercase tracking-wider text-tabby-neutral-6 mb-1">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-tabby-neutral-6 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────
function DashboardTab({ data }) {
  const stats = useMemo(() => {
    const s = { total: data.length, applicable: 0, notApplicable: 0, compliant: 0, inProgress: 0, delayed: 0, noStatus: 0 };
    data.forEach(d => {
      const app = d.applicability.toLowerCase();
      if (app.includes("not applicable")) s.notApplicable++;
      else if (app.includes("applicable")) s.applicable++;
      const st = d.status.toLowerCase().trim();
      if (st === "compliant") s.compliant++;
      else if (st === "in progress") s.inProgress++;
      else if (st === "delayed") s.delayed++;
      else s.noStatus++;
    });
    return s;
  }, [data]);

  const applicable = useMemo(() => data.filter(d => d.applicability.toLowerCase().includes("applicable") && !d.applicability.toLowerCase().includes("not")), [data]);

  const statusPie = [
    { name: "Compliant", value: stats.compliant, color: "#6CFF93" },
    { name: "In Progress", value: stats.inProgress, color: "#50ACFF" },
    { name: "Delayed", value: stats.delayed, color: "#F06859" },
    { name: "N/A / No Status", value: stats.noStatus, color: "#D1CCC7" },
  ].filter(d => d.value > 0);

  const deptData = useMemo(() => {
    const map = {};
    applicable.forEach(d => {
      const dept = d.department || "Unassigned";
      if (!map[dept]) map[dept] = { dept, count: 0, compliant: 0, progress: 0, other: 0 };
      map[dept].count++;
      const st = d.status.toLowerCase().trim();
      if (st === "compliant") map[dept].compliant++;
      else if (st === "in progress") map[dept].progress++;
      else map[dept].other++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [applicable]);

  const upcoming = useMemo(() => applicable.filter(d => d.deadlineDays !== null && d.deadlineDays >= 0 && d.deadlineDays <= 90).sort((a, b) => a.deadlineDays - b.deadlineDays), [applicable]);
  const overdue = useMemo(() => applicable.filter(d => d.deadlineDays !== null && d.deadlineDays < 0 && d.status.toLowerCase() !== "compliant").sort((a, b) => a.deadlineDays - b.deadlineDays), [applicable]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard label="Total Notices" value={stats.total} sub="All sheets" color="#080707" />
        <KPICard label="Applicable" value={stats.applicable} color="#080707" />
        <KPICard label="Not Applicable" value={stats.notApplicable} color="#D1CCC7" />
        <KPICard label="Compliant" value={stats.compliant} color="#6CFF93" />
        <KPICard label="In Progress" value={stats.inProgress} color="#50ACFF" />
        <KPICard label="Delayed" value={stats.delayed} color="#F06859" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
          <h3 className="text-sm font-bold mb-4">Status Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={statusPie} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>{statusPie.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}</Pie><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40 lg:col-span-2">
          <h3 className="text-sm font-bold mb-4">By Department (Applicable Only)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 140 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#59544F" }} width={140} /><Tooltip />
              <Bar dataKey="compliant" stackId="a" fill="#6CFF93" name="Compliant" />
              <Bar dataKey="progress" stackId="a" fill="#50ACFF" name="In Progress" />
              <Bar dataKey="other" stackId="a" fill="#D1CCC7" name="Other" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl p-5 border-2 border-tabby-red/30">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-tabby-red"><AlertTriangle size={16} /> Overdue ({overdue.length})</h3>
          <div className="space-y-2">{overdue.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-50">
              <div><p className="text-sm font-medium">{r.subject}</p><p className="text-xs text-tabby-neutral-6">{r.regulationNo} • {r.businessOwner}</p></div>
              <div className="text-right"><span className="text-xs font-bold text-tabby-red">{Math.abs(r.deadlineDays)}d overdue</span><p className="text-xs text-tabby-neutral-6">{r.regDeadline}</p></div>
            </div>
          ))}</div>
        </div>
      )}
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Clock size={16} /> Upcoming Deadlines (Next 90 Days)</h3>
        {upcoming.length === 0 ? <p className="text-sm text-tabby-neutral-6">No upcoming deadlines with parsed dates.</p> : (
          <div className="space-y-2">{upcoming.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-tabby-neutral-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.deadlineDays <= 7 ? "bg-red-100 text-tabby-red" : r.deadlineDays <= 30 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-tabby-green-6"}`}>{r.deadlineDays}d</span>
                <div><p className="text-sm font-medium">{r.subject}</p><p className="text-xs text-tabby-neutral-6">{r.regulationNo} • {r.businessOwner} • {r.department}</p></div>
              </div>
              <div className="flex items-center gap-3"><span className="text-xs text-tabby-neutral-6">{r.internalTimeline || r.regDeadline}</span><StatusBadge status={r.status} /></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

// ─── Registry Tab ────────────────────────────────────────────────
function RegistryTab({ data }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [appFilter, setAppFilter] = useState("ALL");
  const [sheetFilter, setSheetFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const uniqueStatuses = useMemo(() => [...new Set(data.map(d => d.status).filter(Boolean))], [data]);
  const uniqueSheets = useMemo(() => [...new Set(data.map(d => d.sheet))], [data]);

  const filtered = useMemo(() => data.filter(d => {
    if (statusFilter !== "ALL" && d.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (appFilter !== "ALL" && !d.applicability.toLowerCase().includes(appFilter.toLowerCase())) return false;
    if (sheetFilter !== "ALL" && d.sheet !== sheetFilter) return false;
    if (search) { const q = search.toLowerCase(); return d.subject.toLowerCase().includes(q) || d.regulationNo.toLowerCase().includes(q) || d.businessOwner.toLowerCase().includes(q) || d.department.toLowerCase().includes(q) || d.comments.toLowerCase().includes(q); }
    return true;
  }), [data, search, statusFilter, appFilter, sheetFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tabby-neutral-6" />
          <input type="text" placeholder="Search notices, owners, departments..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-tabby-neutral-5 text-sm focus:outline-none focus:border-tabby-green-5" />
        </div>
        <select value={sheetFilter} onChange={e => setSheetFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-tabby-neutral-5 text-sm bg-white">
          <option value="ALL">All Years</option>{uniqueSheets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={appFilter} onChange={e => setAppFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-tabby-neutral-5 text-sm bg-white">
          <option value="ALL">All Applicability</option><option value="applicable">Applicable</option><option value="not applicable">Not Applicable</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-tabby-neutral-5 text-sm bg-white">
          <option value="ALL">All Statuses</option>{uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-tabby-neutral-6">{filtered.length} of {data.length}</span>
      </div>
      <div className="bg-white rounded-xl border border-tabby-neutral-5/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-tabby-black text-white">
              {["#", "Notice No.", "Subject", "Applicability", "Department", "Owner", "Deadline", "Status"].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map((r, i) => (
              <tr key={r.id} className={`border-t border-tabby-neutral-5/30 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white" : "bg-tabby-neutral-2"} hover:bg-tabby-green-3/30`} onClick={() => setSelected(r)}>
                <td className="px-3 py-2.5 text-tabby-neutral-6 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap">{r.regulationNo}</td>
                <td className="px-3 py-2.5 font-medium max-w-xs truncate">{r.subject}</td>
                <td className="px-3 py-2.5"><ApplicabilityBadge value={r.applicability} /></td>
                <td className="px-3 py-2.5 text-xs text-tabby-neutral-7 max-w-[150px] truncate">{r.department}</td>
                <td className="px-3 py-2.5 text-xs max-w-[150px] truncate">{r.businessOwner}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{r.deadlineDays !== null ? <span className={`font-bold ${r.deadlineDays < 0 ? "text-tabby-red" : r.deadlineDays <= 14 ? "text-yellow-600" : "text-tabby-green-5"}`}>{r.deadlineDays < 0 ? `${Math.abs(r.deadlineDays)}d overdue` : `${r.deadlineDays}d`}</span> : <span className="text-tabby-neutral-6">{r.regDeadline || "—"}</span>}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div><p className="text-xs text-tabby-neutral-6 font-mono mb-1">{selected.regulationNo}</p><h2 className="text-lg font-extrabold">{selected.subject}</h2><p className="text-xs text-tabby-neutral-6 mt-1">{selected.sheet} • Received {selected.dateReceived}</p></div>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-tabby-neutral-2"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {[["Status", <StatusBadge status={selected.status} />], ["Applicability", <ApplicabilityBadge value={selected.applicability} />], ["Entity", selected.entity], ["Department(s)", selected.department], ["Business Owner(s)", selected.businessOwner], ["Compliance Owner(s)", selected.complianceOwner], ["Regulatory Deadline", selected.regDeadline], ["Internal Timeline", selected.internalTimeline || "—"], ["Days Remaining", selected.deadlineDays !== null ? <span className={selected.deadlineDays < 0 ? "text-tabby-red font-bold" : "font-bold"}>{selected.deadlineDays < 0 ? `${Math.abs(selected.deadlineDays)} days overdue` : `${selected.deadlineDays} days`}</span> : "—"], ["Gap Analysis", selected.gapAnalysis || "—"], ["Stakeholder Informed", selected.stakeholderInformed || "—"], ["Acknowledged", selected.acknowledged || "—"]].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-tabby-neutral-5/30"><span className="text-xs font-semibold uppercase text-tabby-neutral-6">{label}</span><span className="text-sm text-right max-w-[60%]">{val}</span></div>
                ))}
              </div>
              {selected.comments && <div className="mt-4 p-3 bg-tabby-neutral-2 rounded-lg"><p className="text-xs font-bold uppercase text-tabby-neutral-6 mb-1">Comments</p><p className="text-xs text-tabby-neutral-7">{selected.comments}</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────
function NotificationsTab({ data }) {
  const applicable = useMemo(() => data.filter(d => d.applicability.toLowerCase().includes("applicable") && !d.applicability.toLowerCase().includes("not")), [data]);
  const tiers = [
    { days: 30, label: "Early Warning", color: "#50ACFF", desc: "30+ days — DM to business owner" },
    { days: 14, label: "Action Required", color: "#F2CC33", desc: "14 days — DM + #compliance-rcm" },
    { days: 7, label: "Urgent", color: "#F06859", desc: "7 days — DM + Channel + MLRO" },
    { days: 0, label: "Overdue", color: "#F06859", desc: "Past due — Full escalation" },
  ];
  const needsAttention = useMemo(() => applicable.filter(d => d.deadlineDays !== null && d.deadlineDays <= 30 && d.status.toLowerCase() !== "compliant").sort((a, b) => (a.deadlineDays ?? 999) - (b.deadlineDays ?? 999)), [applicable]);
  const notInformed = useMemo(() => applicable.filter(d => d.stakeholderInformed?.toLowerCase() === "no"), [applicable]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Escalation Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiers.map(t => <div key={t.label} className="rounded-lg p-4 border-l-4" style={{ borderColor: t.color, background: `${t.color}10` }}><span className="text-sm font-bold">{t.label}</span><p className="text-xs text-tabby-neutral-7 mt-1">{t.desc}</p></div>)}
        </div>
      </div>
      {notInformed.length > 0 && (
        <div className="bg-white rounded-xl p-5 border-2 border-tabby-yellow/50">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-600" /> Stakeholders Not Yet Informed ({notInformed.length})</h3>
          <div className="space-y-2">{notInformed.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50"><div><p className="text-sm font-medium">{r.subject}</p><p className="text-xs text-tabby-neutral-6">{r.regulationNo} • Owner: {r.businessOwner}</p></div><StatusBadge status={r.status} /></div>
          ))}</div>
        </div>
      )}
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Deadline Alerts ({needsAttention.length})</h3>
        {needsAttention.length === 0 ? <p className="text-sm text-tabby-neutral-6">No notices with deadlines in the next 30 days.</p> : (
          <div className="space-y-2">{needsAttention.map(r => {
            const tier = r.deadlineDays <= 0 ? tiers[3] : r.deadlineDays <= 7 ? tiers[2] : r.deadlineDays <= 14 ? tiers[1] : tiers[0];
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-tabby-neutral-5/30 hover:bg-tabby-neutral-2">
                <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tier.color }} /><div><p className="text-sm font-medium">{r.subject}</p><p className="text-xs text-tabby-neutral-6">{r.businessOwner} • {r.internalTimeline || r.regDeadline}</p></div></div>
                <div className="text-right"><span className="text-xs font-bold" style={{ color: tier.color }}>{tier.label}</span><p className="text-xs text-tabby-neutral-6">{r.deadlineDays < 0 ? `${Math.abs(r.deadlineDays)}d overdue` : `${r.deadlineDays}d left`}</p></div>
              </div>
            );
          })}</div>
        )}
      </div>
    </div>
  );
}

// ─── Setup Tab ───────────────────────────────────────────────────
function SetupTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Connect Your Google Sheet</h3>
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-tabby-neutral-2 rounded-lg">
            <p className="font-bold mb-2">Step 1: Publish your Google Sheet</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-tabby-neutral-7">
              <li>Open your RCM Tracker Google Sheet</li>
              <li>Go to <strong>File → Share → Publish to web</strong></li>
              <li>Select the <strong>"RCM 2026"</strong> tab → Format: <strong>CSV</strong> → Click <strong>Publish</strong></li>
              <li>Copy the URL</li>
              <li>Repeat for <strong>"RCM 2025"</strong></li>
            </ol>
          </div>
          <div className="p-4 bg-tabby-neutral-2 rounded-lg">
            <p className="font-bold mb-2">Step 2: Update the Dashboard</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-tabby-neutral-7">
              <li>Go to your GitHub repo → <code>src/App.jsx</code></li>
              <li>Click the pencil (edit) icon</li>
              <li>Find <code>SHEET_URLS</code> near the top (around line 8)</li>
              <li>Replace <code>PASTE_YOUR_RCM_2026_CSV_URL_HERE</code> with your URL</li>
              <li>Replace <code>PASTE_YOUR_RCM_2025_CSV_URL_HERE</code> with your URL</li>
              <li>Commit → auto-redeploys in ~2 minutes</li>
            </ol>
          </div>
          <div className="p-4 bg-tabby-green-3/30 rounded-lg">
            <p className="font-bold mb-2">Your Apps Scripts are safe</p>
            <p className="text-xs text-tabby-neutral-7">Publishing as CSV is <strong>read-only</strong>. Your existing automations continue running exactly as before.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Column Mapping</h3>
        <p className="text-xs text-tabby-neutral-7 mb-3">The dashboard reads these columns from your sheet:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {["Date of Receipt", "Regulation/Notice No.", "Notice Subject", "Applicability", "Entity", "Department(s)", "Business Owner(s)", "Regulatory Deadline", "Internal Timeline", "Status", "Compliance Owner(s)", "Gap Analysis Conducted", "Comments", "Stakeholder informed?", "Acknowledged?"].map(col => <div key={col} className="text-xs bg-tabby-neutral-2 px-2 py-1.5 rounded font-mono">{col}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "registry", label: "Registry", icon: List },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "setup", label: "Setup", icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data, loading, error, lastRefresh, refresh, usingDemo } = useSheetData();

  if (loading) return (
    <div className="min-h-screen bg-tabby-neutral-2 flex items-center justify-center">
      <div className="flex items-center gap-3 text-tabby-neutral-6"><Loader2 size={24} className="animate-spin" /><span className="text-sm font-medium">Loading RCM data...</span></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-tabby-neutral-2">
      <header className="bg-tabby-black text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-tabby-green flex items-center justify-center text-tabby-black font-extrabold text-sm">₸</div>
          <div><h1 className="text-sm font-extrabold tracking-tight">RCM Dashboard</h1><p className="text-[10px] text-tabby-neutral-6">CBUAE Regulatory Change Management</p></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-tabby-neutral-6 hover:text-white transition-colors"><RefreshCw size={12} /> Refresh</button>
          {lastRefresh && <span className="text-[10px] text-tabby-neutral-6">Updated {lastRefresh.toLocaleTimeString()}</span>}
          <div className="flex items-center gap-2 text-xs text-tabby-neutral-6"><Calendar size={14} /><span>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>
        </div>
      </header>
      <nav className="bg-white border-b border-tabby-neutral-5/40 px-6">
        <div className="flex gap-1">{TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${activeTab === tab.id ? "border-tabby-green text-tabby-black" : "border-transparent text-tabby-neutral-6 hover:text-tabby-black"}`}><tab.icon size={14} /> {tab.label}</button>
        ))}</div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-6">
        {usingDemo && (
          <div className="bg-tabby-yellow/20 border border-tabby-yellow rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-yellow-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800"><strong>Demo Mode</strong> — Showing sample data from your RCM Tracker. Go to the <button onClick={() => setActiveTab("setup")} className="underline font-bold">Setup tab</button> to connect your live Google Sheet.</div>
          </div>
        )}
        {activeTab === "dashboard" && <DashboardTab data={data} />}
        {activeTab === "registry" && <RegistryTab data={data} />}
        {activeTab === "notifications" && <NotificationsTab data={data} />}
        {activeTab === "setup" && <SetupTab />}
      </main>
    </div>
  );
}
