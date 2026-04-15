import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const scheduleId = req.query.scheduleId as string | undefined;

    // Total counts
    const [
      teacherCount, subjectCount, roomCount, batchCount, departmentCount,
      scheduleCount
    ] = await Promise.all([
      prisma.teacher.count(),
      prisma.subject.count(),
      prisma.room.count(),
      prisma.batch.count(),
      prisma.department.count(),
      prisma.schedule.count(),
    ]);

    // If a schedule is specified, return detailed analytics
    let scheduleAnalytics = null;
    if (scheduleId) {
      const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      const entries = await prisma.scheduleEntry.findMany({
        where: { scheduleId },
        include: { teacher: true, room: true, batch: true, subject: true, timeSlot: true },
      });

      // Teacher workload distribution
      const teacherWorkload: Record<string, { name: string; lectures: number; days: Set<number> }> = {};
      for (const e of entries) {
        if (!teacherWorkload[e.teacherId]) {
          teacherWorkload[e.teacherId] = { name: e.teacher.name, lectures: 0, days: new Set() };
        }
        teacherWorkload[e.teacherId].lectures += 1;
        teacherWorkload[e.teacherId].days.add(e.timeSlot.dayOfWeek);
      }

      // Room utilization
      const totalSlots = await prisma.timeSlot.count({ where: { isBreak: false } });
      const roomUtil: Record<string, { name: string; used: number; total: number; type: string }> = {};
      const rooms = await prisma.room.findMany();
      for (const room of rooms) {
        const used = entries.filter(e => e.roomId === room.id).length;
        roomUtil[room.id] = { name: room.name, used, total: totalSlots, type: room.type };
      }

      // Batch lecture distribution
      const batchDist: Record<string, Record<number, number>> = {};
      for (const e of entries) {
        if (!batchDist[e.batchId]) batchDist[e.batchId] = {};
        const day = e.timeSlot.dayOfWeek;
        batchDist[e.batchId][day] = (batchDist[e.batchId][day] || 0) + 1;
      }

      // Free slots per day
      const allSlots = await prisma.timeSlot.findMany({ where: { isBreak: false } });
      const usedSlotKeys = new Set(entries.map(e => `${e.roomId}-${e.timeSlot.dayOfWeek}-${e.timeSlot.slotIndex}`));
      const freeSlots: Record<string, number> = {};
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of [0, 1, 2, 3, 4]) {
        const daySlots = allSlots.filter(s => s.dayOfWeek === day);
        let free = 0;
        for (const room of rooms) {
          for (const slot of daySlots) {
            if (!usedSlotKeys.has(`${room.id}-${slot.dayOfWeek}-${slot.slotIndex}`)) free++;
          }
        }
        freeSlots[dayNames[day]] = free;
      }

      scheduleAnalytics = {
        fitnessScore: schedule?.fitnessScore || 0,
        teacherWorkload: Object.values(teacherWorkload).map(tw => ({
          name: tw.name,
          lectures: tw.lectures,
          activeDays: tw.days.size,
        })),
        roomUtilization: Object.values(roomUtil).map(ru => ({
          name: ru.name,
          type: ru.type,
          utilization: totalSlots > 0 ? Math.round((ru.used / totalSlots) * 100) : 0,
          used: ru.used,
          total: totalSlots,
        })),
        freeSlots,
        totalEntries: entries.length,
      };
    }

    res.json({
      overview: { teacherCount, subjectCount, roomCount, batchCount, departmentCount, scheduleCount },
      scheduleAnalytics,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
