-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "eventType" TEXT NOT NULL DEFAULT 'Work',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" TEXT,
    "recurrenceDays" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurrenceException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "exceptionDate" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT true,
    "newStartTime" DATETIME,
    "newEndTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurrenceException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Event_startTime_endTime_idx" ON "Event"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "RecurrenceException_eventId_idx" ON "RecurrenceException"("eventId");

-- CreateIndex
CREATE INDEX "RecurrenceException_exceptionDate_idx" ON "RecurrenceException"("exceptionDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceException_eventId_exceptionDate_key" ON "RecurrenceException"("eventId", "exceptionDate");
