// ═══════════════════════════════════════════════════════════════
// UNIFIED RESOURCE EXCLUSIVITY VALIDATOR
// System-level constraint: No resource can be double-booked.
// Resources: Faculty, Room, Lab, Student Group (Batch)
// This is a NON-REMOVABLE, ALWAYS-ACTIVE system constraint.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

export type ResourceType = 'faculty' | 'room' | 'lab' | 'student_group';

export interface ResourceConflict {
  type: ResourceType;
  id: string;
  name?: string;
  timeslot: string;
  timeslotLabel?: string;
  existingEntryId?: string;
  existingSubject?: string;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: ResourceConflict[];
}

export interface ResourceAvailability {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  available: boolean;
  conflictingEntryId?: string;
  conflictingSubject?: string;
}

// ── In-Memory Schedule Maps for O(1) lookups ──────────────────

export interface ScheduleMaps {
  faculty_schedule: Map<string, Set<string>>;   // faculty_id -> Set<timeslot_id>
  room_schedule: Map<string, Set<string>>;      // room_id -> Set<timeslot_id>
  lab_schedule: Map<string, Set<string>>;       // lab_id -> Set<timeslot_id>
  group_schedule: Map<string, Set<string>>;     // batch_id -> Set<timeslot_id>
}

/**
 * Build in-memory maps from existing schedule entries for O(1) conflict checks.
 */
export async function buildScheduleMaps(
  prisma: PrismaClient,
  scheduleId: string,
  excludeEntryId?: string
): Promise<ScheduleMaps> {
  const entries = await prisma.scheduleEntry.findMany({
    where: {
      scheduleId,
      ...(excludeEntryId ? { NOT: { id: excludeEntryId } } : {}),
    },
    include: { room: true },
  });

  const maps: ScheduleMaps = {
    faculty_schedule: new Map(),
    room_schedule: new Map(),
    lab_schedule: new Map(),
    group_schedule: new Map(),
  };

  for (const entry of entries) {
    // Faculty
    if (!maps.faculty_schedule.has(entry.teacherId)) {
      maps.faculty_schedule.set(entry.teacherId, new Set());
    }
    maps.faculty_schedule.get(entry.teacherId)!.add(entry.timeSlotId);

    // Room (treat all rooms uniformly - LAB or CLASSROOM are all exclusive)
    if (!maps.room_schedule.has(entry.roomId)) {
      maps.room_schedule.set(entry.roomId, new Set());
    }
    maps.room_schedule.get(entry.roomId)!.add(entry.timeSlotId);

    // Lab entries (rooms of type LAB get extra lab_schedule tracking)
    if ((entry as any).room?.type === 'LAB') {
      if (!maps.lab_schedule.has(entry.roomId)) {
        maps.lab_schedule.set(entry.roomId, new Set());
      }
      maps.lab_schedule.get(entry.roomId)!.add(entry.timeSlotId);
    }

    // Student Group (Batch)
    if (!maps.group_schedule.has(entry.batchId)) {
      maps.group_schedule.set(entry.batchId, new Set());
    }
    maps.group_schedule.get(entry.batchId)!.add(entry.timeSlotId);
  }

  return maps;
}

/**
 * Check if a specific resource is available at a given timeslot.
 * O(1) lookup using in-memory maps.
 */
export function isResourceAvailable(
  maps: ScheduleMaps,
  resourceType: ResourceType,
  resourceId: string,
  timeslotId: string
): boolean {
  let schedule: Map<string, Set<string>>;

  switch (resourceType) {
    case 'faculty':
      schedule = maps.faculty_schedule;
      break;
    case 'room':
      schedule = maps.room_schedule;
      break;
    case 'lab':
      schedule = maps.lab_schedule;
      break;
    case 'student_group':
      schedule = maps.group_schedule;
      break;
    default:
      return true;
  }

  const slots = schedule.get(resourceId);
  if (!slots) return true;
  return !slots.has(timeslotId);
}

/**
 * Validate a proposed assignment against ALL resource types.
 * This is the core system-level validation function.
 * Returns detailed conflict info for any violations.
 */
export async function validateResourceExclusivity(
  prisma: PrismaClient,
  scheduleId: string,
  assignment: {
    teacherId: string;
    roomId: string;
    batchId: string;
    timeSlotId: string;
    timeSlotIds?: string[]; // For lab sessions spanning multiple slots
  },
  excludeEntryId?: string
): Promise<ValidationResult> {
  const conflicts: ResourceConflict[] = [];
  
  // All timeslot IDs to check (single slot or multiple for labs)
  const timeslotIds = assignment.timeSlotIds || [assignment.timeSlotId];

  for (const timeslotId of timeslotIds) {
    // 1. Check faculty exclusivity
    const facultyConflict = await prisma.scheduleEntry.findFirst({
      where: {
        scheduleId,
        teacherId: assignment.teacherId,
        timeSlotId: timeslotId,
        ...(excludeEntryId ? { NOT: { id: excludeEntryId } } : {}),
      },
      include: { teacher: true, subject: true, timeSlot: true },
    });

    if (facultyConflict) {
      conflicts.push({
        type: 'faculty',
        id: assignment.teacherId,
        name: (facultyConflict as any).teacher?.name,
        timeslot: timeslotId,
        timeslotLabel: (facultyConflict as any).timeSlot?.label,
        existingEntryId: facultyConflict.id,
        existingSubject: (facultyConflict as any).subject?.name,
      });
    }

    // 2. Check room exclusivity
    const roomConflict = await prisma.scheduleEntry.findFirst({
      where: {
        scheduleId,
        roomId: assignment.roomId,
        timeSlotId: timeslotId,
        ...(excludeEntryId ? { NOT: { id: excludeEntryId } } : {}),
      },
      include: { room: true, subject: true, timeSlot: true },
    });

    if (roomConflict) {
      // Determine if it's a lab or room conflict
      const room = (roomConflict as any).room;
      const conflictType: ResourceType = room?.type === 'LAB' ? 'lab' : 'room';

      conflicts.push({
        type: conflictType,
        id: assignment.roomId,
        name: room?.name,
        timeslot: timeslotId,
        timeslotLabel: (roomConflict as any).timeSlot?.label,
        existingEntryId: roomConflict.id,
        existingSubject: (roomConflict as any).subject?.name,
      });
    }

    // 3. Check student group (batch) exclusivity
    const batchConflict = await prisma.scheduleEntry.findFirst({
      where: {
        scheduleId,
        batchId: assignment.batchId,
        timeSlotId: timeslotId,
        ...(excludeEntryId ? { NOT: { id: excludeEntryId } } : {}),
      },
      include: { batch: true, subject: true, timeSlot: true },
    });

    if (batchConflict) {
      conflicts.push({
        type: 'student_group',
        id: assignment.batchId,
        name: (batchConflict as any).batch?.name,
        timeslot: timeslotId,
        timeslotLabel: (batchConflict as any).timeSlot?.label,
        existingEntryId: batchConflict.id,
        existingSubject: (batchConflict as any).subject?.name,
      });
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Get available resources of a given type for a specific timeslot.
 * Used for smart filtering in the UI.
 */
export async function getAvailableResources(
  prisma: PrismaClient,
  scheduleId: string,
  timeslotId: string,
  resourceType: ResourceType,
  excludeEntryId?: string
): Promise<ResourceAvailability[]> {
  // Get IDs already booked at this timeslot
  const existingEntries = await prisma.scheduleEntry.findMany({
    where: {
      scheduleId,
      timeSlotId: timeslotId,
      ...(excludeEntryId ? { NOT: { id: excludeEntryId } } : {}),
    },
    include: { teacher: true, room: true, batch: true, subject: true },
  });

  const bookedIds = new Set<string>();
  const bookedMap = new Map<string, { entryId: string; subjectName: string }>();

  for (const entry of existingEntries) {
    let id: string;
    switch (resourceType) {
      case 'faculty':
        id = entry.teacherId;
        bookedIds.add(id);
        bookedMap.set(id, { entryId: entry.id, subjectName: (entry as any).subject?.name || '' });
        break;
      case 'room':
      case 'lab':
        id = entry.roomId;
        bookedIds.add(id);
        bookedMap.set(id, { entryId: entry.id, subjectName: (entry as any).subject?.name || '' });
        break;
      case 'student_group':
        id = entry.batchId;
        bookedIds.add(id);
        bookedMap.set(id, { entryId: entry.id, subjectName: (entry as any).subject?.name || '' });
        break;
    }
  }

  // Get all resources of the type
  let allResources: { id: string; name: string }[] = [];

  switch (resourceType) {
    case 'faculty':
      allResources = (await prisma.teacher.findMany({ select: { id: true, name: true } }));
      break;
    case 'room':
      allResources = (await prisma.room.findMany({
        where: { type: { not: 'LAB' } },
        select: { id: true, name: true },
      }));
      break;
    case 'lab':
      allResources = (await prisma.room.findMany({
        where: { type: 'LAB' },
        select: { id: true, name: true },
      }));
      break;
    case 'student_group':
      allResources = (await prisma.batch.findMany({ select: { id: true, name: true } }));
      break;
  }

  return allResources.map(r => {
    const booked = bookedMap.get(r.id);
    return {
      resourceType,
      resourceId: r.id,
      resourceName: r.name,
      available: !bookedIds.has(r.id),
      ...(booked ? {
        conflictingEntryId: booked.entryId,
        conflictingSubject: booked.subjectName,
      } : {}),
    };
  });
}

/**
 * Validate assignment using in-memory maps (O(1) per check).
 * Used in the scheduling engine for performance.
 */
export function validateAssignmentFast(
  maps: ScheduleMaps,
  assignment: {
    teacherId: string;
    roomId: string;
    batchId: string;
    timeSlotId: string;
  }
): ValidationResult {
  const conflicts: ResourceConflict[] = [];

  if (!isResourceAvailable(maps, 'faculty', assignment.teacherId, assignment.timeSlotId)) {
    conflicts.push({
      type: 'faculty',
      id: assignment.teacherId,
      timeslot: assignment.timeSlotId,
    });
  }

  if (!isResourceAvailable(maps, 'room', assignment.roomId, assignment.timeSlotId)) {
    conflicts.push({
      type: 'room',
      id: assignment.roomId,
      timeslot: assignment.timeSlotId,
    });
  }

  if (!isResourceAvailable(maps, 'lab', assignment.roomId, assignment.timeSlotId)) {
    conflicts.push({
      type: 'lab',
      id: assignment.roomId,
      timeslot: assignment.timeSlotId,
    });
  }

  if (!isResourceAvailable(maps, 'student_group', assignment.batchId, assignment.timeSlotId)) {
    conflicts.push({
      type: 'student_group',
      id: assignment.batchId,
      timeslot: assignment.timeSlotId,
    });
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}

// ── System Constraint Constants ───────────────────────────────

export const SYSTEM_CONSTRAINT_TYPES = [
  'GLOBAL_NO_TEACHER_CONFLICT',
  'GLOBAL_NO_ROOM_CONFLICT',
  'GLOBAL_NO_LAB_CONFLICT',
  'GLOBAL_NO_BATCH_OVERLAP',
] as const;

export type SystemConstraintType = typeof SYSTEM_CONSTRAINT_TYPES[number];

/**
 * Check if a constraint type is a system-level (non-removable) constraint.
 */
export function isSystemConstraint(type: string): boolean {
  return (SYSTEM_CONSTRAINT_TYPES as readonly string[]).includes(type);
}

/**
 * Ensure all system constraints exist in the database.
 * Called on application startup.
 */
export async function ensureSystemConstraints(prisma: PrismaClient): Promise<void> {
  const systemConstraints = [
    {
      name: 'No Faculty Double-Booking',
      type: 'GLOBAL_NO_TEACHER_CONFLICT',
      priority: 'MANDATORY',
      isActive: true,
      parameters: JSON.stringify({
        system: true,
        description: 'No faculty member can be assigned to more than one class at the same time slot.',
        penalty: 1000,
      }),
    },
    {
      name: 'No Room Double-Booking',
      type: 'GLOBAL_NO_ROOM_CONFLICT',
      priority: 'MANDATORY',
      isActive: true,
      parameters: JSON.stringify({
        system: true,
        description: 'No classroom can be assigned to more than one class at the same time slot.',
        penalty: 1000,
      }),
    },
    {
      name: 'No Lab Double-Booking',
      type: 'GLOBAL_NO_LAB_CONFLICT',
      priority: 'MANDATORY',
      isActive: true,
      parameters: JSON.stringify({
        system: true,
        description: 'No laboratory can be assigned to more than one session at the same time slot.',
        penalty: 1000,
      }),
    },
    {
      name: 'No Student Group Overlap',
      type: 'GLOBAL_NO_BATCH_OVERLAP',
      priority: 'MANDATORY',
      isActive: true,
      parameters: JSON.stringify({
        system: true,
        description: 'No student group/batch can attend more than one class at the same time slot.',
        penalty: 1000,
      }),
    },
  ];

  for (const constraint of systemConstraints) {
    const existing = await prisma.constraint.findFirst({
      where: { type: constraint.type },
    });

    if (!existing) {
      await prisma.constraint.create({ data: constraint });
    } else {
      // Ensure system constraints are always active and MANDATORY
      await prisma.constraint.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          priority: 'MANDATORY',
          parameters: constraint.parameters,
        },
      });
    }
  }
}
