"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  }, []);

  const overview = analytics?.overview || {};

  const statCards = [
    { label: "Departments", value: overview.departmentCount || 0, icon: "🏫", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20" },
    { label: "Teachers", value: overview.teacherCount || 0, icon: "👨‍🏫", color: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/20" },
    { label: "Subjects", value: overview.subjectCount || 0, icon: "📚", color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/20" },
    { label: "Rooms", value: overview.roomCount || 0, icon: "🏠", color: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/20" },
    { label: "Batches", value: overview.batchCount || 0, icon: "👥", color: "from-cyan-500/20 to-teal-500/20", border: "border-cyan-500/20" },
    { label: "Schedules", value: overview.scheduleCount || 0, icon: "📅", color: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/20" },
  ];

  const quickActions = [
    { label: "Add Academic Data", href: "/dashboard/data", icon: "➕", desc: "Manage departments, teachers, subjects" },
    { label: "Configure Constraints", href: "/dashboard/constraints", icon: "⚙️", desc: "Set scheduling rules and limits" },
    { label: "Generate Timetable", href: "/dashboard/generate", icon: "🧬", desc: "Run the optimization engine" },
    { label: "View Timetables", href: "/dashboard/timetable", icon: "📅", desc: "Browse and edit schedules" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your scheduling system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`glass rounded-2xl p-5 border ${card.border} hover:scale-105 transition-all duration-300 cursor-default`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold">
              {loading ? <span className="animate-pulse">—</span> : card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 group border border-transparent hover:border-primary/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{action.icon}</div>
              <h3 className="font-semibold mb-1">{action.label}</h3>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="glass-strong rounded-2xl p-8 glow-primary">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🚀</div>
          <div>
            <h3 className="text-xl font-bold mb-2">Getting Started</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span> Add departments, teachers, subjects, rooms, and batches</li>
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span> Configure scheduling constraints and rules</li>
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span> Run the timetable generation engine</li>
              <li className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span> Review, edit, and export your timetables</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
