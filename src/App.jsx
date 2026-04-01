import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  LayoutDashboard, List, Bell, Settings, Search, Filter, ChevronDown,
  ChevronRight, Clock, AlertTriangle, CheckCircle, Pause, Calendar,
  Users, FileText, ExternalLink, ArrowUpRight, ArrowDownRight, X
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────
const STATUSES = {
  COMPLETED: { label: "Completed", color: "#6CFF93", textColor: "#080707", icon: "✓" },
  IN_PROGRESS: { label: "In Progress", color: "#50ACFF", textColor: "#FFFFFF", icon: "⟳" },
  OUTSTANDING: { label: "Outstanding", color: "#F06859", textColor: "#FFFFFF", icon: "!" },
  ON_HOLD: { label: "On Hold", color: "#F2CC33", textColor: "#080707", icon: "⏸" },
  NOT_STARTED: { label: "Not Started", color: "#D1CCC7", textColor: "#080707", icon: "○" },
};

const CATEGORIES = [
  "Prudential Returns", "AML/CFT Reporting", "Consumer Protection",
  "Licensing & Registration", "Market Conduct", "Cybersecurity",
  "Governance & Controls", "Payments & Settlement"
];

const OWNERS = [
  "Nivetha", "Nitesh Vasudev", "Sara Hassan", "Tommaso Pace",
  "Ahmed El-Shazly", "Khalid Sharafeldin", "Litesh", "Engy"
];

const FREQUENCIES = ["Monthly", "Quarterly", "Semi-Annual", "Annual", "One-Time", "Ad-hoc"];

function generateReportings() {
  const items = [
    { name: "SVF Monthly Prudential Return", cat: 0, owner: 0, freq: 0, status: "COMPLETED", deadline: "2026-04-15" },
    { name: "SVF Quarterly Prudential Return (Q1)", cat: 0, owner: 0, freq: 1, status: "IN_PROGRESS", deadline: "2026-04-30" },
    { name: "Suspicious Transaction Report (GoAML)", cat: 1, owner: 2, freq: 5, status: "COMPLETED", deadline: "2026-03-31" },
    { name: "AML/CFT Risk Assessment – Annual Review", cat: 1, owner: 1, freq: 3, status: "IN_PROGRESS", deadline: "2026-05-31" },
    { name: "Customer Complaints Quarterly Report", cat: 2, owner: 5, freq: 1, status: "OUTSTANDING", deadline: "2026-04-15" },
    { name: "SVF Licence Renewal", cat: 3, owner: 3, freq: 3, status: "NOT_STARTED", deadline: "2026-09-30" },
    { name: "Outsourcing Register – Annual Update", cat: 6, owner: 3, freq: 3, status: "ON_HOLD", deadline: "2026-06-30" },
    { name: "Cybersecurity Incident Report", cat: 5, owner: 4, freq: 5, status: "COMPLETED", deadline: "2026-03-15" },
    { name: "Board Risk Report (Q1)", cat: 6, owner: 1, freq: 1, status: "IN_PROGRESS", deadline: "2026-04-20" },
    { name: "Fraud Liability Framework – Gap Assessment", cat: 7, owner: 0, freq: 4, status: "OUTSTANDING", deadline: "2026-04-10" },
    { name: "Marketing Material Pre-Approval Log", cat: 4, owner: 6, freq: 0, status: "IN_PROGRESS", deadline: "2026-04-05" },
    { name: "Large Transaction Report (LTR)", cat: 1, owner: 2, freq: 0, status: "COMPLETED", deadline: "2026-03-31" },
    { name: "Semi-Annual Compliance Report to Board", cat: 6, owner: 1, freq: 2, status: "NOT_STARTED", deadline: "2026-06-30" },
    { name: "Consumer Protection Self-Assessment", cat: 2, owner: 0, freq: 3, status: "NOT_STARTED", deadline: "2026-08-31" },
    { name: "Cybersecurity Framework Annual Audit", cat: 5, owner: 4, freq: 3, status: "ON_HOLD", deadline: "2026-07-31" },
    { name: "Payment Systems Uptime Report", cat: 7, owner: 7, freq: 1, status: "COMPLETED", deadline: "2026-03-31" },
    { name: "Sanctions Screening – Annual Calibration", cat: 1, owner: 2, freq: 3, status: "IN_PROGRESS", deadline: "2026-05-15" },
    { name: "CBUAE Notice Compliance Gap Register", cat: 4, owner: 0, freq: 1, status: "IN_PROGRESS", deadline: "2026-04-30" },
  ];
  return items.map((item, i) => ({
    id: i + 1,
    name: item.name,
    category: CATEGORIES[item.cat],
    owner: OWNERS[item.owner],
    frequency: FREQUENCIES[item.freq],
    status: item.status,
    deadline: item.deadline,
    daysUntil: Math.ceil((new Date(item.deadline) - new Date("2026-04-01")) / 86400000),
    regRef: `CBUAE/SVF/${2024 + Math.floor(i / 6)}/${(i % 50 + 1).toString().padStart(3, "0")}`,
  }));
}

const REPORTINGS = generateReportings();

// ─── Components ──────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUSES[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.color, color: s.textColor }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function KPICard({ label, value, sub, trend, color = "#6CFF93" }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40 hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold uppercase tracking-wider text-tabby-neutral-6 mb-1">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-tabby-neutral-6 mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? "text-tabby-green-5" : "text-tabby-red"}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────

function DashboardTab() {
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.keys(STATUSES).forEach(k => counts[k] = 0);
    REPORTINGS.forEach(r => counts[r.status]++);
    return counts;
  }, []);

  const pieData = Object.entries(statusCounts).map(([k, v]) => ({
    name: STATUSES[k].label, value: v, color: STATUSES[k].color
  }));

  const catData = useMemo(() => {
    const map = {};
    REPORTINGS.forEach(r => {
      if (!map[r.category]) map[r.category] = { cat: r.category, done: 0, wip: 0, open: 0 };
      if (r.status === "COMPLETED") map[r.category].done++;
      else if (r.status === "IN_PROGRESS") map[r.category].wip++;
      else map[r.category].open++;
    });
    return Object.values(map);
  }, []);

  const upcoming = useMemo(() =>
    REPORTINGS.filter(r => r.status !== "COMPLETED" && r.daysUntil >= 0 && r.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil), []);

  const overdue = REPORTINGS.filter(r => r.status !== "COMPLETED" && r.daysUntil < 0);
  const completionRate = Math.round((statusCounts.COMPLETED / REPORTINGS.length) * 100);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Total Obligations" value={REPORTINGS.length} sub="CBUAE SVF" />
        <KPICard label="Completed" value={statusCounts.COMPLETED} color="#6CFF93" trend={12} />
        <KPICard label="In Progress" value={statusCounts.IN_PROGRESS} color="#50ACFF" />
        <KPICard label="Outstanding" value={statusCounts.OUTSTANDING + overdue.length} color="#F06859" trend={-8} />
        <KPICard label="Completion Rate" value={`${completionRate}%`} color="#080707" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut */}
        <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
          <h3 className="text-sm font-bold mb-4 text-tabby-black">Status Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40 lg:col-span-2">
          <h3 className="text-sm font-bold mb-4 text-tabby-black">By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} layout="vertical" margin={{ left: 120 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 11, fill: "#59544F" }} width={120} />
              <Tooltip />
              <Bar dataKey="done" stackId="a" fill="#6CFF93" name="Done" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wip" stackId="a" fill="#50ACFF" name="In Progress" />
              <Bar dataKey="open" stackId="a" fill="#F06859" name="Open" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4 text-tabby-black flex items-center gap-2">
          <Clock size={16} /> Upcoming Deadlines (Next 30 Days)
        </h3>
        <div className="space-y-2">
          {upcoming.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-tabby-neutral-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.daysUntil <= 7 ? "bg-tabby-red/10 text-tabby-red" : r.daysUntil <= 14 ? "bg-yellow-100 text-yellow-700" : "bg-tabby-green-3 text-tabby-green-6"}`}>
                  {r.daysUntil}d
                </span>
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-tabby-neutral-6">{r.owner} • {r.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-tabby-neutral-6">{r.deadline}</span>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Registry Tab ────────────────────────────────────────────────

function RegistryTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return REPORTINGS.filter(r => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (catFilter !== "ALL" && r.category !== catFilter) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
          !r.owner.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, statusFilter, catFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tabby-neutral-6" />
          <input
            type="text"
            placeholder="Search obligations or owners..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-tabby-neutral-5 text-sm focus:outline-none focus:border-tabby-green-5"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-tabby-neutral-5 text-sm bg-white"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-tabby-neutral-5 text-sm bg-white"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-tabby-neutral-6">{filtered.length} of {REPORTINGS.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-tabby-neutral-5/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-tabby-black text-white">
                {["#", "Obligation", "Category", "Owner", "Frequency", "Deadline", "Days", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-t border-tabby-neutral-5/30 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white" : "bg-tabby-neutral-2"} hover:bg-tabby-green-3/30`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3 text-tabby-neutral-6 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-tabby-neutral-7">{r.category}</td>
                  <td className="px-4 py-3">{r.owner}</td>
                  <td className="px-4 py-3 text-tabby-neutral-7">{r.frequency}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.deadline}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${r.daysUntil < 0 ? "text-tabby-red" : r.daysUntil <= 7 ? "text-tabby-red" : r.daysUntil <= 14 ? "text-yellow-600" : "text-tabby-green-5"}`}>
                      {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d overdue` : `${r.daysUntil}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-tabby-neutral-6 font-mono mb-1">{selected.regRef}</p>
                  <h2 className="text-lg font-extrabold">{selected.name}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-tabby-neutral-2">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  ["Status", <StatusBadge status={selected.status} />],
                  ["Category", selected.category],
                  ["Owner", selected.owner],
                  ["Frequency", selected.frequency],
                  ["Deadline", selected.deadline],
                  ["Days Remaining", <span className={selected.daysUntil < 0 ? "text-tabby-red font-bold" : ""}>{selected.daysUntil < 0 ? `${Math.abs(selected.daysUntil)} days overdue` : `${selected.daysUntil} days`}</span>],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-tabby-neutral-5/30">
                    <span className="text-xs font-semibold uppercase text-tabby-neutral-6">{label}</span>
                    <span className="text-sm">{val}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-tabby-neutral-2 rounded-lg">
                <p className="text-xs font-bold uppercase text-tabby-neutral-6 mb-2">Slack Notification Preview</p>
                <div className="bg-white rounded-lg p-3 border border-tabby-neutral-5/40 text-xs font-mono space-y-1">
                  <p className="font-bold">🔔 #compliance-reporting</p>
                  <p className="text-tabby-neutral-7">
                    <strong>@{selected.owner}</strong> — <em>{selected.name}</em> is due on {selected.deadline} ({selected.daysUntil > 0 ? `${selected.daysUntil} days` : "OVERDUE"}).
                    Please update status or escalate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────

function NotificationsTab() {
  const tiers = [
    { days: 14, label: "Early Warning", color: "#50ACFF", icon: Bell, channel: "DM to owner" },
    { days: 7, label: "Action Required", color: "#F2CC33", icon: AlertTriangle, channel: "DM + #compliance-reporting" },
    { days: 3, label: "Urgent", color: "#F06859", icon: AlertTriangle, channel: "DM + Channel + MLRO escalation" },
    { days: 0, label: "Overdue", color: "#F06859", icon: X, channel: "DM + Channel + MLRO + Senior Management" },
  ];

  const upcoming = REPORTINGS
    .filter(r => r.status !== "COMPLETED" && r.daysUntil >= 0 && r.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="space-y-6">
      {/* Escalation Tiers */}
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Escalation Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiers.map(t => (
            <div key={t.label} className="rounded-lg p-4 border-l-4" style={{ borderColor: t.color, background: `${t.color}10` }}>
              <div className="flex items-center gap-2 mb-2">
                <t.icon size={16} style={{ color: t.color }} />
                <span className="text-sm font-bold">{t.label}</span>
              </div>
              <p className="text-xs text-tabby-neutral-7">Trigger: {t.days === 0 ? "On deadline day" : `${t.days} days before`}</p>
              <p className="text-xs text-tabby-neutral-6 mt-1">{t.channel}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Notifications */}
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Pending Notifications ({upcoming.length})</h3>
        <div className="space-y-3">
          {upcoming.map(r => {
            const tier = r.daysUntil <= 3 ? tiers[2] : r.daysUntil <= 7 ? tiers[1] : tiers[0];
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-tabby-neutral-5/30 hover:bg-tabby-neutral-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-tabby-neutral-6">{r.owner} • Due {r.deadline}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold" style={{ color: tier.color }}>{tier.label}</span>
                  <p className="text-xs text-tabby-neutral-6">{tier.channel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Architecture Tab ────────────────────────────────────────────

function ArchitectureTab() {
  const phases = [
    {
      num: 1, title: "Static Dashboard (Current)", status: "COMPLETED",
      desc: "React + Vite app with hardcoded sample data. Tabby-branded. Deploy to GitHub Pages or Vercel.",
      tech: "React, Vite, Tailwind, Recharts"
    },
    {
      num: 2, title: "Notion Backend", status: "IN_PROGRESS",
      desc: "Connect to Notion database as the source of truth. Read/write obligations via Notion API.",
      tech: "Notion API, Notion MCP, n8n"
    },
    {
      num: 3, title: "Slack Notifications", status: "NOT_STARTED",
      desc: "Automated tiered reminders via Slack webhooks/Bolt. Escalation chain: Owner → MLRO → Senior Management.",
      tech: "Slack Bolt / Webhooks, n8n workflows"
    },
    {
      num: 4, title: "Self-Hosted on AI Server", status: "NOT_STARTED",
      desc: "Docker Compose deployment on Tabby's AI server. FastAPI backend, PostgreSQL, n8n for automation.",
      tech: "Docker, FastAPI, PostgreSQL, n8n, Nginx"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Implementation Roadmap</h3>
        <div className="space-y-4">
          {phases.map(p => (
            <div key={p.num} className="flex gap-4 p-4 rounded-lg border border-tabby-neutral-5/30">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm"
                style={{
                  background: p.status === "COMPLETED" ? "#6CFF93" : p.status === "IN_PROGRESS" ? "#50ACFF" : "#D1CCC7",
                  color: p.status === "IN_PROGRESS" ? "#FFF" : "#080707"
                }}>
                {p.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold">{p.title}</h4>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-tabby-neutral-7 mb-2">{p.desc}</p>
                <p className="text-xs text-tabby-neutral-6">Stack: {p.tech}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-tabby-neutral-5/40">
        <h3 className="text-sm font-bold mb-4">Self-Hosting Architecture</h3>
        <div className="font-mono text-xs bg-tabby-black text-tabby-green p-4 rounded-lg overflow-x-auto whitespace-pre">{`
┌─────────────────────────────────────────────────────────┐
│                   Docker Compose                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  React   │  │ FastAPI  │  │ Postgres │  │   n8n   │ │
│  │ Frontend │◄─┤ Backend  ├──┤   DB     │  │ (cron)  │ │
│  │ :3000    │  │ :8000    │  │ :5432    │  │ :5678   │ │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────┬────┘ │
│       │              │                           │       │
│  ┌────▼──────────────▼───────────────────────────▼────┐ │
│  │                  Nginx Reverse Proxy :80/443        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  External: Notion API ←→ Slack API ←→ Gmail API         │
└─────────────────────────────────────────────────────────┘
        `}</div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "registry", label: "Registry", icon: List },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "architecture", label: "Architecture", icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-tabby-neutral-2">
      {/* Header */}
      <header className="bg-tabby-black text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-tabby-green flex items-center justify-center text-tabby-black font-extrabold text-sm">₸</div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">RCM Dashboard</h1>
            <p className="text-[10px] text-tabby-neutral-6">CBUAE SVF Regulatory Compliance Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-tabby-neutral-6">
          <Calendar size={14} />
          <span>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="bg-white border-b border-tabby-neutral-5/40 px-6">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-tabby-green text-tabby-black"
                  : "border-transparent text-tabby-neutral-6 hover:text-tabby-black"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "registry" && <RegistryTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "architecture" && <ArchitectureTab />}
      </main>
    </div>
  );
}
