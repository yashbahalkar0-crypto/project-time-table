"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function GeneratePage() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [options, setOptions] = useState({
    populationSize: 60,
    generations: 300,
    mutationRate: 0.15,
    elitismRate: 0.1,
  });
  const [readiness, setReadiness] = useState<any>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const [generationStep, setGenerationStep] = useState(0);

  useEffect(() => {
    api.getSemesters().then(setSemesters).catch(console.error);
    checkReadiness();
  }, []);

  const checkReadiness = async () => {
    setLoadingReadiness(true);
    try {
      const [departments, teachers, subjects, rooms, batches, timeSlots, constraints] = await Promise.all([
        api.getDepartments(),
        api.getTeachers(),
        api.getSubjects(),
        api.getRooms(),
        api.getBatches(),
        api.getTimeSlots(),
        api.getConstraints(),
      ]);

      // Check subject-teacher assignments
      const subjectsWithTeachers = subjects.filter((s: any) => s.teachers && s.teachers.length > 0);

      setReadiness({
        departments: departments.length,
        teachers: teachers.length,
        subjects: subjects.length,
        subjectsWithTeachers: subjectsWithTeachers.length,
        rooms: rooms.length,
        batches: batches.length,
        timeSlots: timeSlots.length,
        constraints: constraints.length,
        isReady: departments.length > 0 && teachers.length > 0 && subjectsWithTeachers.length > 0 && rooms.length > 0 && batches.length > 0 && timeSlots.length > 0,
      });
    } catch (err: any) {
      console.error(err);
    }
    setLoadingReadiness(false);
  };

  const handleGenerate = async () => {
    if (!selectedSemester) { setError("Please select a semester"); return; }
    setError("");
    setGenerating(true);
    setResult(null);
    setGenerationStep(1);

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => Math.min(prev + 1, 5));
    }, 600);

    try {
      const res = await api.generateSchedule({
        semesterId: selectedSemester,
        name: name || `Schedule ${new Date().toLocaleDateString()}`,
        options,
      });
      clearInterval(stepInterval);
      setGenerationStep(6);
      setResult(res);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message);
    }
    setGenerating(false);
  };

  const generationSteps = [
    { label: "Loading academic data...", icon: "📚" },
    { label: "Building allocations...", icon: "🔗" },
    { label: "Initializing population...", icon: "🧬" },
    { label: "Running genetic evolution...", icon: "⚡" },
    { label: "Evaluating fitness scores...", icon: "🎯" },
    { label: "Saving schedule...", icon: "💾" },
  ];

  const readinessChecks = readiness ? [
    { label: "Departments", count: readiness.departments, required: true, icon: "🏫" },
    { label: "Teachers", count: readiness.teachers, required: true, icon: "👨‍🏫" },
    { label: "Subjects (with teachers)", count: readiness.subjectsWithTeachers, required: true, icon: "📚", total: readiness.subjects },
    { label: "Rooms", count: readiness.rooms, required: true, icon: "🏠" },
    { label: "Batches", count: readiness.batches, required: true, icon: "👥" },
    { label: "Time Slots", count: readiness.timeSlots, required: true, icon: "⏰" },
    { label: "Constraints", count: readiness.constraints, required: false, icon: "⚙️" },
  ] : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Generate Timetable</h1>
        <p className="text-muted-foreground mt-1">Run the optimization engine to create a new schedule</p>
      </div>

      {/* Readiness Check */}
      {!loadingReadiness && readiness && (
        <div className={`glass-strong rounded-2xl p-6 border ${readiness.isReady ? 'border-green-500/20 glow-success' : 'border-orange-500/20'}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{readiness.isReady ? '✅' : '⚠️'}</span>
            <div>
              <h3 className="font-semibold">
                {readiness.isReady ? 'System Ready for Generation' : 'Setup Required Before Generation'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {readiness.isReady
                  ? 'All required data is configured. You can generate a timetable.'
                  : 'Please configure the missing items below before generating a timetable.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {readinessChecks.map((check, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 text-center transition-all ${
                  check.count > 0
                    ? 'bg-green-500/10 border border-green-500/20'
                    : check.required
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="text-lg mb-1">{check.icon}</div>
                <div className={`text-xl font-bold ${
                  check.count > 0 ? 'text-green-400' : check.required ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {check.total ? `${check.count}/${check.total}` : check.count}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{check.label}</div>
              </div>
            ))}
          </div>
          {!readiness.isReady && (
            <div className="mt-4 flex gap-2">
              <Link href="/dashboard/data" className="px-4 py-2 glass rounded-xl text-xs font-medium text-primary hover:bg-primary/5 transition-all">
                → Go to Academic Data
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong rounded-2xl p-6 glow-primary">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span> Schedule Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select semester...</option>
                {semesters.filter(s => s.isActive).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Schedule Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring 2026 Schedule"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> Algorithm Parameters
          </h3>
          <div className="space-y-4">
            <div>
              <label className="flex justify-between text-sm font-medium mb-1.5 text-muted-foreground">
                <span>Population Size</span>
                <span className="text-primary font-bold">{options.populationSize}</span>
              </label>
              <input type="range" min={10} max={200} value={options.populationSize}
                onChange={(e) => setOptions({ ...options, populationSize: parseInt(e.target.value) })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>10 (fast)</span><span>200 (thorough)</span>
              </div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium mb-1.5 text-muted-foreground">
                <span>Generations</span>
                <span className="text-primary font-bold">{options.generations}</span>
              </label>
              <input type="range" min={50} max={1000} step={50} value={options.generations}
                onChange={(e) => setOptions({ ...options, generations: parseInt(e.target.value) })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>50 (fast)</span><span>1000 (optimal)</span>
              </div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium mb-1.5 text-muted-foreground">
                <span>Mutation Rate</span>
                <span className="text-primary font-bold">{(options.mutationRate * 100).toFixed(0)}%</span>
              </label>
              <input type="range" min={1} max={50} value={options.mutationRate * 100}
                onChange={(e) => setOptions({ ...options, mutationRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>1% (stable)</span><span>50% (exploratory)</span>
              </div>
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium mb-1.5 text-muted-foreground">
                <span>Elitism Rate</span>
                <span className="text-primary font-bold">{(options.elitismRate * 100).toFixed(0)}%</span>
              </label>
              <input type="range" min={1} max={30} value={options.elitismRate * 100}
                onChange={(e) => setOptions({ ...options, elitismRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>1% (diverse)</span><span>30% (conservative)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Generation Progress */}
      {generating && (
        <div className="glass-strong rounded-2xl p-6 border border-primary/20 glow-primary">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Schedule...
          </h3>
          <div className="space-y-3">
            {generationSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  i < generationStep ? 'bg-green-500/20 text-green-400' :
                  i === generationStep ? 'bg-primary/20 text-primary animate-pulse' :
                  'bg-white/5 text-muted-foreground'
                }`}>
                  {i < generationStep ? '✓' : step.icon}
                </div>
                <span className={`text-sm transition-all ${
                  i < generationStep ? 'text-green-400' :
                  i === generationStep ? 'text-foreground font-medium' :
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500 animate-gradient"
              style={{ width: `${(generationStep / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      {!generating && (
        <div className="text-center">
          <button
            onClick={handleGenerate}
            disabled={generating || !readiness?.isReady}
            className="px-12 py-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl text-lg font-bold text-white hover:opacity-90 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed animate-gradient"
          >
            🧬 Generate Timetable
          </button>
          {!readiness?.isReady && (
            <p className="text-xs text-muted-foreground mt-3">Complete the setup checklist above to enable generation</p>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-strong rounded-2xl p-6 glow-success border border-green-500/20">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>✅</span> Schedule Generated Successfully!
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold gradient-text">{result.stats?.fitnessScore?.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Fitness Score</p>
                <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full" style={{ width: `${Math.min(100, result.stats?.fitnessScore || 0)}%` }} />
                </div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className={`text-3xl font-bold ${result.stats?.conflictCount === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.stats?.conflictCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Conflicts</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold text-cyan-400">{result.stats?.totalEntries}</p>
                <p className="text-xs text-muted-foreground mt-1">Schedule Entries</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-3xl font-bold text-purple-400">{result.stats?.generationTimeMs}ms</p>
                <p className="text-xs text-muted-foreground mt-1">Generation Time</p>
              </div>
            </div>
          </div>

          {/* Conflicts */}
          {result.stats?.conflicts?.length > 0 && (
            <div className="glass rounded-2xl p-6 border border-red-500/20">
              <h4 className="text-lg font-semibold mb-3 text-red-400">⚠️ Conflicts Detected</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.stats.conflicts.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      c.severity === 'HIGH' ? 'bg-red-400' : c.severity === 'MEDIUM' ? 'bg-yellow-400' : 'bg-blue-400'
                    }`} />
                    <span className="text-sm flex-1">{c.description}</span>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-white/5">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/dashboard/timetable" className="px-6 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all">
              📅 View Timetable →
            </Link>
            <Link href="/dashboard/analytics" className="px-6 py-2.5 glass rounded-xl text-sm font-medium text-foreground hover:bg-white/5 transition-all">
              📈 View Analytics
            </Link>
            <button
              onClick={() => { setResult(null); setGenerationStep(0); }}
              className="px-6 py-2.5 glass rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              🔄 Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
