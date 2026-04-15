-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_schedule_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "schedule_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "time_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_schedule_entries" ("batchId", "createdAt", "id", "isLocked", "roomId", "scheduleId", "subjectId", "teacherId", "timeSlotId", "updatedAt") SELECT "batchId", "createdAt", "id", "isLocked", "roomId", "scheduleId", "subjectId", "teacherId", "timeSlotId", "updatedAt" FROM "schedule_entries";
DROP TABLE "schedule_entries";
ALTER TABLE "new_schedule_entries" RENAME TO "schedule_entries";
CREATE UNIQUE INDEX "schedule_entries_scheduleId_teacherId_timeSlotId_key" ON "schedule_entries"("scheduleId", "teacherId", "timeSlotId");
CREATE UNIQUE INDEX "schedule_entries_scheduleId_roomId_timeSlotId_key" ON "schedule_entries"("scheduleId", "roomId", "timeSlotId");
CREATE UNIQUE INDEX "schedule_entries_scheduleId_batchId_timeSlotId_key" ON "schedule_entries"("scheduleId", "batchId", "timeSlotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
