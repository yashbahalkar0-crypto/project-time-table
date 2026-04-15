"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { DAY_NAMES, getSubjectColor } from "@/lib/utils";

type ViewMode = "batch" | "teacher" | "room";

interface ConflictInfo {
  type: string;
  id: string;
  name?: string;
  timeslot: string;
  message?: string;
}

export default function TimetablePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("batch");
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [exporting, setExporting] = useState("");

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editConflicts, setEditConflicts] = useState<ConflictInfo[]>([]);
  const [editValidating, setEditValidating] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Availability state for smart filtering
  const [availableFaculty, setAvailableFaculty] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getSchedules(),
      api.getBatches(),
      api.getTeachers(),
      api.getRooms(),
      api.getSubjects(),
      api.getTimeSlots(),
    ]).then(([s, b, t, r, sub, ts]) => {
      setSchedules(s);
      setBatches(b);
      setTeachers(t);
      setRooms(r);
      setSubjects(sub);
      setTimeSlots(ts.filter((t: any) => !t.isBreak));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSchedule && selectedFilter) {
      loadEntries();
    } else if (selectedSchedule) {
      api.getSchedule(selectedSchedule.id).then(s => setEntries(s.entries || [])).catch(console.error);
    }
  }, [selectedSchedule, selectedFilter, viewMode]);

  const loadEntries = async () => {
    if (!selectedSchedule || !selectedFilter) return;
    try {
      let data;
      switch (viewMode) {
        case "batch": data = await api.getScheduleByBatch(selectedSchedule.id, selectedFilter); break;
        case "teacher": data = await api.getScheduleByTeacher(selectedSchedule.id, selectedFilter); break;
        case "room": data = await api.getScheduleByRoom(selectedSchedule.id, selectedFilter); break;
      }
      setEntries(data);
    } catch (err: any) { setError(err.message); }
  };

  // Build grid data
  const allSlotIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const e of entries) indices.add(e.timeSlot.slotIndex);
    return [...indices].sort((a, b) => a - b);
  }, [entries]);

  const subjectIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const e of entries) {
      if (!map.has(e.subjectId)) map.set(e.subjectId, i++);
    }
    return map;
  }, [entries]);

  const getEntry = (day: number, slotIdx: number) => {
    return entries.find(e => e.timeSlot.dayOfWeek === day && e.timeSlot.slotIndex === slotIdx);
  };

  const getSlotLabel = (slotIdx: number) => {
    for (const e of entries) {
      if (e.timeSlot.slotIndex === slotIdx) {
        return e.timeSlot.label.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday)\s*/, '');
      }
    }
    return `Slot ${slotIdx}`;
  };

  const filterOptions = viewMode === "batch" ? batches : viewMode === "teacher" ? teachers : rooms;

  // ═══ EDIT ENTRY WITH CONFLICT CHECKING ═══

  const openEditModal = async (entry: any) => {
    setEditingEntry(entry);
    setEditForm({
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      batchId: entry.batchId,
      timeSlotId: entry.timeSlotId,
    });
    setEditConflicts([]);
    setEditError("");

    // Load availability for current timeslot
    if (selectedSchedule) {
      await loadAvailability(entry.timeSlotId, entry.id);
    }
  };

  const loadAvailability = async (timeslotId: string, excludeEntryId?: string) => {
    if (!selectedSchedule) return;
    try {
      const [faculty, roomsAvail, batchesAvail] = await Promise.all([
        api.getResourceAvailability(selectedSchedule.id, timeslotId, 'faculty', excludeEntryId),
        api.getResourceAvailability(selectedSchedule.id, timeslotId, 'room', excludeEntryId),
        api.getResourceAvailability(selectedSchedule.id, timeslotId, 'student_group', excludeEntryId),
      ]);
      setAvailableFaculty(faculty);
      setAvailableRooms(roomsAvail);
      setAvailableBatches(batchesAvail);
    } catch (err) {
      console.error('Failed to load availability:', err);
    }
  };

  const handleTimeslotChange = async (newTimeslotId: string) => {
    setEditForm((prev: any) => ({ ...prev, timeSlotId: newTimeslotId }));
    if (selectedSchedule && editingEntry) {
      await loadAvailability(newTimeslotId, editingEntry.id);
    }
  };

  const validateEdit = async () => {
    if (!selectedSchedule || !editingEntry) return;
    setEditValidating(true);
    setEditConflicts([]);
    try {
      const result = await api.validateEntry(selectedSchedule.id, {
        ...editForm,
        excludeEntryId: editingEntry.id,
      });
      if (!result.valid) {
        setEditConflicts(result.conflicts || []);
      }
    } catch (err: any) {
      setEditError(err.message);
    }
    setEditValidating(false);
  };

  // Validate whenever form changes
  useEffect(() => {
    if (editingEntry && editForm.teacherId && editForm.roomId && editForm.batchId && editForm.timeSlotId) {
      const timer = setTimeout(validateEdit, 300);
      return () => clearTimeout(timer);
    }
  }, [editForm.teacherId, editForm.roomId, editForm.batchId, editForm.timeSlotId]);

  const handleSaveEdit = async () => {
    if (!editingEntry || editConflicts.length > 0) return;
    setEditSaving(true);
    setEditError("");
    try {
      await api.updateScheduleEntry(editingEntry.id, editForm);
      setEditingEntry(null);
      // Reload entries
      if (selectedFilter) {
        loadEntries();
      } else if (selectedSchedule) {
        const s = await api.getSchedule(selectedSchedule.id);
        setEntries(s.entries || []);
      }
    } catch (err: any) {
      if (err.message.includes('RESOURCE_CONFLICT')) {
        setEditError("Resource conflict detected. Another entry is using a required resource at this time slot.");
      } else {
        setEditError(err.message);
      }
    }
    setEditSaving(false);
  };

  // Schedule actions
  const handleStatusChange = async (status: string) => {
    if (!selectedSchedule) return;
    try {
      await api.updateScheduleStatus(selectedSchedule.id, status);
      const updated = await api.getSchedules();
      setSchedules(updated);
      setSelectedSchedule(updated.find((s: any) => s.id === selectedSchedule.id));
      setShowActions(false);
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;
    if (!confirm(`Are you sure you want to delete "${selectedSchedule.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteSchedule(selectedSchedule.id);
      const updated = await api.getSchedules();
      setSchedules(updated);
      setSelectedSchedule(updated.length > 0 ? updated[0] : null);
      setEntries([]);
      setShowActions(false);
    } catch (err: any) { setError(err.message); }
  };

  // Export functions
  const buildTableData = useCallback(() => {
    const header = ['Time', ...DAY_NAMES];
    const rows: string[][] = [];
    for (const slotIdx of allSlotIndices) {
      const row = [getSlotLabel(slotIdx)];
      for (let day = 0; day < 5; day++) {
        const entry = getEntry(day, slotIdx);
        if (entry) {
          row.push(`${entry.subject?.name || '—'} | ${entry.teacher?.name?.split(' ').pop() || ''} | ${entry.room?.code || ''}`);
        } else {
          row.push('');
        }
      }
      rows.push(row);
    }
    return { header, rows };
  }, [entries, allSlotIndices]);

  const exportCSV = () => {
    setExporting("csv");
    try {
      const { header, rows } = buildTableData();
      const filterLabel = selectedFilter
        ? filterOptions.find((f: any) => f.id === selectedFilter)?.name || ''
        : 'All';
      
      let csv = `"${selectedSchedule?.name} - ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${filterLabel}"\n\n`;
      csv += header.map(h => `"${h}"`).join(',') + '\n';
      for (const row of rows) {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `timetable_${viewMode}_${filterLabel.replace(/\s+/g, '_')}.csv`);
    } catch (err: any) { setError(err.message); }
    setExporting("");
  };

  const exportJSON = () => {
    setExporting("json");
    try {
      const exportData = {
        schedule: {
          name: selectedSchedule?.name,
          status: selectedSchedule?.status,
          fitnessScore: selectedSchedule?.fitnessScore,
          conflictCount: selectedSchedule?.conflictCount,
        },
        viewMode,
        filter: selectedFilter ? filterOptions.find((f: any) => f.id === selectedFilter)?.name : 'All',
        generatedAt: new Date().toISOString(),
        entries: entries.map(e => ({
          day: DAY_NAMES[e.timeSlot.dayOfWeek],
          time: e.timeSlot.label,
          subject: e.subject?.name,
          subjectCode: e.subject?.code,
          teacher: e.teacher?.name,
          room: e.room?.name,
          roomCode: e.room?.code,
          batch: e.batch?.name,
          isLab: e.subject?.isLab,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `timetable_${viewMode}.json`);
    } catch (err: any) { setError(err.message); }
    setExporting("");
  };

  const exportHTML = () => {
    setExporting("html");
    try {
      const filterLabel = selectedFilter
        ? filterOptions.find((f: any) => f.id === selectedFilter)?.name || ''
        : 'All';

      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedSchedule?.name} - Timetable</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; }
    h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(135deg, #7c3aed, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
    table { width: 100%; border-collapse: separate; border-spacing: 4px; }
    th { padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
    td { padding: 4px; }
    .cell { border-radius: 10px; padding: 10px; min-height: 60px; font-size: 12px; }
    .cell-empty { background: rgba(255,255,255,0.02); min-height: 60px; border-radius: 10px; }
    .cell .name { font-weight: 600; margin-bottom: 4px; }
    .cell .info { opacity: 0.7; font-size: 10px; }
    .c0 { background: linear-gradient(135deg, hsl(250 60% 25%), hsl(250 60% 35%)); color: hsl(250 80% 85%); }
    .c1 { background: linear-gradient(135deg, hsl(180 60% 20%), hsl(180 60% 30%)); color: hsl(180 80% 85%); }
    .c2 { background: linear-gradient(135deg, hsl(320 50% 25%), hsl(320 50% 35%)); color: hsl(320 70% 85%); }
    .c3 { background: linear-gradient(135deg, hsl(40 60% 22%), hsl(40 60% 32%)); color: hsl(40 80% 85%); }
    .c4 { background: linear-gradient(135deg, hsl(140 50% 20%), hsl(140 50% 30%)); color: hsl(140 70% 85%); }
    .c5 { background: linear-gradient(135deg, hsl(210 60% 22%), hsl(210 60% 32%)); color: hsl(210 80% 85%); }
    .c6 { background: linear-gradient(135deg, hsl(10 60% 25%), hsl(10 60% 35%)); color: hsl(10 80% 85%); }
    .c7 { background: linear-gradient(135deg, hsl(270 50% 25%), hsl(270 50% 35%)); color: hsl(270 70% 85%); }
    .footer { margin-top: 32px; text-align: center; color: #475569; font-size: 11px; }
    @media print { body { background: white; color: #1e293b; padding: 20px; } }
  </style>
</head>
<body>
  <h1>📅 ${selectedSchedule?.name}</h1>
  <div class="subtitle">${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${filterLabel} • Generated by ChronoTable</div>
  <table>
    <thead><tr><th>Time</th>${DAY_NAMES.map(d => `<th>${d}</th>`).join('')}</tr></thead>
    <tbody>`;

      for (const slotIdx of allSlotIndices) {
        html += `<tr><td>${getSlotLabel(slotIdx)}</td>`;
        for (let day = 0; day < 5; day++) {
          const entry = getEntry(day, slotIdx);
          if (entry) {
            const colorIdx = subjectIndexMap.get(entry.subjectId) || 0;
            html += `<td><div class="cell c${colorIdx % 8}">
              <div class="name">${entry.subject?.name || '—'}</div>
              <div class="info">${entry.teacher?.name?.split(' ').pop() || ''} • ${entry.room?.code || ''}</div>
            </div></td>`;
          } else {
            html += `<td><div class="cell-empty"></div></td>`;
          }
        }
        html += `</tr>`;
      }

      html += `</tbody></table>
  <div class="footer">Generated by ChronoTable • ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      downloadBlob(blob, `timetable_${viewMode}_${filterLabel.replace(/\s+/g, '_')}.html`);
    } catch (err: any) { setError(err.message); }
    setExporting("");
  };

  const printTimetable = () => {
    const filterLabel = selectedFilter
      ? filterOptions.find((f: any) => f.id === selectedFilter)?.name || ''
      : 'All';

    let printContent = `<style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; }
      h1 { font-size: 24px; margin-bottom: 4px; color: #7c3aed; }
      .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 11px; }
      th { background: #f1f5f9; font-weight: 600; color: #475569; }
      .entry { font-weight: 600; }
      .entry-info { font-size: 9px; color: #64748b; margin-top: 2px; }
    </style>
    <h1>📅 ${selectedSchedule?.name}</h1>
    <div class="subtitle">${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}: ${filterLabel} • Fitness: ${selectedSchedule?.fitnessScore?.toFixed(1)} • Conflicts: ${selectedSchedule?.conflictCount}</div>
    <table>
      <thead><tr><th>Time</th>${DAY_NAMES.map(d => `<th>${d}</th>`).join('')}</tr></thead>
      <tbody>`;

    for (const slotIdx of allSlotIndices) {
      printContent += `<tr><td>${getSlotLabel(slotIdx)}</td>`;
      for (let day = 0; day < 5; day++) {
        const entry = getEntry(day, slotIdx);
        if (entry) {
          printContent += `<td>
            <div class="entry">${entry.subject?.name || '—'}</div>
            <div class="entry-info">${entry.teacher?.name?.split(' ').pop() || ''} • ${entry.room?.code || ''}</div>
          </td>`;
        } else {
          printContent += `<td></td>`;
        }
      }
      printContent += `</tr>`;
    }

    printContent += `</tbody></table>
    <div style="text-align:center;margin-top:16px;color:#94a3b8;font-size:10px;">Generated by ChronoTable • ${new Date().toLocaleDateString()}</div>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timetable Viewer</h1>
          <p className="text-muted-foreground mt-1">View, manage, and export generated schedules</p>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-foreground hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <span>⚡</span> Actions
                <svg className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showActions && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl border border-white/10 py-2 z-50 shadow-2xl">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Export</div>
                  <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3">
                    <span>📄</span> Export as CSV
                  </button>
                  <button onClick={exportJSON} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3">
                    <span>📋</span> Export as JSON
                  </button>
                  <button onClick={exportHTML} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3">
                    <span>🌐</span> Export as HTML
                  </button>
                  <button onClick={printTimetable} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3">
                    <span>🖨️</span> Print Timetable
                  </button>
                  <div className="border-t border-white/5 my-1" />
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</div>
                  {selectedSchedule?.status !== 'PUBLISHED' && (
                    <button onClick={() => handleStatusChange('PUBLISHED')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3 text-green-400">
                      <span>✅</span> Publish Schedule
                    </button>
                  )}
                  {selectedSchedule?.status !== 'ARCHIVED' && (
                    <button onClick={() => handleStatusChange('ARCHIVED')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3 text-yellow-400">
                      <span>📦</span> Archive Schedule
                    </button>
                  )}
                  {selectedSchedule?.status !== 'DRAFT' && (
                    <button onClick={() => handleStatusChange('DRAFT')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-3 text-blue-400">
                      <span>📝</span> Set as Draft
                    </button>
                  )}
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={handleDeleteSchedule} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-500/10 transition-colors flex items-center gap-3 text-red-400">
                    <span>🗑️</span> Delete Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Schedule</label>
          <select
            value={selectedSchedule?.id || ""}
            onChange={(e) => {
              const s = schedules.find(s => s.id === e.target.value);
              setSelectedSchedule(s);
              setSelectedFilter("");
            }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
          >
            <option value="">Select schedule...</option>
            {schedules.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">View By</label>
          <div className="flex gap-1">
            {([ { key: "batch", icon: "👥", label: "Batch" }, { key: "teacher", icon: "👨‍🏫", label: "Teacher" }, { key: "room", icon: "🏠", label: "Room" } ] as const).map(v => (
              <button
                key={v.key}
                onClick={() => { setViewMode(v.key); setSelectedFilter(""); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === v.key ? "bg-primary/15 text-primary" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">
            {viewMode === "batch" ? "Batch" : viewMode === "teacher" ? "Teacher" : "Room"}
          </label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
          >
            <option value="">All</option>
            {filterOptions.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Info */}
      {selectedSchedule && (
        <div className="flex flex-wrap gap-3">
          <div className="glass rounded-xl px-4 py-2 text-sm">
            <span className="text-muted-foreground">Fitness: </span>
            <span className="font-bold text-primary">{selectedSchedule.fitnessScore?.toFixed(1)}</span>
          </div>
          <div className="glass rounded-xl px-4 py-2 text-sm">
            <span className="text-muted-foreground">Conflicts: </span>
            <span className={`font-bold ${selectedSchedule.conflictCount === 0 ? 'text-green-400' : 'text-red-400'}`}>
              {selectedSchedule.conflictCount}
            </span>
          </div>
          <div className="glass rounded-xl px-4 py-2 text-sm">
            <span className="text-muted-foreground">Entries: </span>
            <span className="font-bold">{selectedSchedule._count?.entries || entries.length}</span>
          </div>
          <div className={`glass rounded-xl px-4 py-2 text-sm ${
            selectedSchedule.status === 'PUBLISHED' ? 'border border-green-500/20' :
            selectedSchedule.status === 'ARCHIVED' ? 'border border-gray-500/20' :
            'border border-yellow-500/20'
          }`}>
            <span className={
              selectedSchedule.status === 'PUBLISHED' ? 'text-green-400' :
              selectedSchedule.status === 'ARCHIVED' ? 'text-gray-400' :
              'text-yellow-400'
            }>
              {selectedSchedule.status === 'PUBLISHED' && '✅ '}
              {selectedSchedule.status === 'ARCHIVED' && '📦 '}
              {selectedSchedule.status === 'DRAFT' && '📝 '}
              {selectedSchedule.status}
            </span>
          </div>
          {selectedSchedule.generationTime && (
            <div className="glass rounded-xl px-4 py-2 text-sm">
              <span className="text-muted-foreground">Generated in: </span>
              <span className="font-bold text-purple-400">{selectedSchedule.generationTime}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Timetable Grid */}
      {entries.length > 0 ? (
        <div className="glass rounded-2xl p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground w-24">Time</th>
                {DAY_NAMES.map(day => (
                  <th key={day} className="p-3 text-center text-xs font-medium text-muted-foreground">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSlotIndices.map(slotIdx => (
                <tr key={slotIdx}>
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{getSlotLabel(slotIdx)}</td>
                  {[0, 1, 2, 3, 4].map(day => {
                    const entry = getEntry(day, slotIdx);
                    if (!entry) {
                      return <td key={day} className="p-1"><div className="rounded-lg bg-white/3 h-16" /></td>;
                    }
                    const colorIdx = subjectIndexMap.get(entry.subjectId) || 0;
                    return (
                      <td key={day} className="p-1">
                        <div
                          onClick={() => openEditModal(entry)}
                          className={`timetable-cell ${getSubjectColor(colorIdx)} cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group relative`}
                        >
                          <div className="font-semibold truncate">{entry.subject?.name || "—"}</div>
                          <div className="opacity-70 text-[10px] mt-1">
                            {entry.teacher?.name?.split(' ').pop()} • {entry.room?.code}
                          </div>
                          {viewMode !== "batch" && entry.batch && (
                            <div className="opacity-50 text-[9px] mt-0.5">{entry.batch.name}</div>
                          )}
                          {entry.subject?.isLab && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 mt-1 inline-block">LAB</span>
                          )}
                          {/* Edit indicator */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm">✏️</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="text-2xl">⏳</div>
              <div>Loading timetables...</div>
            </div>
          ) : selectedSchedule ? (
            <div className="space-y-3">
              <div className="text-4xl">📅</div>
              <div>Select a filter to view the timetable</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl">🧬</div>
              <div className="text-lg font-medium">No schedules found</div>
              <p className="text-sm">Generate a timetable first from the Generate page</p>
              <a href="/dashboard/generate" className="inline-block mt-2 px-6 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all">
                Go to Generate →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {entries.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Subject Legend</h4>
          <div className="flex flex-wrap gap-2">
            {[...subjectIndexMap.entries()].map(([subjectId, idx]) => {
              const entry = entries.find(e => e.subjectId === subjectId);
              return (
                <div key={subjectId} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getSubjectColor(idx)}`}>
                  {entry?.subject?.name || subjectId}
                  {entry?.subject?.isLab && ' 🔬'}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ EDIT ENTRY MODAL ═══ */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingEntry(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-lg w-full mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold">Edit Schedule Entry</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Resources conflicting at this time slot are greyed out
                </p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground">
                ✕
              </button>
            </div>

            {/* Conflict warnings */}
            {editConflicts.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-400 text-sm font-semibold">⚠️ Resource Conflicts Detected</span>
                </div>
                <div className="space-y-1.5">
                  {editConflicts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span>{c.message || `${c.type} "${c.name || c.id}" already assigned`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editValidating && (
              <div className="mb-4 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validating resource availability...
              </div>
            )}

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              {/* Time Slot */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Time Slot</label>
                <select
                  value={editForm.timeSlotId}
                  onChange={(e) => handleTimeslotChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {timeSlots.map((ts: any) => (
                    <option key={ts.id} value={ts.id}>
                      {DAY_NAMES[ts.dayOfWeek]} — {ts.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty with availability */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Faculty
                  {availableFaculty.length > 0 && (
                    <span className="ml-2 text-[10px] text-green-400">
                      {availableFaculty.filter(f => f.available).length}/{availableFaculty.length} available
                    </span>
                  )}
                </label>
                <select
                  value={editForm.teacherId}
                  onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {teachers.map((t: any) => {
                    const avail = availableFaculty.find(f => f.resourceId === t.id);
                    const isUnavailable = avail && !avail.available && t.id !== editForm.teacherId;
                    return (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={isUnavailable}
                        className={isUnavailable ? 'text-red-400' : ''}
                      >
                        {t.name}{isUnavailable ? ` ⛔ (assigned: ${avail.conflictingSubject || 'busy'})` : avail?.available === true ? ' ✅' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Room with availability */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Room / Lab
                  {availableRooms.length > 0 && (
                    <span className="ml-2 text-[10px] text-green-400">
                      {availableRooms.filter(r => r.available).length}/{availableRooms.length} available
                    </span>
                  )}
                </label>
                <select
                  value={editForm.roomId}
                  onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {rooms.map((r: any) => {
                    const avail = availableRooms.find(a => a.resourceId === r.id);
                    const isUnavailable = avail && !avail.available && r.id !== editForm.roomId;
                    return (
                      <option
                        key={r.id}
                        value={r.id}
                        disabled={isUnavailable}
                        className={isUnavailable ? 'text-red-400' : ''}
                      >
                        {r.name} ({r.type}){isUnavailable ? ` ⛔ (assigned: ${avail.conflictingSubject || 'busy'})` : avail?.available === true ? ' ✅' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Batch with availability */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">
                  Student Group
                  {availableBatches.length > 0 && (
                    <span className="ml-2 text-[10px] text-green-400">
                      {availableBatches.filter(b => b.available).length}/{availableBatches.length} available
                    </span>
                  )}
                </label>
                <select
                  value={editForm.batchId}
                  onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {batches.map((b: any) => {
                    const avail = availableBatches.find(a => a.resourceId === b.id);
                    const isUnavailable = avail && !avail.available && b.id !== editForm.batchId;
                    return (
                      <option
                        key={b.id}
                        value={b.id}
                        disabled={isUnavailable}
                        className={isUnavailable ? 'text-red-400' : ''}
                      >
                        {b.name}{isUnavailable ? ` ⛔ (assigned: ${avail.conflictingSubject || 'busy'})` : avail?.available === true ? ' ✅' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Subject</label>
                <select
                  value={editForm.subjectId}
                  onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resource exclusivity info */}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 text-[11px] text-amber-400/70">
                <span>🛡️</span>
                <span>Resource exclusivity is enforced. Unavailable resources are marked with ⛔ and disabled.</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={editConflicts.length > 0 || editSaving || editValidating}
                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSaving ? 'Saving...' : editConflicts.length > 0 ? '⚠️ Conflicts Detected' : '✅ Save Changes'}
              </button>
              <button
                onClick={() => setEditingEntry(null)}
                className="px-6 py-2.5 glass rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close actions */}
      {showActions && <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />}
    </div>
  );
}
