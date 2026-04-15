"use client";
import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">ChronoTable</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Features</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">How It Works</a>
            <a href="#stats" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Stats</a>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/login" className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">AI-Powered Scheduling Engine</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 animate-fade-in">
            Generate Perfect
            <br />
            <span className="gradient-text">College Timetables</span>
            <br />
            in Seconds
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
            Intelligent constraint-based scheduling with genetic algorithm optimization.
            Zero conflicts. Maximum efficiency. Built for modern institutions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-xl text-base font-semibold text-white hover:opacity-90 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105 animate-gradient"
            >
              Start Generating →
            </Link>
            <a
              href="#features"
              className="px-8 py-4 glass rounded-xl text-base font-medium text-foreground hover:bg-white/5 transition-all"
            >
              See Features
            </a>
          </div>
        </div>

        {/* Floating timetable preview */}
        <div className="mt-20 max-w-5xl mx-auto animate-fade-in">
          <div className="glass-strong rounded-2xl p-6 glow-primary">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-muted-foreground">ChronoTable — Schedule Preview</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              <div className="text-xs text-muted-foreground font-medium p-2">Time</div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <div key={day} className="text-xs text-muted-foreground font-medium p-2 text-center">{day}</div>
              ))}
              {['9:00', '10:00', '11:00', '12:30', '1:30', '2:30'].map((time, row) => (
                <>
                  <div key={time} className="text-xs text-muted-foreground p-2">{time}</div>
                  {[0, 1, 2, 3, 4].map(col => {
                    const filled = (row + col) % 3 !== 0;
                    const colorIdx = (row * 5 + col) % 8;
                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`rounded-lg p-2 text-xs transition-all ${
                          filled ? `subject-color-${colorIdx}` : 'bg-white/3'
                        }`}
                      >
                        {filled && (
                          <>
                            <div className="font-semibold truncate">
                              {['Data Structures', 'OS', 'DBMS', 'Networks', 'ML', 'Signals', 'Thermo', 'Fluids'][colorIdx]}
                            </div>
                            <div className="opacity-70 mt-0.5">R{101 + col}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for
            <span className="gradient-text"> Smart Scheduling</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From data management to AI optimization — a complete platform for academic scheduling.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🧬", title: "Genetic Algorithm Engine", desc: "CSP + GA optimization generates conflict-free schedules in seconds, even for complex institutions." },
            { icon: "⚡", title: "Constraint Builder", desc: "Define teacher availability, room rules, lab requirements, and custom constraints with an intuitive UI." },
            { icon: "🎯", title: "Conflict Detection", desc: "Real-time visual indicators for teacher double-booking, room conflicts, and constraint violations." },
            { icon: "📊", title: "Analytics Dashboard", desc: "Track teacher workload, room utilization, free slots, and scheduling efficiency with rich charts." },
            { icon: "✏️", title: "Drag & Drop Editor", desc: "Manually fine-tune any generated timetable with an interactive drag-and-drop grid editor." },
            { icon: "📥", title: "Export Anywhere", desc: "Export timetables as PDF, Excel, CSV, or printable format. Share with one click." },
          ].map((feature, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 group cursor-default">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How <span className="gradient-text">ChronoTable</span> Works
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Input Data", desc: "Add departments, teachers, subjects, rooms, batches, and time slots." },
            { step: "02", title: "Set Constraints", desc: "Define scheduling rules — availability, max loads, room types, breaks." },
            { step: "03", title: "Generate", desc: "Our GA engine creates optimized, conflict-free timetables in seconds." },
            { step: "04", title: "Review & Export", desc: "Fine-tune with drag-and-drop, then export as PDF or Excel." },
          ].map((s, i) => (
            <div key={i} className="text-center group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center text-2xl font-bold gradient-text mb-4 group-hover:scale-110 transition-transform">
                {s.step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="glass-strong rounded-3xl p-12 glow-primary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "200+", label: "Teachers Supported" },
              { num: "100+", label: "Classrooms" },
              { num: "<3s", label: "Generation Time" },
              { num: "99%", label: "Conflict-Free" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">{stat.num}</div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold gradient-text">ChronoTable</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 ChronoTable. Smart scheduling for modern institutions.</p>
        </div>
      </footer>
    </div>
  );
}
