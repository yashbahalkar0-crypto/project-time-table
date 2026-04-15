import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const CONSTRAINT_TYPES = [
  { value: 'TEACHER_AVAILABILITY', label: 'Teacher Availability', category: 'Teacher' },
  { value: 'TEACHER_MAX_LECTURES', label: 'Max Lectures Per Day', category: 'Teacher' },
  { value: 'TEACHER_PREFERRED_SLOTS', label: 'Preferred Teaching Slots', category: 'Teacher' },
  { value: 'TEACHER_NO_EARLY_MORNING', label: 'No Early Morning', category: 'Teacher' },
  { value: 'SUBJECT_CONSECUTIVE_LABS', label: 'Consecutive Lab Sessions', category: 'Subject' },
  { value: 'SUBJECT_BEFORE_OTHER', label: 'Subject Ordering', category: 'Subject' },
  { value: 'SUBJECT_REPETITION_LIMIT', label: 'Repetition Limit', category: 'Subject' },
  { value: 'ROOM_LAB_ONLY', label: 'Lab-Only Rooms', category: 'Room' },
  { value: 'ROOM_CAPACITY', label: 'Room Capacity Check', category: 'Room' },
  { value: 'ROOM_DEPARTMENT_SPECIFIC', label: 'Department-Specific Rooms', category: 'Room' },
  { value: 'BATCH_NO_OVERLAP', label: 'No Batch Overlap', category: 'Batch' },
  { value: 'BATCH_MAX_LECTURES', label: 'Max Lectures Per Day', category: 'Batch' },
  { value: 'BATCH_MANDATORY_BREAK', label: 'Mandatory Break', category: 'Batch' },
  { value: 'GLOBAL_NO_TEACHER_CONFLICT', label: 'No Teacher Conflicts', category: 'Global' },
  { value: 'GLOBAL_NO_ROOM_CONFLICT', label: 'No Room Conflicts', category: 'Global' },
  { value: 'GLOBAL_NO_LAB_CONFLICT', label: 'No Lab Conflicts', category: 'Global' },
  { value: 'GLOBAL_NO_BATCH_OVERLAP', label: 'No Student Group Overlap', category: 'Global' },
  { value: 'GLOBAL_BALANCED_WORKLOAD', label: 'Balanced Workload', category: 'Global' },
  { value: 'GLOBAL_NO_HEAVY_CONSECUTIVE', label: 'No Heavy Consecutive', category: 'Global' },
  { value: 'CUSTOM', label: 'Custom Rule', category: 'Custom' },
];

export const SYSTEM_CONSTRAINT_TYPES = [
  'GLOBAL_NO_TEACHER_CONFLICT',
  'GLOBAL_NO_ROOM_CONFLICT',
  'GLOBAL_NO_LAB_CONFLICT',
  'GLOBAL_NO_BATCH_OVERLAP',
];

export function isSystemConstraint(type: string): boolean {
  return SYSTEM_CONSTRAINT_TYPES.includes(type);
}

export const PRIORITIES = [
  { value: 'MANDATORY', label: 'Mandatory', color: 'text-red-400' },
  { value: 'HIGH', label: 'High', color: 'text-orange-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-400' },
  { value: 'LOW', label: 'Low', color: 'text-green-400' },
];

export function getSubjectColor(index: number): string {
  return `subject-color-${index % 8}`;
}

