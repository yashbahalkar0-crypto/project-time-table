import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    if (req.query.semesterId) where.semesterId = req.query.semesterId;
    const batches = await prisma.batch.findMany({
      where,
      include: { department: true, semester: true, _count: { select: { scheduleEntries: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(batches);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: { department: true, semester: true },
    });
    if (!batch) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(batch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.create({ data: req.body, include: { department: true, semester: true } });
    res.status(201).json(batch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.update({ where: { id: req.params.id }, data: req.body, include: { department: true, semester: true } });
    res.json(batch);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const batchId = req.params.id;
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { batchId } });
      await tx.constraint.deleteMany({ where: { batchId } });
      await tx.batch.delete({ where: { id: batchId } });
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
