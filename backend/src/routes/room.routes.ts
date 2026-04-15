import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.departmentId) where.departmentId = req.query.departmentId;
    const rooms = await prisma.room.findMany({
      where,
      include: { department: true, _count: { select: { scheduleEntries: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(rooms);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: { department: true, scheduleEntries: { include: { timeSlot: true, subject: true, teacher: true } } },
    });
    if (!room) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(room);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.create({ data: req.body, include: { department: true } });
    res.status(201).json(room);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.update({ where: { id: req.params.id }, data: req.body, include: { department: true } });
    res.json(room);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.params.id;
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { roomId } });
      await tx.constraint.deleteMany({ where: { roomId } });
      await tx.room.delete({ where: { id: roomId } });
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
