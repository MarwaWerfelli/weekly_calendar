-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('WORK', 'PERSONAL', 'MEETING');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "category" "EventCategory" NOT NULL,
    "recurrencePattern" "RecurrencePattern" NOT NULL,
    "weeklyRecurrenceDays" INTEGER[],
    "recurrenceEndDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "parentId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "isException" BOOLEAN NOT NULL DEFAULT false,
    "isDeletedInstance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_parentId_idx" ON "Event"("parentId");

-- CreateIndex
CREATE INDEX "Event_startTime_endTime_idx" ON "Event"("startTime", "endTime");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
