"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // ── Check if database is already seeded ──
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
        console.log('⏭️  Database already has data, skipping seed.');
        console.log('   Verifying system constraints...');
        await ensureSystemConstraints();
        console.log('✅ System constraints verified.');
        return;
    }
    // ── Clean existing data (fresh seed only) ──
    await prisma.scheduleEntry.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.constraint.deleteMany();
    await prisma.subjectTeacher.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.room.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
    // ── Admin user ──
    const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@college.edu';
    const adminPass = process.env.DEMO_ADMIN_PASSWORD || 'admin123';
    const adminPassword = await bcryptjs_1.default.hash(adminPass, 12);
    await prisma.user.create({
        data: { email: adminEmail, password: adminPassword, name: 'System Admin', role: 'ADMIN' },
    });
    // ── Departments ──
    const cse = await prisma.department.create({ data: { name: 'Computer Science & Engineering', code: 'CSE' } });
    const ece = await prisma.department.create({ data: { name: 'Electronics & Communication', code: 'ECE' } });
    const me = await prisma.department.create({ data: { name: 'Mechanical Engineering', code: 'ME' } });
    // ── Semesters ──
    const sem3 = await prisma.semester.create({ data: { name: 'Semester 3', number: 3, year: 2026, isActive: true } });
    const sem5 = await prisma.semester.create({ data: { name: 'Semester 5', number: 5, year: 2026, isActive: true } });
    // ── Teachers ──
    const teachers = await Promise.all([
        prisma.teacher.create({ data: { name: 'Dr. Priya Sharma', email: 'priya@college.edu', departmentId: cse.id, maxLecturesDay: 4 } }),
        prisma.teacher.create({ data: { name: 'Prof. Rajesh Kumar', email: 'rajesh@college.edu', departmentId: cse.id, maxLecturesDay: 5 } }),
        prisma.teacher.create({ data: { name: 'Dr. Anita Verma', email: 'anita@college.edu', departmentId: cse.id, maxLecturesDay: 4 } }),
        prisma.teacher.create({ data: { name: 'Prof. Suresh Patel', email: 'suresh@college.edu', departmentId: cse.id, maxLecturesDay: 5 } }),
        prisma.teacher.create({ data: { name: 'Dr. Meena Gupta', email: 'meena@college.edu', departmentId: ece.id, maxLecturesDay: 4 } }),
        prisma.teacher.create({ data: { name: 'Prof. Vikram Singh', email: 'vikram@college.edu', departmentId: ece.id, maxLecturesDay: 5 } }),
        prisma.teacher.create({ data: { name: 'Dr. Kavita Joshi', email: 'kavita@college.edu', departmentId: ece.id, maxLecturesDay: 4 } }),
        prisma.teacher.create({ data: { name: 'Prof. Amit Rathore', email: 'amit@college.edu', departmentId: me.id, maxLecturesDay: 5 } }),
        prisma.teacher.create({ data: { name: 'Dr. Sunita Rao', email: 'sunita@college.edu', departmentId: me.id, maxLecturesDay: 4 } }),
        prisma.teacher.create({ data: { name: 'Prof. Deepak Mishra', email: 'deepak@college.edu', departmentId: me.id, maxLecturesDay: 5 } }),
    ]);
    // ── Subjects ──
    const subjects = await Promise.all([
        // CSE Sem 3
        prisma.subject.create({ data: { name: 'Data Structures', code: 'CS301', departmentId: cse.id, semesterId: sem3.id, lecturesPerWeek: 4, isLab: false, creditHours: 4 } }),
        prisma.subject.create({ data: { name: 'Operating Systems', code: 'CS302', departmentId: cse.id, semesterId: sem3.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        prisma.subject.create({ data: { name: 'Database Management', code: 'CS303', departmentId: cse.id, semesterId: sem3.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        prisma.subject.create({ data: { name: 'DS Lab', code: 'CS304', departmentId: cse.id, semesterId: sem3.id, lecturesPerWeek: 2, isLab: true, labDuration: 2, creditHours: 2 } }),
        // CSE Sem 5
        prisma.subject.create({ data: { name: 'Machine Learning', code: 'CS501', departmentId: cse.id, semesterId: sem5.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        prisma.subject.create({ data: { name: 'Computer Networks', code: 'CS502', departmentId: cse.id, semesterId: sem5.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        // ECE Sem 3
        prisma.subject.create({ data: { name: 'Signals & Systems', code: 'EC301', departmentId: ece.id, semesterId: sem3.id, lecturesPerWeek: 4, isLab: false, creditHours: 4 } }),
        prisma.subject.create({ data: { name: 'Digital Electronics', code: 'EC302', departmentId: ece.id, semesterId: sem3.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        prisma.subject.create({ data: { name: 'Electronics Lab', code: 'EC303', departmentId: ece.id, semesterId: sem3.id, lecturesPerWeek: 2, isLab: true, labDuration: 2, creditHours: 2 } }),
        // ME Sem 3
        prisma.subject.create({ data: { name: 'Thermodynamics', code: 'ME301', departmentId: me.id, semesterId: sem3.id, lecturesPerWeek: 4, isLab: false, creditHours: 4 } }),
        prisma.subject.create({ data: { name: 'Fluid Mechanics', code: 'ME302', departmentId: me.id, semesterId: sem3.id, lecturesPerWeek: 3, isLab: false, creditHours: 3 } }),
        prisma.subject.create({ data: { name: 'Workshop Lab', code: 'ME303', departmentId: me.id, semesterId: sem3.id, lecturesPerWeek: 2, isLab: true, labDuration: 2, creditHours: 2 } }),
    ]);
    // ── Subject-Teacher assignments ──
    await prisma.subjectTeacher.createMany({
        data: [
            { subjectId: subjects[0].id, teacherId: teachers[0].id },
            { subjectId: subjects[1].id, teacherId: teachers[1].id },
            { subjectId: subjects[2].id, teacherId: teachers[2].id },
            { subjectId: subjects[3].id, teacherId: teachers[3].id },
            { subjectId: subjects[4].id, teacherId: teachers[0].id },
            { subjectId: subjects[5].id, teacherId: teachers[1].id },
            { subjectId: subjects[6].id, teacherId: teachers[4].id },
            { subjectId: subjects[7].id, teacherId: teachers[5].id },
            { subjectId: subjects[8].id, teacherId: teachers[6].id },
            { subjectId: subjects[9].id, teacherId: teachers[7].id },
            { subjectId: subjects[10].id, teacherId: teachers[8].id },
            { subjectId: subjects[11].id, teacherId: teachers[9].id },
        ],
    });
    // ── Rooms ──
    await Promise.all([
        prisma.room.create({ data: { name: 'Room 101', code: 'R101', type: 'CLASSROOM', capacity: 60, departmentId: cse.id, hasProjector: true } }),
        prisma.room.create({ data: { name: 'Room 102', code: 'R102', type: 'CLASSROOM', capacity: 60, departmentId: cse.id, hasProjector: true } }),
        prisma.room.create({ data: { name: 'Room 201', code: 'R201', type: 'CLASSROOM', capacity: 60, departmentId: ece.id, hasProjector: true } }),
        prisma.room.create({ data: { name: 'Room 202', code: 'R202', type: 'CLASSROOM', capacity: 60, departmentId: ece.id, hasProjector: true } }),
        prisma.room.create({ data: { name: 'Room 301', code: 'R301', type: 'CLASSROOM', capacity: 60, departmentId: me.id, hasProjector: true } }),
        prisma.room.create({ data: { name: 'CS Lab 1', code: 'CSL1', type: 'LAB', capacity: 30, departmentId: cse.id, hasProjector: true, hasAC: true } }),
        prisma.room.create({ data: { name: 'Electronics Lab', code: 'ECL1', type: 'LAB', capacity: 30, departmentId: ece.id, hasProjector: true, hasAC: true } }),
        prisma.room.create({ data: { name: 'Workshop', code: 'WSL1', type: 'LAB', capacity: 40, departmentId: me.id } }),
        prisma.room.create({ data: { name: 'Seminar Hall', code: 'SH1', type: 'SEMINAR_HALL', capacity: 120, hasProjector: true, hasAC: true } }),
    ]);
    // ── Batches ──
    await Promise.all([
        prisma.batch.create({ data: { name: 'CSE-3A', code: 'CSE3A', departmentId: cse.id, semesterId: sem3.id, studentCount: 60, maxLecturesDay: 6 } }),
        prisma.batch.create({ data: { name: 'CSE-5A', code: 'CSE5A', departmentId: cse.id, semesterId: sem5.id, studentCount: 55, maxLecturesDay: 6 } }),
        prisma.batch.create({ data: { name: 'ECE-3A', code: 'ECE3A', departmentId: ece.id, semesterId: sem3.id, studentCount: 60, maxLecturesDay: 6 } }),
        prisma.batch.create({ data: { name: 'ME-3A', code: 'ME3A', departmentId: me.id, semesterId: sem3.id, studentCount: 60, maxLecturesDay: 6 } }),
    ]);
    // ── Time Slots (Mon-Fri, 6 slots per day + 1 break) ──
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slotTimes = [
        { label: '9:00 - 9:50', start: '09:00', end: '09:50', isBreak: false },
        { label: '10:00 - 10:50', start: '10:00', end: '10:50', isBreak: false },
        { label: '11:00 - 11:50', start: '11:00', end: '11:50', isBreak: false },
        { label: '12:00 - 12:30', start: '12:00', end: '12:30', isBreak: true },
        { label: '12:30 - 1:20', start: '12:30', end: '13:20', isBreak: false },
        { label: '1:30 - 2:20', start: '13:30', end: '14:20', isBreak: false },
        { label: '2:30 - 3:20', start: '14:30', end: '15:20', isBreak: false },
        { label: '3:30 - 4:20', start: '15:30', end: '16:20', isBreak: false },
    ];
    for (let day = 0; day < 5; day++) {
        for (let i = 0; i < slotTimes.length; i++) {
            await prisma.timeSlot.create({
                data: {
                    label: `${dayNames[day]} ${slotTimes[i].label}`,
                    startTime: slotTimes[i].start,
                    endTime: slotTimes[i].end,
                    dayOfWeek: day,
                    slotIndex: i,
                    isBreak: slotTimes[i].isBreak,
                },
            });
        }
    }
    // ── System + Default Constraints ──
    await ensureSystemConstraints();
    await prisma.constraint.createMany({
        data: [
            {
                name: 'Lab Sessions in Lab Rooms',
                type: 'ROOM_LAB_ONLY',
                priority: 'MANDATORY',
                parameters: JSON.stringify({}),
            },
            {
                name: 'Balanced Teacher Workload',
                type: 'GLOBAL_BALANCED_WORKLOAD',
                priority: 'MEDIUM',
                parameters: JSON.stringify({ maxDeviation: 3 }),
            },
        ],
    });
    console.log('✅ Seed complete!');
    console.log(`   Admin login: ${adminEmail} / ${adminPass}`);
}
/**
 * Ensure all 4 system constraints exist (idempotent).
 */
async function ensureSystemConstraints() {
    const systemConstraints = [
        {
            name: 'No Faculty Double-Booking',
            type: 'GLOBAL_NO_TEACHER_CONFLICT',
            priority: 'MANDATORY',
            isActive: true,
            parameters: JSON.stringify({ system: true, description: 'No faculty member can be assigned to more than one class at the same time slot.', penalty: 1000 }),
        },
        {
            name: 'No Room Double-Booking',
            type: 'GLOBAL_NO_ROOM_CONFLICT',
            priority: 'MANDATORY',
            isActive: true,
            parameters: JSON.stringify({ system: true, description: 'No classroom can be assigned to more than one class at the same time slot.', penalty: 1000 }),
        },
        {
            name: 'No Lab Double-Booking',
            type: 'GLOBAL_NO_LAB_CONFLICT',
            priority: 'MANDATORY',
            isActive: true,
            parameters: JSON.stringify({ system: true, description: 'No laboratory can be assigned to more than one session at the same time slot.', penalty: 1000 }),
        },
        {
            name: 'No Student Group Overlap',
            type: 'GLOBAL_NO_BATCH_OVERLAP',
            priority: 'MANDATORY',
            isActive: true,
            parameters: JSON.stringify({ system: true, description: 'No student group/batch can attend more than one class at the same time slot.', penalty: 1000 }),
        },
    ];
    for (const constraint of systemConstraints) {
        const existing = await prisma.constraint.findFirst({ where: { type: constraint.type } });
        if (!existing) {
            await prisma.constraint.create({ data: constraint });
        }
        else {
            await prisma.constraint.update({
                where: { id: existing.id },
                data: { isActive: true, priority: 'MANDATORY', parameters: constraint.parameters },
            });
        }
    }
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map