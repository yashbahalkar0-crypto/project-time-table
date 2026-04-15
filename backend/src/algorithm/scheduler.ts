// ═══════════════════════════════════════════════════════════════
// TIMETABLE SCHEDULING ENGINE
// Combines CSP (Constraint Satisfaction) with Genetic Algorithm
// for optimized, conflict-free schedule generation.
// ═══════════════════════════════════════════════════════════════

import { Constraint, Room, Subject, Teacher, Batch, TimeSlot } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────

export interface ScheduleSlot {
  subjectId: string;
  teacherId: string;
  roomId: string;
  batchId: string;
  timeSlotId: string;
  dayOfWeek: number;
  slotIndex: number;
}

export interface AcademicData {
  teachers: Teacher[];
  subjects: (Subject & { teachers: { teacherId: string }[] })[];
  rooms: Room[];
  batches: Batch[];
  timeSlots: TimeSlot[];
  constraints: Constraint[];
}

export interface Chromosome {
  genes: ScheduleSlot[];
  fitness: number;
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  type: string;
  description: string;
  slotIds: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface GenerationResult {
  entries: ScheduleSlot[];
  fitnessScore: number;
  conflictCount: number;
  conflicts: ConflictInfo[];
  generationTimeMs: number;
}

// ── Constraint Validator ───────────────────────────────────────

export class ConstraintValidator {
  private constraints: Constraint[];

  constructor(constraints: Constraint[]) {
    this.constraints = constraints.filter(c => c.isActive);
  }

  /**
   * Evaluate a complete schedule and return penalty score + conflicts.
   * Lower penalty = better schedule.
   */
  evaluate(
    schedule: ScheduleSlot[],
    data: AcademicData
  ): { penalty: number; conflicts: ConflictInfo[] } {
    let penalty = 0;
    const conflicts: ConflictInfo[] = [];

    // ══════════════════════════════════════════════════════════
    // SYSTEM-LEVEL HARD CONSTRAINTS (non-removable, always active)
    // Universal resource exclusivity: No resource can appear
    // more than once at the same time slot.
    // Penalty: +1000 per conflict per resource type.
    // ══════════════════════════════════════════════════════════

    // Helper to detect double-bookings for any resource type
    const checkResourceConflicts = (
      getResourceId: (slot: ScheduleSlot) => string,
      conflictType: string,
      getResourceName: (id: string) => string,
      penaltyPerConflict: number = 1000
    ) => {
      const resourceSlots = new Map<string, ScheduleSlot[]>();
      for (const slot of schedule) {
        const key = `${getResourceId(slot)}-${slot.timeSlotId}`;
        if (!resourceSlots.has(key)) resourceSlots.set(key, []);
        resourceSlots.get(key)!.push(slot);
      }
      for (const [, slots] of resourceSlots) {
        if (slots.length > 1) {
          penalty += penaltyPerConflict;
          conflicts.push({
            type: conflictType,
            description: `${getResourceName(getResourceId(slots[0]))} double-booked at timeslot`,
            slotIds: slots.map(s => s.timeSlotId),
            severity: 'HIGH',
          });
        }
      }
    };

    // 1. Faculty conflict (+1000 penalty)
    checkResourceConflicts(
      (slot) => slot.teacherId,
      'TEACHER_CONFLICT',
      (id) => `Faculty ${data.teachers.find(t => t.id === id)?.name || 'Unknown'}`
    );

    // 2. Room conflict (+1000 penalty) — covers classrooms & seminar halls
    checkResourceConflicts(
      (slot) => slot.roomId,
      'ROOM_CONFLICT',
      (id) => `Room ${data.rooms.find(r => r.id === id)?.name || 'Unknown'}`
    );

    // 3. Lab conflict (+1000 penalty) — explicit check for lab-type rooms
    // Labs and classrooms sharing the same physical room are treated as a
    // single resource (handled by room conflict above), but labs get an
    // additional dedicated conflict type for clarity in reporting.
    const labRoomIds = new Set(data.rooms.filter(r => r.type === 'LAB').map(r => r.id));
    const labSlotEntries = schedule.filter(s => labRoomIds.has(s.roomId));
    const labSlotMap = new Map<string, ScheduleSlot[]>();
    for (const slot of labSlotEntries) {
      const key = `${slot.roomId}-${slot.timeSlotId}`;
      if (!labSlotMap.has(key)) labSlotMap.set(key, []);
      labSlotMap.get(key)!.push(slot);
    }
    for (const [, slots] of labSlotMap) {
      if (slots.length > 1) {
        // Note: room conflict penalty already applied above, so this is
        // only for reporting/tracking purposes (no double penalty)
        conflicts.push({
          type: 'LAB_CONFLICT',
          description: `Lab ${data.rooms.find(r => r.id === slots[0].roomId)?.name || 'Unknown'} double-booked`,
          slotIds: slots.map(s => s.timeSlotId),
          severity: 'HIGH',
        });
      }
    }

    // 4. Student group (batch) overlap (+1000 penalty)
    checkResourceConflicts(
      (slot) => slot.batchId,
      'BATCH_OVERLAP',
      (id) => `Student Group ${data.batches.find(b => b.id === id)?.name || 'Unknown'}`
    );

    // ── Soft constraints ──
    // 4. Teacher max lectures per day
    const teacherDayCount = new Map<string, number>();
    for (const slot of schedule) {
      const key = `${slot.teacherId}-${slot.dayOfWeek}`;
      teacherDayCount.set(key, (teacherDayCount.get(key) || 0) + 1);
    }
    for (const [key, count] of teacherDayCount) {
      const teacherId = key.split('-')[0];
      const teacher = data.teachers.find(t => t.id === teacherId);
      if (teacher && count > teacher.maxLecturesDay) {
        penalty += 50 * (count - teacher.maxLecturesDay);
        conflicts.push({
          type: 'TEACHER_OVERLOAD',
          description: `Teacher ${teacher.name} has ${count} lectures on day (max: ${teacher.maxLecturesDay})`,
          slotIds: [],
          severity: 'MEDIUM',
        });
      }
    }

    // 5. Batch max lectures per day
    const batchDayCount = new Map<string, number>();
    for (const slot of schedule) {
      const key = `${slot.batchId}-${slot.dayOfWeek}`;
      batchDayCount.set(key, (batchDayCount.get(key) || 0) + 1);
    }
    for (const [key, count] of batchDayCount) {
      const batchId = key.split('-')[0];
      const batch = data.batches.find(b => b.id === batchId);
      if (batch && count > batch.maxLecturesDay) {
        penalty += 30 * (count - batch.maxLecturesDay);
        conflicts.push({
          type: 'BATCH_OVERLOAD',
          description: `Batch ${batch.name} has ${count} lectures on day (max: ${batch.maxLecturesDay})`,
          slotIds: [],
          severity: 'MEDIUM',
        });
      }
    }

    // 6. Lab-in-lab-room check
    for (const slot of schedule) {
      const subject = data.subjects.find(s => s.id === slot.subjectId);
      const room = data.rooms.find(r => r.id === slot.roomId);
      if (subject?.isLab && room?.type !== 'LAB') {
        penalty += 200;
        conflicts.push({
          type: 'LAB_ROOM_MISMATCH',
          description: `Lab subject ${subject.name} assigned to non-lab room ${room?.name}`,
          slotIds: [slot.timeSlotId],
          severity: 'MEDIUM',
        });
      }
    }

    // 7. Teacher availability constraints
    for (const constraint of this.constraints) {
      if (constraint.type === 'TEACHER_AVAILABILITY' && constraint.teacherId) {
        const params = typeof constraint.parameters === 'string' ? JSON.parse(constraint.parameters) : constraint.parameters as any;
        const unavailableSlots: string[] = params?.unavailableSlots || [];
        for (const slot of schedule) {
          if (slot.teacherId === constraint.teacherId && unavailableSlots.includes(slot.timeSlotId)) {
            const p = constraint.priority === 'MANDATORY' ? 500 : constraint.priority === 'HIGH' ? 100 : 30;
            penalty += p;
            conflicts.push({
              type: 'TEACHER_UNAVAILABLE',
              description: `Teacher assigned to unavailable slot`,
              slotIds: [slot.timeSlotId],
              severity: constraint.priority === 'MANDATORY' ? 'HIGH' : 'MEDIUM',
            });
          }
        }
      }

      if (constraint.type === 'TEACHER_NO_EARLY_MORNING' && constraint.teacherId) {
        for (const slot of schedule) {
          if (slot.teacherId === constraint.teacherId && slot.slotIndex === 0) {
            penalty += 20;
          }
        }
      }
    }

    // 8. Workload balance — standard deviation of lectures per teacher
    const teacherLoadMap = new Map<string, number>();
    for (const slot of schedule) {
      teacherLoadMap.set(slot.teacherId, (teacherLoadMap.get(slot.teacherId) || 0) + 1);
    }
    const loads = [...teacherLoadMap.values()];
    if (loads.length > 1) {
      const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
      const variance = loads.reduce((sum, l) => sum + (l - mean) ** 2, 0) / loads.length;
      penalty += Math.sqrt(variance) * 5;
    }

    return { penalty, conflicts };
  }
}

// ── Genetic Algorithm Scheduler ────────────────────────────────

export class GeneticScheduler {
  private data: AcademicData;
  private validator: ConstraintValidator;
  private populationSize: number;
  private generations: number;
  private mutationRate: number;
  private elitismRate: number;

  constructor(
    data: AcademicData,
    options?: {
      populationSize?: number;
      generations?: number;
      mutationRate?: number;
      elitismRate?: number;
    }
  ) {
    this.data = data;
    this.validator = new ConstraintValidator(data.constraints);
    this.populationSize = options?.populationSize || 50;
    this.generations = options?.generations || 200;
    this.mutationRate = options?.mutationRate || 0.15;
    this.elitismRate = options?.elitismRate || 0.1;
  }

  /**
   * Main entry: generate an optimized schedule.
   */
  generate(): GenerationResult {
    const startTime = Date.now();

    // Build the list of required allocations (what needs to be scheduled)
    const allocations = this.buildAllocations();
    if (allocations.length === 0) {
      return { entries: [], fitnessScore: 100, conflictCount: 0, conflicts: [], generationTimeMs: 0 };
    }

    // Available (non-break) slots
    const availableSlots = this.data.timeSlots.filter(ts => !ts.isBreak);

    // Step 1: Generate initial population using backtracking + random
    let population = this.initializePopulation(allocations, availableSlots);

    // Step 2: Evolve
    for (let gen = 0; gen < this.generations; gen++) {
      population = this.evolve(population, allocations, availableSlots);

      // Early exit if perfect solution found
      if (population[0].fitness >= 99) break;
    }

    // Best chromosome
    const best = population[0];
    const elapsed = Date.now() - startTime;

    return {
      entries: best.genes,
      fitnessScore: Math.round(best.fitness * 100) / 100,
      conflictCount: best.conflicts.length,
      conflicts: best.conflicts,
      generationTimeMs: elapsed,
    };
  }

  /**
   * Build required allocations: for each batch, for each subject, X lectures per week.
   */
  private buildAllocations(): { subjectId: string; batchId: string; teacherId: string; isLab: boolean; labDuration: number }[] {
    const allocations: any[] = [];

    for (const batch of this.data.batches) {
      // Find subjects for this batch's semester & department
      const batchSubjects = this.data.subjects.filter(
        s => s.semesterId === batch.semesterId && s.departmentId === batch.departmentId
      );

      for (const subject of batchSubjects) {
        // Pick a teacher for this subject
        const teacherLink = subject.teachers[0];
        if (!teacherLink) continue; // no teacher assigned

        const lectureCount = subject.isLab
          ? Math.ceil(subject.lecturesPerWeek / subject.labDuration)
          : subject.lecturesPerWeek;

        for (let i = 0; i < lectureCount; i++) {
          allocations.push({
            subjectId: subject.id,
            batchId: batch.id,
            teacherId: teacherLink.teacherId,
            isLab: subject.isLab,
            labDuration: subject.labDuration,
          });
        }
      }
    }

    return allocations;
  }

  /**
   * Initialize population with heuristic + random chromosomes.
   */
  private initializePopulation(
    allocations: any[],
    availableSlots: TimeSlot[]
  ): Chromosome[] {
    const population: Chromosome[] = [];

    for (let i = 0; i < this.populationSize; i++) {
      const genes: ScheduleSlot[] = [];
      const usedTeacherSlots = new Set<string>();
      const usedRoomSlots = new Set<string>();
      const usedBatchSlots = new Set<string>();

      // Shuffle allocations for diversity
      const shuffled = [...allocations].sort(() => Math.random() - 0.5);

      for (const alloc of shuffled) {
        // Find valid slot + room with no conflicts
        const validPlacements = this.findValidPlacements(
          alloc, availableSlots, usedTeacherSlots, usedRoomSlots, usedBatchSlots
        );

        if (validPlacements.length > 0) {
          // Pick a random valid placement (heuristic: prefer less-used days)
          const placement = validPlacements[Math.floor(Math.random() * Math.min(3, validPlacements.length))];
          genes.push(placement);
          usedTeacherSlots.add(`${placement.teacherId}-${placement.timeSlotId}`);
          usedRoomSlots.add(`${placement.roomId}-${placement.timeSlotId}`);
          usedBatchSlots.add(`${placement.batchId}-${placement.timeSlotId}`);

          // If lab, also reserve consecutive slots
          if (alloc.isLab && alloc.labDuration > 1) {
            const nextSlots = availableSlots.filter(
              ts => ts.dayOfWeek === placement.dayOfWeek && ts.slotIndex > placement.slotIndex && ts.slotIndex < placement.slotIndex + alloc.labDuration
            );
            for (const ns of nextSlots) {
              const labSlot: ScheduleSlot = {
                ...placement,
                timeSlotId: ns.id,
                dayOfWeek: ns.dayOfWeek,
                slotIndex: ns.slotIndex,
              };
              genes.push(labSlot);
              usedTeacherSlots.add(`${labSlot.teacherId}-${labSlot.timeSlotId}`);
              usedRoomSlots.add(`${labSlot.roomId}-${labSlot.timeSlotId}`);
              usedBatchSlots.add(`${labSlot.batchId}-${labSlot.timeSlotId}`);
            }
          }
        } else {
          // Fallback: random placement (may have conflicts)
          const ts = availableSlots[Math.floor(Math.random() * availableSlots.length)];
          const eligibleRooms = alloc.isLab
            ? this.data.rooms.filter(r => r.type === 'LAB')
            : this.data.rooms.filter(r => r.type === 'CLASSROOM' || r.type === 'SEMINAR_HALL');
          const room = eligibleRooms.length > 0
            ? eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)]
            : this.data.rooms[Math.floor(Math.random() * this.data.rooms.length)];

          const gene: ScheduleSlot = {
            subjectId: alloc.subjectId,
            teacherId: alloc.teacherId,
            roomId: room.id,
            batchId: alloc.batchId,
            timeSlotId: ts.id,
            dayOfWeek: ts.dayOfWeek,
            slotIndex: ts.slotIndex,
          };
          genes.push(gene);
        }
      }

      const { penalty, conflicts } = this.validator.evaluate(genes, this.data);
      const fitness = Math.max(0, 100 - penalty * 0.01);
      population.push({ genes, fitness, conflicts });
    }

    // Sort by fitness descending
    population.sort((a, b) => b.fitness - a.fitness);
    return population;
  }

  /**
   * Find valid time-slot + room placements for an allocation.
   */
  private findValidPlacements(
    alloc: any,
    availableSlots: TimeSlot[],
    usedTeacherSlots: Set<string>,
    usedRoomSlots: Set<string>,
    usedBatchSlots: Set<string>
  ): ScheduleSlot[] {
    const placements: ScheduleSlot[] = [];
    const eligibleRooms = alloc.isLab
      ? this.data.rooms.filter(r => r.type === 'LAB')
      : this.data.rooms.filter(r => r.type === 'CLASSROOM' || r.type === 'SEMINAR_HALL');

    if (eligibleRooms.length === 0) return placements;

    for (const ts of availableSlots) {
      if (usedTeacherSlots.has(`${alloc.teacherId}-${ts.id}`)) continue;
      if (usedBatchSlots.has(`${alloc.batchId}-${ts.id}`)) continue;

      for (const room of eligibleRooms) {
        if (usedRoomSlots.has(`${room.id}-${ts.id}`)) continue;

        // For labs, check consecutive slots are free
        if (alloc.isLab && alloc.labDuration > 1) {
          let consecutive = true;
          for (let d = 1; d < alloc.labDuration; d++) {
            const nextSlot = availableSlots.find(
              s => s.dayOfWeek === ts.dayOfWeek && s.slotIndex === ts.slotIndex + d
            );
            if (!nextSlot) { consecutive = false; break; }
            if (usedTeacherSlots.has(`${alloc.teacherId}-${nextSlot.id}`)) { consecutive = false; break; }
            if (usedRoomSlots.has(`${room.id}-${nextSlot.id}`)) { consecutive = false; break; }
            if (usedBatchSlots.has(`${alloc.batchId}-${nextSlot.id}`)) { consecutive = false; break; }
          }
          if (!consecutive) continue;
        }

        placements.push({
          subjectId: alloc.subjectId,
          teacherId: alloc.teacherId,
          roomId: room.id,
          batchId: alloc.batchId,
          timeSlotId: ts.id,
          dayOfWeek: ts.dayOfWeek,
          slotIndex: ts.slotIndex,
        });
      }
    }

    return placements;
  }

  /**
   * One generation of evolution.
   */
  private evolve(
    population: Chromosome[],
    allocations: any[],
    availableSlots: TimeSlot[]
  ): Chromosome[] {
    const newPop: Chromosome[] = [];
    const eliteCount = Math.ceil(this.populationSize * this.elitismRate);

    // Elitism: keep best
    for (let i = 0; i < eliteCount; i++) {
      newPop.push(population[i]);
    }

    // Fill rest with crossover + mutation
    while (newPop.length < this.populationSize) {
      const parent1 = this.tournamentSelect(population);
      const parent2 = this.tournamentSelect(population);
      let child = this.crossover(parent1, parent2);

      if (Math.random() < this.mutationRate) {
        child = this.mutate(child, availableSlots);
      }

      const { penalty, conflicts } = this.validator.evaluate(child.genes, this.data);
      child.fitness = Math.max(0, 100 - penalty * 0.01);
      child.conflicts = conflicts;
      newPop.push(child);
    }

    newPop.sort((a, b) => b.fitness - a.fitness);
    return newPop;
  }

  /**
   * Tournament selection: pick best from random subset.
   */
  private tournamentSelect(population: Chromosome[]): Chromosome {
    const size = Math.min(5, population.length);
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 1; i < size; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (candidate.fitness > best.fitness) best = candidate;
    }
    return best;
  }

  /**
   * Uniform crossover: randomly pick genes from either parent.
   */
  private crossover(p1: Chromosome, p2: Chromosome): Chromosome {
    const maxLen = Math.max(p1.genes.length, p2.genes.length);
    const genes: ScheduleSlot[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (i < p1.genes.length && i < p2.genes.length) {
        genes.push(Math.random() < 0.5 ? { ...p1.genes[i] } : { ...p2.genes[i] });
      } else if (i < p1.genes.length) {
        genes.push({ ...p1.genes[i] });
      } else {
        genes.push({ ...p2.genes[i] });
      }
    }
    return { genes, fitness: 0, conflicts: [] };
  }

  /**
   * Mutation: randomly reassign time slot or room for a gene.
   */
  private mutate(chromosome: Chromosome, availableSlots: TimeSlot[]): Chromosome {
    const genes = [...chromosome.genes];
    const idx = Math.floor(Math.random() * genes.length);
    const gene = { ...genes[idx] };

    if (Math.random() < 0.5) {
      // Change time slot
      const newTs = availableSlots[Math.floor(Math.random() * availableSlots.length)];
      gene.timeSlotId = newTs.id;
      gene.dayOfWeek = newTs.dayOfWeek;
      gene.slotIndex = newTs.slotIndex;
    } else {
      // Change room
      const subject = this.data.subjects.find(s => s.id === gene.subjectId);
      const eligibleRooms = subject?.isLab
        ? this.data.rooms.filter(r => r.type === 'LAB')
        : this.data.rooms.filter(r => r.type !== 'LAB');
      if (eligibleRooms.length > 0) {
        gene.roomId = eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)].id;
      }
    }

    genes[idx] = gene;
    return { genes, fitness: 0, conflicts: [] };
  }
}
