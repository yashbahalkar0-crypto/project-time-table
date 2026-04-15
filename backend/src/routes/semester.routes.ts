import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const semesters = await prisma.semester.findMany({
      include: { _count: { select: { subjects: true, batches: true } } },
      orderBy: [{ year: 'desc' }, { number: 'asc' }],
    });
    res.json(semesters);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const sem = await prisma.semester.findUnique({
      where: { id: req.params.id },
      include: { subjects: true, batches: true },
    });
    if (!sem) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(sem);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sem = await prisma.semester.create({ data: req.body });
    res.status(201).json(sem);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sem = await prisma.semester.update({ where: { id: req.params.id }, data: req.body });
    res.json(sem);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const semId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // 1. Collect child resource IDs belonging to this semester
      const subjects = await tx.subject.findMany({ where: { semesterId: semId }, select: { id: true } });
      const batches = await tx.batch.findMany({ where: { semesterId: semId }, select: { id: true } });
      const schedules = await tx.schedule.findMany({ where: { semesterId: semId }, select: { id: true } });

      const subjectIds = subjects.map(s => s.id);
      const batchIds = batches.map(b => b.id);
      const scheduleIds = schedules.map(s => s.id);

      // 2. Delete all schedule entries
      if (scheduleIds.length) await tx.scheduleEntry.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
      if (subjectIds.length) await tx.scheduleEntry.deleteMany({ where: { subjectId: { in: subjectIds } } });
      if (batchIds.length) await tx.scheduleEntry.deleteMany({ where: { batchId: { in: batchIds } } });

      // 3. Delete constraints
      if (subjectIds.length) await tx.constraint.deleteMany({ where: { subjectId: { in: subjectIds } } });
      if (batchIds.length) await tx.constraint.deleteMany({ where: { batchId: { in: batchIds } } });

      // 4. Delete subject-teacher mappings
      if (subjectIds.length) await tx.subjectTeacher.deleteMany({ where: { subjectId: { in: subjectIds } } });

      // 5. Delete child resources
      if (scheduleIds.length) await tx.schedule.deleteMany({ where: { id: { in: scheduleIds } } });
      if (batchIds.length) await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
      if (subjectIds.length) await tx.subject.deleteMany({ where: { id: { in: subjectIds } } });

      // 6. Delete the semester
      await tx.semester.delete({ where: { id: semId } });
    });

    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
