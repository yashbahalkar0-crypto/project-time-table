"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AnalyticsPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchedules().then(s => {
      setSchedules(s);
      if (s.length > 0) setSelectedSchedule(s[0].id);
    }).catch(console.error);
    api.getAnalytics().then(setAnalytics).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      api.getAnalytics(selectedSchedule).then(setAnalytics).catch(console.error);
    }
  }, [selectedSchedule]);

  const overview = analytics?.overview || {};
  const sa = analytics?.scheduleAnalytics;

  const maxWorkload = sa ? Math.max(...sa.teacherWorkload.map((t: any) => t.lectures), 1) : 1;

  // Calculate additional stats
  const totalTeacherLectures = sa?.teacherWorkload?.reduce((sum: number, t: any) => sum + t.lectures, 0) || 0;
  const avgTeacherLoad = sa?.teacherWorkload?.length > 0 ? (totalTeacherLectures / sa.teacherWorkload.length).toFixed(1) : '0';
  const avgRoomUtil = sa?.roomUtilization?.length > 0
    ? (sa.roomUtilization.reduce((sum: number, r: any) => sum + r.utilization, 0) / sa.roomUtilization.length).toFixed(0)
    : '0';
  const highUtilRooms = sa?.roomUtilization?.filter((r: any) => r.utilization > 70)?.length || 0;
  const totalFreeSlots = sa?.freeSlots ? Object.values(sa.freeSlots).reduce((sum: any, c: any) => sum + c, 0) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Insights into scheduling efficiency and resource usage</p>
        </div>
        <div>
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select schedule...</option>
            {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Departments", value: overview.departmentCount, icon: "🏫", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20" },
          { label: "Teachers", value: overview.teacherCount, icon: "👨‍🏫", color: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/20" },
          { label: "Subjects", value: overview.subjectCount, icon: "📚", color: "from-green-500/20 to-emerald-500/20", border: "border-green-500/20" },
          { label: "Rooms", value: overview.roomCount, icon: "🏠", color: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/20" },
          { label: "Batches", value: overview.batchCount, icon: "👥", color: "from-cyan-500/20 to-teal-500/20", border: "border-cyan-500/20" },
          { label: "Schedules", value: overview.scheduleCount, icon: "📅", color: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/20" },
        ].map((card, i) => (
          <div key={i} className={`glass rounded-2xl p-4 border ${card.border} hover:scale-105 transition-all duration-300 cursor-default`}>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-lg mb-2`}>
              {card.icon}
            </div>
            <p className="text-xl font-bold">{loading ? "—" : card.value || 0}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {sa && (
        <>
          {/* Schedule Score Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="glass-strong rounded-2xl p-6 glow-primary border border-primary/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-2xl">
                  🎯
                </div>
                <div>
                  <p className="text-3xl font-bold gradient-text">{sa.fitnessScore?.toFixed(1) || '—'}</p>
                  <p className="text-xs text-muted-foreground">Fitness Score</p>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, sa.fitnessScore || 0)}%` }}
                />
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-2xl">
                  📊
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-400">{avgTeacherLoad}</p>
                  <p className="text-xs text-muted-foreground">Avg. Lectures/Teacher</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl">
                  🏠
                </div>
                <div>
                  <p className="text-3xl font-bold text-cyan-400">{avgRoomUtil}%</p>
                  <p className="text-xs text-muted-foreground">Avg. Room Utilization</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-400">{totalFreeSlots as number}</p>
                  <p className="text-xs text-muted-foreground">Total Free Slots</p>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Workload */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>👨‍🏫</span> Teacher Workload Distribution
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {totalTeacherLectures} total lectures across {sa.teacherWorkload.length} teachers
            </p>
            <div className="space-y-3">
              {sa.teacherWorkload.map((teacher: any, i: number) => {
                const percentage = (teacher.lectures / maxWorkload) * 100;
                return (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-40 text-sm truncate flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {teacher.name?.charAt(0) || '?'}
                      </div>
                      <span className="truncate">{teacher.name}</span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-white/5 rounded-full h-7 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ${
                            percentage > 80 ? 'bg-gradient-to-r from-red-500/60 to-orange-500/60' :
                            percentage > 50 ? 'bg-gradient-to-r from-primary/60 to-purple-500/60' :
                            'bg-gradient-to-r from-green-500/40 to-emerald-500/40'
                          }`}
                          style={{ width: `${Math.max(percentage, 15)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{teacher.lectures}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground w-20 text-right flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400/50" />
                      {teacher.activeDays} days
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Utilization */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>🏠</span> Room Utilization
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {highUtilRooms} of {sa.roomUtilization.length} rooms above 70% utilization
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sa.roomUtilization.map((room: any, i: number) => (
                <div key={i} className={`glass rounded-xl p-4 border transition-all hover:scale-[1.02] ${
                  room.utilization > 80 ? 'border-red-500/20' : room.utilization > 50 ? 'border-yellow-500/20' : 'border-green-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{room.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      room.type === 'LAB' ? 'bg-cyan-400/10 text-cyan-400' :
                      room.type === 'SEMINAR_HALL' ? 'bg-purple-400/10 text-purple-400' :
                      'bg-white/5 text-muted-foreground'
                    }`}>{room.type}</span>
                  </div>
                  
                  {/* Circular progress indicator */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                        <circle
                          cx="28" cy="28" r="22" fill="none" strokeWidth="4"
                          strokeDasharray={`${room.utilization * 1.38} 138.2`}
                          strokeLinecap="round"
                          className={
                            room.utilization > 80 ? 'stroke-red-400' :
                            room.utilization > 50 ? 'stroke-yellow-400' :
                            'stroke-green-400'
                          }
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-bold ${
                          room.utilization > 80 ? 'text-red-400' : room.utilization > 50 ? 'text-yellow-400' : 'text-green-400'
                        }`}>{room.utilization}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{room.used} / {room.total}</div>
                      <div className="text-xs text-muted-foreground">slots used</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Free Slots */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>📊</span> Free Slots by Day
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Availability across the week — higher is better for scheduling flexibility
            </p>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(sa.freeSlots || {}).map(([day, count]: any) => {
                const maxFree = Math.max(...Object.values(sa.freeSlots || {}).map(Number), 1);
                const pct = (count / maxFree) * 100;
                return (
                  <div key={day} className="text-center group">
                    <div className="relative mx-auto w-full max-w-[70px]">
                      <div className="w-full bg-white/5 rounded-xl overflow-hidden" style={{ height: '160px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-xl transition-all duration-1000"
                          style={{ 
                            height: `${Math.max(pct, 3)}%`,
                            background: `linear-gradient(to top, hsl(${180 + (pct * 0.6)} 60% 30%), hsl(${180 + (pct * 0.6)} 40% 15%))`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-cyan-400 drop-shadow-lg">{count}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium mt-2">{day}</p>
                    <p className="text-xs text-muted-foreground">free slots</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          <div className="glass-strong rounded-2xl p-6 glow-primary border border-primary/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>💡</span> AI Insights
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {generateInsights(sa, overview).map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3">
                  <span className="text-lg flex-shrink-0">{insight.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium mb-0.5">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!sa && !loading && (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">📈</div>
          <div className="text-lg font-medium text-muted-foreground">Select a schedule to view detailed analytics</div>
          <p className="text-sm text-muted-foreground">Analytics include teacher workload, room utilization, and scheduling insights</p>
        </div>
      )}
    </div>
  );
}

function generateInsights(sa: any, overview: any) {
  const insights = [];

  // Fitness insight
  if (sa.fitnessScore >= 90) {
    insights.push({
      icon: '🏆',
      title: 'Excellent Schedule Quality',
      description: `Fitness score of ${sa.fitnessScore?.toFixed(1)} indicates a well-optimized schedule with minimal constraint violations.`,
    });
  } else if (sa.fitnessScore >= 70) {
    insights.push({
      icon: '👍',
      title: 'Good Schedule Quality',
      description: `Fitness score of ${sa.fitnessScore?.toFixed(1)}. Consider adjusting constraints or running with more generations for better results.`,
    });
  } else {
    insights.push({
      icon: '⚠️',
      title: 'Schedule Needs Improvement',
      description: `Fitness score of ${sa.fitnessScore?.toFixed(1)} suggests significant constraint violations. Try adding more rooms or relaxing some constraints.`,
    });
  }

  // Workload balance
  const loads = sa.teacherWorkload.map((t: any) => t.lectures);
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  if (maxLoad - minLoad > 5) {
    insights.push({
      icon: '⚖️',
      title: 'Unbalanced Workload',
      description: `Teacher workloads range from ${minLoad} to ${maxLoad} lectures. Consider redistributing subject assignments for better balance.`,
    });
  } else {
    insights.push({
      icon: '✅',
      title: 'Balanced Workload',
      description: `Teacher workloads are well-distributed (${minLoad}-${maxLoad} lectures). Good scheduling efficiency.`,
    });
  }

  // Room utilization
  const highUtil = sa.roomUtilization.filter((r: any) => r.utilization > 80);
  const lowUtil = sa.roomUtilization.filter((r: any) => r.utilization < 20);
  if (highUtil.length > 0) {
    insights.push({
      icon: '🔴',
      title: 'High Room Utilization Alert',
      description: `${highUtil.length} room(s) are above 80% utilization. Consider adding more rooms or spreading classes across underused rooms.`,
    });
  }
  if (lowUtil.length > 0) {
    insights.push({
      icon: '💤',
      title: 'Underutilized Rooms',
      description: `${lowUtil.length} room(s) are below 20% utilization. These rooms could be repurposed or classes could be consolidated.`,
    });
  }

  // Free slots
  const freeValues = Object.values(sa.freeSlots || {}).map(Number);
  const maxFree = Math.max(...freeValues);
  const minFree = Math.min(...freeValues);
  const dayWithMostFree = Object.entries(sa.freeSlots || {}).find(([, v]: any) => v === maxFree)?.[0];
  if (dayWithMostFree) {
    insights.push({
      icon: '📅',
      title: `${dayWithMostFree} Has Most Free Slots`,
      description: `${maxFree} free slots on ${dayWithMostFree} vs. ${minFree} on the busiest day. Good for scheduling office hours or extra activities.`,
    });
  }

  return insights;
}
