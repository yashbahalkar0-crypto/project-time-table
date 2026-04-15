import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const slots = await prisma.timeSlot.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }],
    });
    res.json(slots);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const slot = await prisma.timeSlot.create({ data: req.body });
    res.status(201).json(slot);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Bulk create time slots
router.post('/bulk', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { slots } = req.body;
    let count = 0;
    for (const slot of slots) {
      try {
        await prisma.timeSlot.create({ data: slot });
        count++;
      } catch { /* skip duplicates */ }
    }
    res.status(201).json({ count });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const slot = await prisma.timeSlot.update({ where: { id: req.params.id }, data: req.body });
    res.json(slot);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const timeSlotId = req.params.id;
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { timeSlotId } });
      await tx.timeSlot.delete({ where: { id: timeSlotId } });
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
