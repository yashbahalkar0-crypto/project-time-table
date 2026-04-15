import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { teachers: true, subjects: true, batches: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { teachers: true, subjects: true, batches: true },
    });
    if (!dept) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(dept);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    res.status(201).json(dept);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    res.json(dept);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const deptId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // 1. Collect all child resource IDs belonging to this department
      const teachers = await tx.teacher.findMany({ where: { departmentId: deptId }, select: { id: true } });
      const subjects = await tx.subject.findMany({ where: { departmentId: deptId }, select: { id: true } });
      const batches = await tx.batch.findMany({ where: { departmentId: deptId }, select: { id: true } });
      const rooms = await tx.room.findMany({ where: { departmentId: deptId }, select: { id: true } });

      const teacherIds = teachers.map(t => t.id);
      const subjectIds = subjects.map(s => s.id);
      const batchIds = batches.map(b => b.id);
      const roomIds = rooms.map(r => r.id);

      // 2. Delete all schedule entries referencing any of these resources
      if (teacherIds.length) await tx.scheduleEntry.deleteMany({ where: { teacherId: { in: teacherIds } } });
      if (subjectIds.length) await tx.scheduleEntry.deleteMany({ where: { subjectId: { in: subjectIds } } });
      if (batchIds.length) await tx.scheduleEntry.deleteMany({ where: { batchId: { in: batchIds } } });
      if (roomIds.length) await tx.scheduleEntry.deleteMany({ where: { roomId: { in: roomIds } } });

      // 3. Delete constraints referencing these resources
      if (teacherIds.length) await tx.constraint.deleteMany({ where: { teacherId: { in: teacherIds } } });
      if (subjectIds.length) await tx.constraint.deleteMany({ where: { subjectId: { in: subjectIds } } });
      if (batchIds.length) await tx.constraint.deleteMany({ where: { batchId: { in: batchIds } } });
      if (roomIds.length) await tx.constraint.deleteMany({ where: { roomId: { in: roomIds } } });

      // 4. Delete subject-teacher mappings
      if (subjectIds.length) await tx.subjectTeacher.deleteMany({ where: { subjectId: { in: subjectIds } } });
      if (teacherIds.length) await tx.subjectTeacher.deleteMany({ where: { teacherId: { in: teacherIds } } });

      // 5. Delete the child resources themselves
      if (batchIds.length) await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
      if (subjectIds.length) await tx.subject.deleteMany({ where: { id: { in: subjectIds } } });
      if (roomIds.length) await tx.room.deleteMany({ where: { id: { in: roomIds } } });
      if (teacherIds.length) {
        await tx.user.deleteMany({ where: { teacherId: { in: teacherIds } } });
        await tx.teacher.deleteMany({ where: { id: { in: teacherIds } } });
      }

      // 6. Delete the department
      await tx.department.delete({ where: { id: deptId } });
    });

    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
