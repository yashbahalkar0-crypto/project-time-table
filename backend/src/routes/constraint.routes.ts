import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { isSystemConstraint, SYSTEM_CONSTRAINT_TYPES } from '../lib/resourceValidator';

const router = Router();

// Get all constraints (includes system constraints with `isSystem` flag)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.teacherId) where.teacherId = req.query.teacherId;
    if (req.query.subjectId) where.subjectId = req.query.subjectId;
    if (req.query.roomId) where.roomId = req.query.roomId;
    if (req.query.batchId) where.batchId = req.query.batchId;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';
    const constraints = await prisma.constraint.findMany({
      where,
      include: { teacher: true, subject: true, room: true, batch: true },
      orderBy: { createdAt: 'desc' },
    });
    // Parse parameters string back to object for frontend + add isSystem flag
    const parsed = constraints.map((c: any) => {
      const params = typeof c.parameters === 'string' ? JSON.parse(c.parameters || '{}') : c.parameters;
      return {
        ...c,
        parameters: params,
        isSystem: isSystemConstraint(c.type),
      };
    });
    res.json(parsed);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const constraint = await prisma.constraint.findUnique({
      where: { id: req.params.id },
      include: { teacher: true, subject: true, room: true, batch: true },
    });
    if (!constraint) { res.status(404).json({ error: 'Not found' }); return; }

    const params = typeof constraint.parameters === 'string'
      ? JSON.parse(constraint.parameters || '{}')
      : constraint.parameters;

    res.json({
      ...constraint,
      parameters: params,
      isSystem: isSystemConstraint(constraint.type),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Prevent creating duplicate system constraints
    if (isSystemConstraint(req.body.type)) {
      const existing = await prisma.constraint.findFirst({
        where: { type: req.body.type },
      });
      if (existing) {
        res.status(409).json({
          error: 'SYSTEM_CONSTRAINT_EXISTS',
          message: `System constraint "${req.body.type}" already exists and cannot be duplicated.`,
        });
        return;
      }
    }

    const data = { ...req.body };
    if (data.parameters && typeof data.parameters === 'object') {
      data.parameters = JSON.stringify(data.parameters);
    }
    const constraint = await prisma.constraint.create({
      data,
      include: { teacher: true, subject: true, room: true, batch: true },
    });
    res.status(201).json(constraint);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get the existing constraint to check if it's a system constraint
    const existing = await prisma.constraint.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // System constraints: only allow name change, block type/priority/isActive changes
    if (isSystemConstraint(existing.type)) {
      const protectedFields = ['type', 'priority', 'isActive'];
      const attemptedChanges = protectedFields.filter(
        f => req.body[f] !== undefined && req.body[f] !== (existing as any)[f]
      );

      if (attemptedChanges.length > 0) {
        res.status(403).json({
          error: 'SYSTEM_CONSTRAINT_PROTECTED',
          message: `System constraint "${existing.type}" cannot be modified. Fields [${attemptedChanges.join(', ')}] are protected.`,
          protectedFields: attemptedChanges,
        });
        return;
      }
    }

    const data = { ...req.body };
    if (data.parameters && typeof data.parameters === 'object') {
      data.parameters = JSON.stringify(data.parameters);
    }
    const constraint = await prisma.constraint.update({
      where: { id: req.params.id },
      data,
      include: { teacher: true, subject: true, room: true, batch: true },
    });
    res.json(constraint);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Check if constraint is a system constraint
    const existing = await prisma.constraint.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (isSystemConstraint(existing.type)) {
      res.status(403).json({
        error: 'SYSTEM_CONSTRAINT_PROTECTED',
        message: `System constraint "${existing.name}" cannot be deleted. This is a core scheduling rule required for valid timetable generation.`,
      });
      return;
    }

    await prisma.constraint.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
