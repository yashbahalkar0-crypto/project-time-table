import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { GeneticScheduler, AcademicData } from '../algorithm/scheduler';
import {
  validateResourceExclusivity,
  getAvailableResources,
  ResourceType,
} from '../lib/resourceValidator';

const router = Router();

// List schedules
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.semesterId) where.semesterId = req.query.semesterId;
    if (req.query.status) where.status = req.query.status;
    const schedules = await prisma.schedule.findMany({
      where,
      include: { semester: true, _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(schedules);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get single schedule with entries
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: {
        semester: true,
        entries: {
          include: {
            subject: true,
            teacher: true,
            room: true,
            batch: true,
            timeSlot: true,
          },
        },
      },
    });
    if (!schedule) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(schedule);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get schedule filtered by batch (department timetable view)
router.get('/:id/batch/:batchId', authenticate, async (req: Request, res: Response) => {
  try {
    const entries = await prisma.scheduleEntry.findMany({
      where: { scheduleId: req.params.id, batchId: req.params.batchId },
      include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
    });
    res.json(entries);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get teacher schedule
router.get('/:id/teacher/:teacherId', authenticate, async (req: Request, res: Response) => {
  try {
    const entries = await prisma.scheduleEntry.findMany({
      where: { scheduleId: req.params.id, teacherId: req.params.teacherId },
      include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
    });
    res.json(entries);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Get room schedule
router.get('/:id/room/:roomId', authenticate, async (req: Request, res: Response) => {
  try {
    const entries = await prisma.scheduleEntry.findMany({
      where: { scheduleId: req.params.id, roomId: req.params.roomId },
      include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
    });
    res.json(entries);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ RESOURCE AVAILABILITY CHECK ═══
// Smart filtering: get which resources are free at a given timeslot
router.get('/:id/availability', authenticate, async (req: Request, res: Response) => {
  try {
    const { timeslotId, resourceType, excludeEntryId } = req.query;

    if (!timeslotId || !resourceType) {
      res.status(400).json({ error: 'timeslotId and resourceType are required' });
      return;
    }

    const validTypes: ResourceType[] = ['faculty', 'room', 'lab', 'student_group'];
    if (!validTypes.includes(resourceType as ResourceType)) {
      res.status(400).json({ error: `Invalid resourceType. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const availability = await getAvailableResources(
      prisma,
      req.params.id,
      timeslotId as string,
      resourceType as ResourceType,
      excludeEntryId as string | undefined
    );

    res.json(availability);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ VALIDATE ENTRY (dry-run check without saving) ═══
router.post('/:id/validate-entry', authenticate, async (req: Request, res: Response) => {
  try {
    const { teacherId, roomId, batchId, timeSlotId, timeSlotIds, excludeEntryId } = req.body;

    if (!teacherId || !roomId || !batchId || !timeSlotId) {
      res.status(400).json({ error: 'teacherId, roomId, batchId, and timeSlotId are required' });
      return;
    }

    const result = await validateResourceExclusivity(
      prisma,
      req.params.id,
      { teacherId, roomId, batchId, timeSlotId, timeSlotIds },
      excludeEntryId
    );

    if (!result.valid) {
      res.json({
        valid: false,
        error: 'RESOURCE_CONFLICT',
        conflicts: result.conflicts.map(c => ({
          type: c.type,
          id: c.id,
          name: c.name,
          timeslot: c.timeslot,
          timeslotLabel: c.timeslotLabel,
          existingSubject: c.existingSubject,
          message: `${c.type === 'faculty' ? 'Faculty' : c.type === 'room' ? 'Room' : c.type === 'lab' ? 'Lab' : 'Student Group'} "${c.name || c.id}" is already assigned at this time slot`,
        })),
      });
    } else {
      res.json({ valid: true, conflicts: [] });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ═══ GENERATE TIMETABLE ═══
router.post('/generate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { semesterId, name, options } = req.body;

    if (!semesterId) {
      res.status(400).json({ error: 'semesterId is required' });
      return;
    }

    // Load all academic data
    const [teachers, subjects, rooms, batches, timeSlots, constraints] = await Promise.all([
      prisma.teacher.findMany(),
      prisma.subject.findMany({
        where: { semesterId },
        include: { teachers: true },
      }),
      prisma.room.findMany(),
      prisma.batch.findMany({ where: { semesterId } }),
      prisma.timeSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }] }),
      prisma.constraint.findMany({ where: { isActive: true } }),
    ]);

    const data: AcademicData = { teachers, subjects, rooms, batches, timeSlots, constraints };

    // Run genetic scheduler
    const scheduler = new GeneticScheduler(data, {
      populationSize: options?.populationSize || 60,
      generations: options?.generations || 300,
      mutationRate: options?.mutationRate || 0.15,
      elitismRate: options?.elitismRate || 0.1,
    });

    const result = scheduler.generate();

    // Save schedule to DB
    const schedule = await prisma.schedule.create({
      data: {
        name: name || `Schedule ${new Date().toLocaleDateString()}`,
        semesterId,
        fitnessScore: result.fitnessScore,
        conflictCount: result.conflictCount,
        generationTime: result.generationTimeMs,
        entries: {
          create: result.entries.map(e => ({
            subjectId: e.subjectId,
            teacherId: e.teacherId,
            roomId: e.roomId,
            batchId: e.batchId,
            timeSlotId: e.timeSlotId,
          })),
        },
      },
      include: {
        semester: true,
        entries: {
          include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
        },
      },
    });

    res.status(201).json({
      schedule,
      stats: {
        fitnessScore: result.fitnessScore,
        conflictCount: result.conflictCount,
        conflicts: result.conflicts,
        generationTimeMs: result.generationTimeMs,
        totalEntries: result.entries.length,
      },
    });
  } catch (err: any) {
    console.error('Schedule generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══ ADD ENTRY TO EXISTING SCHEDULE (with resource validation) ═══
router.post('/:id/entries', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, teacherId, roomId, batchId, timeSlotId } = req.body;

    if (!subjectId || !teacherId || !roomId || !batchId || !timeSlotId) {
      res.status(400).json({ error: 'subjectId, teacherId, roomId, batchId, and timeSlotId are required' });
      return;
    }

    // Validate resource exclusivity before creating
    const validation = await validateResourceExclusivity(
      prisma,
      req.params.id,
      { teacherId, roomId, batchId, timeSlotId }
    );

    if (!validation.valid) {
      res.status(409).json({
        error: 'RESOURCE_CONFLICT',
        message: 'Cannot create entry: resource conflict detected',
        conflicts: validation.conflicts,
      });
      return;
    }

    const entry = await prisma.scheduleEntry.create({
      data: {
        scheduleId: req.params.id,
        subjectId,
        teacherId,
        roomId,
        batchId,
        timeSlotId,
      },
      include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
    });

    res.status(201).json(entry);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Edit a schedule entry (swap slot) — WITH RESOURCE VALIDATION
router.put('/entry/:entryId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get the existing entry to know the schedule
    const existing = await prisma.scheduleEntry.findUnique({
      where: { id: req.params.entryId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    // Build the proposed assignment from existing + updates
    const proposed = {
      teacherId: req.body.teacherId || existing.teacherId,
      roomId: req.body.roomId || existing.roomId,
      batchId: req.body.batchId || existing.batchId,
      timeSlotId: req.body.timeSlotId || existing.timeSlotId,
    };

    // Validate resource exclusivity (excluding the entry being edited)
    const validation = await validateResourceExclusivity(
      prisma,
      existing.scheduleId,
      proposed,
      req.params.entryId // exclude current entry from conflict check
    );

    if (!validation.valid) {
      res.status(409).json({
        error: 'RESOURCE_CONFLICT',
        message: 'Cannot update entry: resource conflict detected',
        conflicts: validation.conflicts,
      });
      return;
    }

    const entry = await prisma.scheduleEntry.update({
      where: { id: req.params.entryId },
      data: req.body,
      include: { subject: true, teacher: true, room: true, batch: true, timeSlot: true },
    });
    res.json(entry);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Delete a schedule entry
router.delete('/entry/:entryId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.scheduleEntry.delete({ where: { id: req.params.entryId } });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Delete entire schedule
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.schedule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Update schedule status
router.patch('/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(schedule);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
