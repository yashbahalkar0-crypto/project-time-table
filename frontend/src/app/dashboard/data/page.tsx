"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Tab = "departments" | "semesters" | "teachers" | "subjects" | "rooms" | "batches" | "timeslots" | "assignments";

export default function DataManagementPage() {
  const [tab, setTab] = useState<Tab>("departments");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Time slot generation state
  const [tsGenerating, setTsGenerating] = useState(false);

  useEffect(() => {
    loadData();
    api.getDepartments().then(setDepartments).catch(() => {});
    api.getSemesters().then(setSemesters).catch(() => {});
    api.getSubjects().then(setSubjects).catch(() => {});
    api.getTeachers().then(setTeachers).catch(() => {});
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      switch (tab) {
        case "departments": setData(await api.getDepartments()); break;
        case "semesters": setData(await api.getSemesters()); break;
        case "teachers": setData(await api.getTeachers()); break;
        case "subjects": setData(await api.getSubjects()); break;
        case "rooms": setData(await api.getRooms()); break;
        case "batches": setData(await api.getBatches()); break;
        case "timeslots": setData(await api.getTimeSlots()); break;
        case "assignments": {
          const subs = await api.getSubjects();
          setData(subs.filter((s: any) => s.teachers && s.teachers.length > 0));
          break;
        }
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    try {
      if (tab === "timeslots") {
        // Bulk create time slots
        await api.createTimeSlot(form);
        setShowForm(false);
        setForm({});
        loadData();
        return;
      }

      if (editItem) {
        switch (tab) {
          case "departments": await api.updateDepartment(editItem.id, form); break;
          case "semesters": await api.updateSemester(editItem.id, form); break;
          case "teachers": await api.updateTeacher(editItem.id, form); break;
          case "subjects": await api.updateSubject(editItem.id, form); break;
          case "rooms": await api.updateRoom(editItem.id, form); break;
          case "batches": await api.updateBatch(editItem.id, form); break;
        }
      } else {
        switch (tab) {
          case "departments": await api.createDepartment(form); break;
          case "semesters": await api.createSemester(form); break;
          case "teachers": await api.createTeacher(form); break;
          case "subjects": await api.createSubject(form); break;
          case "rooms": await api.createRoom(form); break;
          case "batches": await api.createBatch(form); break;
        }
      }
      setShowForm(false);
      setEditItem(null);
      setForm({});
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      switch (tab) {
        case "departments": await api.deleteDepartment(id); break;
        case "semesters": await api.deleteSemester(id); break;
        case "teachers": await api.deleteTeacher(id); break;
        case "subjects": await api.deleteSubject(id); break;
        case "rooms": await api.deleteRoom(id); break;
        case "batches": await api.deleteBatch(id); break;
      }
      loadData();
    } catch (err: any) { setError(err.message); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ ...item });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({});
    setShowForm(true);
  };

  const generateDefaultTimeSlots = async () => {
    setTsGenerating(true);
    setError("");
    setSuccess("");
    try {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const slotDefs = [
        { label: '9:00 - 9:50', start: '09:00', end: '09:50', isBreak: false },
        { label: '10:00 - 10:50', start: '10:00', end: '10:50', isBreak: false },
        { label: '11:00 - 11:50', start: '11:00', end: '11:50', isBreak: false },
        { label: '12:00 - 12:30', start: '12:00', end: '12:30', isBreak: true },
        { label: '12:30 - 1:20', start: '12:30', end: '13:20', isBreak: false },
        { label: '1:30 - 2:20', start: '13:30', end: '14:20', isBreak: false },
        { label: '2:30 - 3:20', start: '14:30', end: '15:20', isBreak: false },
        { label: '3:30 - 4:20', start: '15:30', end: '16:20', isBreak: false },
      ];

      const slots = [];
      for (let day = 0; day < 5; day++) {
        for (let i = 0; i < slotDefs.length; i++) {
          slots.push({
            label: `${dayNames[day]} ${slotDefs[i].label}`,
            startTime: slotDefs[i].start,
            endTime: slotDefs[i].end,
            dayOfWeek: day,
            slotIndex: i,
            isBreak: slotDefs[i].isBreak,
          });
        }
      }
      await api.bulkCreateTimeSlots(slots);
      setSuccess("Default time slots created successfully!");
      loadData();
    } catch (err: any) { setError(err.message); }
    setTsGenerating(false);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "departments", label: "Departments", icon: "🏫" },
    { key: "semesters", label: "Semesters", icon: "📆" },
    { key: "teachers", label: "Teachers", icon: "👨‍🏫" },
    { key: "subjects", label: "Subjects", icon: "📚" },
    { key: "rooms", label: "Rooms", icon: "🏠" },
    { key: "batches", label: "Batches", icon: "👥" },
    { key: "timeslots", label: "Time Slots", icon: "⏰" },
    { key: "assignments", label: "Assignments", icon: "🔗" },
  ];

  const renderForm = () => {
    switch (tab) {
      case "departments":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Computer Science & Engineering" />
            <FormField label="Code" value={form.code || ""} onChange={(v) => setForm({ ...form, code: v })} placeholder="CSE" />
          </>
        );
      case "semesters":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Semester 3" />
            <FormField label="Number" value={form.number || ""} onChange={(v) => setForm({ ...form, number: parseInt(v) || 0 })} type="number" />
            <FormField label="Year" value={form.year || ""} onChange={(v) => setForm({ ...form, year: parseInt(v) || 0 })} type="number" />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label className="text-sm text-muted-foreground">Active</label>
            </div>
          </>
        );
      case "teachers":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Dr. John Doe" />
            <FormField label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@college.edu" />
            <FormField label="Phone" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98765 43210" />
            <SelectField label="Department" value={form.departmentId || ""} onChange={(v) => setForm({ ...form, departmentId: v })} options={departments.map(d => ({ value: d.id, label: d.name }))} />
            <FormField label="Max Lectures/Day" value={form.maxLecturesDay || 5} onChange={(v) => setForm({ ...form, maxLecturesDay: parseInt(v) || 5 })} type="number" />
          </>
        );
      case "subjects":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Data Structures" />
            <FormField label="Code" value={form.code || ""} onChange={(v) => setForm({ ...form, code: v })} placeholder="CS301" />
            <SelectField label="Department" value={form.departmentId || ""} onChange={(v) => setForm({ ...form, departmentId: v })} options={departments.map(d => ({ value: d.id, label: d.name }))} />
            <SelectField label="Semester" value={form.semesterId || ""} onChange={(v) => setForm({ ...form, semesterId: v })} options={semesters.map(s => ({ value: s.id, label: s.name }))} />
            <FormField label="Lectures/Week" value={form.lecturesPerWeek || 3} onChange={(v) => setForm({ ...form, lecturesPerWeek: parseInt(v) || 3 })} type="number" />
            <FormField label="Credit Hours" value={form.creditHours || 3} onChange={(v) => setForm({ ...form, creditHours: parseInt(v) || 3 })} type="number" />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isLab || false} onChange={(e) => setForm({ ...form, isLab: e.target.checked })} className="rounded" />
              <label className="text-sm text-muted-foreground">Lab Subject</label>
            </div>
            {form.isLab && (
              <FormField label="Lab Duration (slots)" value={form.labDuration || 2} onChange={(v) => setForm({ ...form, labDuration: parseInt(v) || 2 })} type="number" />
            )}
            <div className="col-span-full">
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Assign Teacher(s)</label>
              <SelectField label="" value={form.teacherIds?.[0] || ""} onChange={(v) => setForm({ ...form, teacherIds: [v] })} options={teachers.map(t => ({ value: t.id, label: `${t.name} (${t.department?.code || ''})` }))} />
            </div>
          </>
        );
      case "rooms":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Room 101" />
            <FormField label="Code" value={form.code || ""} onChange={(v) => setForm({ ...form, code: v })} placeholder="R101" />
            <SelectField label="Type" value={form.type || "CLASSROOM"} onChange={(v) => setForm({ ...form, type: v })} options={[
              { value: "CLASSROOM", label: "Classroom" },
              { value: "LAB", label: "Lab" },
              { value: "SEMINAR_HALL", label: "Seminar Hall" },
              { value: "AUDITORIUM", label: "Auditorium" },
            ]} />
            <FormField label="Capacity" value={form.capacity || 60} onChange={(v) => setForm({ ...form, capacity: parseInt(v) || 60 })} type="number" />
            <SelectField label="Department (optional)" value={form.departmentId || ""} onChange={(v) => setForm({ ...form, departmentId: v || null })} options={[{ value: "", label: "None (shared)" }, ...departments.map(d => ({ value: d.id, label: d.name }))]} />
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.hasProjector || false} onChange={(e) => setForm({ ...form, hasProjector: e.target.checked })} />
                <label className="text-sm text-muted-foreground">Projector</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.hasAC || false} onChange={(e) => setForm({ ...form, hasAC: e.target.checked })} />
                <label className="text-sm text-muted-foreground">AC</label>
              </div>
            </div>
          </>
        );
      case "batches":
        return (
          <>
            <FormField label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="CSE-3A" />
            <FormField label="Code" value={form.code || ""} onChange={(v) => setForm({ ...form, code: v })} placeholder="CSE3A" />
            <SelectField label="Department" value={form.departmentId || ""} onChange={(v) => setForm({ ...form, departmentId: v })} options={departments.map(d => ({ value: d.id, label: d.name }))} />
            <SelectField label="Semester" value={form.semesterId || ""} onChange={(v) => setForm({ ...form, semesterId: v })} options={semesters.map(s => ({ value: s.id, label: s.name }))} />
            <FormField label="Students" value={form.studentCount || 60} onChange={(v) => setForm({ ...form, studentCount: parseInt(v) || 60 })} type="number" />
            <FormField label="Max Lectures/Day" value={form.maxLecturesDay || 6} onChange={(v) => setForm({ ...form, maxLecturesDay: parseInt(v) || 6 })} type="number" />
          </>
        );
      case "timeslots":
        return (
          <>
            <FormField label="Label" value={form.label || ""} onChange={(v) => setForm({ ...form, label: v })} placeholder="Monday 9:00 - 9:50" />
            <FormField label="Start Time" value={form.startTime || ""} onChange={(v) => setForm({ ...form, startTime: v })} placeholder="09:00" />
            <FormField label="End Time" value={form.endTime || ""} onChange={(v) => setForm({ ...form, endTime: v })} placeholder="09:50" />
            <SelectField label="Day of Week" value={form.dayOfWeek?.toString() || "0"} onChange={(v) => setForm({ ...form, dayOfWeek: parseInt(v) })} options={[
              { value: "0", label: "Monday" },
              { value: "1", label: "Tuesday" },
              { value: "2", label: "Wednesday" },
              { value: "3", label: "Thursday" },
              { value: "4", label: "Friday" },
              { value: "5", label: "Saturday" },
            ]} />
            <FormField label="Slot Index" value={form.slotIndex || 0} onChange={(v) => setForm({ ...form, slotIndex: parseInt(v) || 0 })} type="number" />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isBreak || false} onChange={(e) => setForm({ ...form, isBreak: e.target.checked })} className="rounded" />
              <label className="text-sm text-muted-foreground">Break Slot</label>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderTable = () => {
    if (loading) return <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>;
    if (data.length === 0 && tab !== "timeslots" && tab !== "assignments") return <div className="text-center py-12 text-muted-foreground">No data found. Click &quot;Add New&quot; to create one.</div>;

    // Special views for timeslots and assignments
    if (tab === "timeslots") return renderTimeSlotsView();
    if (tab === "assignments") return renderAssignmentsView();

    const columns: Record<string, { key: string; label: string; render?: (item: any) => React.ReactNode }[]> = {
      departments: [
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "_count", label: "Teachers", render: (i) => i._count?.teachers || 0 },
        { key: "_count2", label: "Subjects", render: (i) => i._count?.subjects || 0 },
      ],
      semesters: [
        { key: "name", label: "Name" },
        { key: "number", label: "Number" },
        { key: "year", label: "Year" },
        { key: "isActive", label: "Status", render: (i) => i.isActive ? <span className="text-green-400 text-xs px-2 py-1 rounded-full bg-green-400/10">Active</span> : <span className="text-red-400 text-xs px-2 py-1 rounded-full bg-red-400/10">Inactive</span> },
      ],
      teachers: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "dept", label: "Department", render: (i) => i.department?.name || "-" },
        { key: "maxLecturesDay", label: "Max/Day" },
        { key: "subjects", label: "Subjects", render: (i) => (
          <div className="flex flex-wrap gap-1">
            {i.subjects?.map((st: any) => (
              <span key={st.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {st.subject?.code || '—'}
              </span>
            )) || '—'}
          </div>
        ) },
      ],
      subjects: [
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "dept", label: "Department", render: (i) => i.department?.code || "-" },
        { key: "sem", label: "Semester", render: (i) => i.semester?.name || "-" },
        { key: "lecturesPerWeek", label: "Lec/Week" },
        { key: "isLab", label: "Type", render: (i) => i.isLab ? <span className="text-cyan-400 text-xs px-2 py-1 rounded-full bg-cyan-400/10">Lab</span> : <span className="text-blue-400 text-xs px-2 py-1 rounded-full bg-blue-400/10">Theory</span> },
        { key: "teachers", label: "Teachers", render: (i) => (
          <div className="flex flex-wrap gap-1">
            {i.teachers?.map((st: any) => (
              <span key={st.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                {st.teacher?.name?.split(' ').pop() || '—'}
              </span>
            )) || <span className="text-xs text-red-400">No teacher</span>}
          </div>
        ) },
      ],
      rooms: [
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "type", label: "Type", render: (i) => <span className="text-xs px-2 py-1 rounded-full bg-white/5">{i.type}</span> },
        { key: "capacity", label: "Capacity" },
        { key: "dept", label: "Department", render: (i) => i.department?.code || "Shared" },
        { key: "features", label: "Features", render: (i) => (
          <div className="flex gap-1">
            {i.hasProjector && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">📽️</span>}
            {i.hasAC && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">❄️</span>}
          </div>
        ) },
      ],
      batches: [
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "dept", label: "Department", render: (i) => i.department?.code || "-" },
        { key: "sem", label: "Semester", render: (i) => i.semester?.name || "-" },
        { key: "studentCount", label: "Students" },
        { key: "maxLecturesDay", label: "Max/Day" },
      ],
    };

    const cols = columns[tab];
    if (!cols) return null;

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {cols.map((col) => (
                <th key={col.key} className="text-left text-xs font-medium text-muted-foreground py-3 px-4">{col.label}</th>
              ))}
              <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                {cols.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-sm">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                <td className="py-3 px-4 text-right">
                  <button onClick={() => openEdit(item)} className="text-xs text-primary hover:underline mr-3">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTimeSlotsView = () => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groupedByDay = new Map<number, any[]>();
    for (const slot of data) {
      if (!groupedByDay.has(slot.dayOfWeek)) groupedByDay.set(slot.dayOfWeek, []);
      groupedByDay.get(slot.dayOfWeek)!.push(slot);
    }
    // Sort each day group by slotIndex
    for (const [, slots] of groupedByDay) {
      slots.sort((a: any, b: any) => a.slotIndex - b.slotIndex);
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground">No time slots defined yet.</div>
          <button
            onClick={generateDefaultTimeSlots}
            disabled={tsGenerating}
            className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
          >
            {tsGenerating ? "Creating..." : "🕐 Generate Default Time Slots (Mon-Fri, 8 slots/day)"}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{data.length} slots across {groupedByDay.size} days</div>
          <button
            onClick={generateDefaultTimeSlots}
            disabled={tsGenerating}
            className="px-4 py-2 glass rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {tsGenerating ? "Creating..." : "🔄 Regenerate Defaults"}
          </button>
        </div>
        <div className="grid lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map(day => {
            const slots = groupedByDay.get(day) || [];
            return (
              <div key={day} className="glass rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3 text-center gradient-text">{dayNames[day]}</h4>
                <div className="space-y-1.5">
                  {slots.map((slot: any) => (
                    <div
                      key={slot.id}
                      className={`rounded-lg px-3 py-2 text-xs transition-all ${
                        slot.isBreak
                          ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                          : 'bg-white/5 border border-white/5 text-foreground hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                      {slot.isBreak && <div className="text-[10px] opacity-70 mt-0.5">Break</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAssignmentsView = () => {
    if (loading) return <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>;
    
    return (
      <div className="space-y-4">
        <div className="glass-strong rounded-2xl p-6 border border-primary/10">
          <h3 className="text-lg font-semibold mb-2">📌 Subject → Teacher Assignments</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These assignments are created when you add subjects with teachers in the Subjects tab. 
            Each subject needs at least one teacher assigned for timetable generation.
          </p>
        </div>

        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No subjects with teachers found. Go to Subjects tab and assign teachers when creating subjects.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.map((subject: any) => (
              <div key={subject.id} className="glass rounded-2xl p-5 border border-white/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{subject.name}</h4>
                    <p className="text-xs text-muted-foreground">{subject.code} • {subject.department?.code} • {subject.semester?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${subject.isLab ? 'bg-cyan-400/10 text-cyan-400' : 'bg-blue-400/10 text-blue-400'}`}>
                    {subject.isLab ? 'Lab' : 'Theory'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subject.teachers?.map((st: any) => (
                    <div key={st.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[9px] font-bold text-white">
                        {st.teacher?.name?.charAt(0) || '?'}
                      </div>
                      <span className="text-xs font-medium text-primary">{st.teacher?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Data</h1>
          <p className="text-muted-foreground mt-1">Manage departments, teachers, subjects, rooms, batches, and time slots</p>
        </div>
        {tab !== "timeslots" && tab !== "assignments" && (
          <button onClick={openCreate} className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all">
            + Add New
          </button>
        )}
        {tab === "timeslots" && (
          <button onClick={openCreate} className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all">
            + Add Slot
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowForm(false); setError(""); setSuccess(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? "bg-primary/15 text-primary border border-primary/20" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>
      )}

      {/* Form Modal */}
      {showForm && tab !== "assignments" && (
        <div className="glass-strong rounded-2xl p-6 border border-primary/10">
          <h3 className="text-lg font-semibold mb-4">{editItem ? "Edit" : "Add"} {tab === "timeslots" ? "time slot" : tab.slice(0, -1)}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {renderForm()}
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

      {/* Data Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {renderTable()}
      </div>
    </div>
  );
}

// Reusable form components
function FormField({ label, value, onChange, placeholder, type }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-muted-foreground">{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5 text-muted-foreground">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
      >
        <option value="">Select...</option>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
