import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    if (req.query.semesterId) where.semesterId = req.query.semesterId;
    if (req.query.isLab !== undefined) where.isLab = req.query.isLab === 'true';
    const subjects = await prisma.subject.findMany({
      where,
      include: { department: true, semester: true, teachers: { include: { teacher: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(subjects);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: { department: true, semester: true, teachers: { include: { teacher: true } } },
    });
    if (!subject) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(subject);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherIds, ...data } = req.body;
    const subject = await prisma.subject.create({
      data: {
        ...data,
        teachers: teacherIds ? { create: teacherIds.map((tid: string) => ({ teacherId: tid })) } : undefined,
      },
      include: { department: true, semester: true, teachers: { include: { teacher: true } } },
    });
    res.status(201).json(subject);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { teacherIds, ...data } = req.body;
    if (teacherIds) {
      await prisma.subjectTeacher.deleteMany({ where: { subjectId: req.params.id } });
      await prisma.subjectTeacher.createMany({
        data: teacherIds.map((tid: string) => ({ subjectId: req.params.id, teacherId: tid })),
      });
    }
    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data,
      include: { department: true, semester: true, teachers: { include: { teacher: true } } },
    });
    res.json(subject);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const subjectId = req.params.id;
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { subjectId } });
      await tx.constraint.deleteMany({ where: { subjectId } });
      await tx.subjectTeacher.deleteMany({ where: { subjectId } });
      await tx.subject.delete({ where: { id: subjectId } });
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
