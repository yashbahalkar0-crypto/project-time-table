"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CONSTRAINT_TYPES, PRIORITIES, isSystemConstraint } from "@/lib/utils";

export default function ConstraintsPage() {
  const [constraints, setConstraints] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [editItem, setEditItem] = useState<any>(null);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, t, s, r, b] = await Promise.all([
        api.getConstraints(),
        api.getTeachers(),
        api.getSubjects(),
        api.getRooms(),
        api.getBatches(),
      ]);
      setConstraints(c);
      setTeachers(t);
      setSubjects(s);
      setRooms(r);
      setBatches(b);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const handleSave = async () => {
    setError("");
    try {
      const payload = {
        name: form.name,
        type: form.type,
        priority: form.priority || "HIGH",
        isActive: form.isActive ?? true,
        parameters: form.parameters || {},
        teacherId: form.teacherId || null,
        subjectId: form.subjectId || null,
        roomId: form.roomId || null,
        batchId: form.batchId || null,
      };
      if (editItem) {
        await api.updateConstraint(editItem.id, payload);
      } else {
        await api.createConstraint(payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm({});
      loadAll();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string, constraint: any) => {
    if (constraint.isSystem || isSystemConstraint(constraint.type)) {
      setError("System constraints cannot be deleted. They are required for valid timetable generation.");
      return;
    }
    if (!confirm("Delete this constraint?")) return;
    try {
      await api.deleteConstraint(id);
      loadAll();
    } catch (err: any) { setError(err.message); }
  };

  const toggleActive = async (constraint: any) => {
    if (constraint.isSystem || isSystemConstraint(constraint.type)) {
      setError("System constraints are always active and cannot be disabled.");
      return;
    }
    try {
      await api.updateConstraint(constraint.id, { isActive: !constraint.isActive });
      loadAll();
    } catch (err: any) { setError(err.message); }
  };

  const categories = ["All", ...new Set(CONSTRAINT_TYPES.map(ct => ct.category))];
  const filteredConstraints = filterCategory === "All"
    ? constraints
    : constraints.filter(c => {
        const ct = CONSTRAINT_TYPES.find(t => t.value === c.type);
        return ct?.category === filterCategory;
      });

  // Separate system constraints from user constraints
  const systemConstraints = filteredConstraints.filter(c => c.isSystem || isSystemConstraint(c.type));
  const userConstraints = filteredConstraints.filter(c => !c.isSystem && !isSystemConstraint(c.type));

  const selectedType = CONSTRAINT_TYPES.find(ct => ct.value === form.type);

  const getSystemIcon = (type: string) => {
    switch (type) {
      case 'GLOBAL_NO_TEACHER_CONFLICT': return '👨‍🏫';
      case 'GLOBAL_NO_ROOM_CONFLICT': return '🏠';
      case 'GLOBAL_NO_LAB_CONFLICT': return '🔬';
      case 'GLOBAL_NO_BATCH_OVERLAP': return '👥';
      default: return '🔒';
    }
  };

  const getSystemDescription = (type: string) => {
    switch (type) {
      case 'GLOBAL_NO_TEACHER_CONFLICT': return 'No faculty member can be assigned to more than one class at the same time slot.';
      case 'GLOBAL_NO_ROOM_CONFLICT': return 'No classroom can be assigned to more than one class at the same time slot.';
      case 'GLOBAL_NO_LAB_CONFLICT': return 'No laboratory can be assigned to more than one session at the same time slot.';
      case 'GLOBAL_NO_BATCH_OVERLAP': return 'No student group/batch can attend more than one class at the same time slot.';
      default: return 'System-level constraint.';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Constraint Builder</h1>
          <p className="text-muted-foreground mt-1">Define scheduling rules and optimization constraints</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); setForm({ priority: "HIGH", isActive: true }); }}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
        >
          + Add Constraint
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-400 ml-3">✕</button>
        </div>
      )}

      {/* System Constraints Banner */}
      {(filterCategory === "All" || filterCategory === "Global") && systemConstraints.length > 0 && (
        <div className="glass-strong rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg">🛡️</div>
            <div>
              <h3 className="font-semibold text-amber-200">System Constraints</h3>
              <p className="text-xs text-amber-400/60">
                These are core scheduling rules enforced at all levels. They cannot be modified, disabled, or deleted.
              </p>
            </div>
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold text-amber-500/50 bg-amber-500/10 px-3 py-1 rounded-full">
              Non-removable
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {systemConstraints.map((constraint) => (
              <div
                key={constraint.id}
                className="rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 transition-all hover:border-amber-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">{getSystemIcon(constraint.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-amber-100 truncate">{constraint.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold flex-shrink-0 uppercase tracking-wider">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-300/50 leading-relaxed">
                      {getSystemDescription(constraint.type)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                        ✓ Always Active
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                        🔒 Protected
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium">
                        +1000 Penalty
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterCategory === cat ? "bg-primary/15 text-primary border border-primary/20" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
            {cat === "Global" && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                {systemConstraints.length} system
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-strong rounded-2xl p-6 border border-primary/10">
          <h3 className="text-lg font-semibold mb-4">{editItem ? "Edit" : "Create"} Constraint</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Constraint Name</label>
              <input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Dr. Priya no morning classes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Constraint Type</label>
              <select
                value={form.type || ""}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select type...</option>
                {CONSTRAINT_TYPES.filter(ct => !isSystemConstraint(ct.value)).map(ct => (
                  <option key={ct.value} value={ct.value}>[{ct.category}] {ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Priority</label>
              <select
                value={form.priority || "HIGH"}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {selectedType?.category === "Teacher" && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Teacher</label>
                <select value={form.teacherId || ""} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select teacher...</option>
                  {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {selectedType?.category === "Subject" && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Subject</label>
                <select value={form.subjectId || ""} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select subject...</option>
                  {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            )}
            {selectedType?.category === "Room" && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Room</label>
                <select value={form.roomId || ""} onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select room...</option>
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                </select>
              </div>
            )}
            {selectedType?.category === "Batch" && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Batch</label>
                <select value={form.batchId || ""} onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select batch...</option>
                  {batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 col-span-full">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label className="text-sm text-muted-foreground">Active</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all">
              {editItem ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="px-6 py-2.5 glass rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* User Constraint Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading constraints...</div>
      ) : userConstraints.length === 0 && systemConstraints.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No constraints found.</div>
      ) : userConstraints.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No user-defined constraints in this category. Click &quot;+ Add Constraint&quot; to create one.
        </div>
      ) : (
        <div>
          {userConstraints.length > 0 && (
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <span>📋</span> User-Defined Constraints
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5">{userConstraints.length}</span>
            </h3>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {userConstraints.map((constraint) => {
              const ct = CONSTRAINT_TYPES.find(t => t.value === constraint.type);
              const priority = PRIORITIES.find(p => p.value === constraint.priority);
              return (
                <div key={constraint.id} className={`glass rounded-2xl p-5 border transition-all ${constraint.isActive ? 'border-white/5' : 'border-white/3 opacity-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{constraint.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priority?.color} bg-white/5`}>{priority?.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 mr-2">{ct?.category}</span>
                        {ct?.label}
                      </p>
                      {constraint.teacher && <p className="text-xs text-muted-foreground">Teacher: {constraint.teacher.name}</p>}
                      {constraint.subject && <p className="text-xs text-muted-foreground">Subject: {constraint.subject.name}</p>}
                      {constraint.room && <p className="text-xs text-muted-foreground">Room: {constraint.room.name}</p>}
                      {constraint.batch && <p className="text-xs text-muted-foreground">Batch: {constraint.batch.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(constraint)} className={`w-10 h-5 rounded-full transition-all ${constraint.isActive ? 'bg-primary' : 'bg-white/10'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${constraint.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <button onClick={() => { setEditItem(constraint); setForm(constraint); setShowForm(true); }} className="text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => handleDelete(constraint.id, constraint)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
