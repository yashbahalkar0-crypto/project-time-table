import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where = req.query.departmentId ? { departmentId: req.query.departmentId as string } : {};
    const teachers = await prisma.teacher.findMany({
      where,
      include: { department: true, subjects: { include: { subject: true } }, _count: { select: { scheduleEntries: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(teachers);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.id },
      include: { department: true, subjects: { include: { subject: true } }, scheduleEntries: { include: { timeSlot: true, subject: true, room: true } } },
    });
    if (!teacher) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(teacher);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { subjectIds, ...data } = req.body;
    const teacher = await prisma.teacher.create({
      data: {
        ...data,
        subjects: subjectIds ? { create: subjectIds.map((sid: string) => ({ subjectId: sid })) } : undefined,
      },
      include: { department: true, subjects: { include: { subject: true } } },
    });
    res.status(201).json(teacher);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { subjectIds, ...data } = req.body;
    if (subjectIds) {
      await prisma.subjectTeacher.deleteMany({ where: { teacherId: req.params.id } });
      await prisma.subjectTeacher.createMany({
        data: subjectIds.map((sid: string) => ({ teacherId: req.params.id, subjectId: sid })),
      });
    }
    const teacher = await prisma.teacher.update({
      where: { id: req.params.id },
      data,
      include: { department: true, subjects: { include: { subject: true } } },
    });
    res.json(teacher);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.params.id;
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { teacherId } });
      await tx.constraint.deleteMany({ where: { teacherId } });
      await tx.subjectTeacher.deleteMany({ where: { teacherId } });
      await tx.user.deleteMany({ where: { teacherId } });
      await tx.teacher.delete({ where: { id: teacherId } });
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
