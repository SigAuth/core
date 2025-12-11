-- CreateTable
CREATE TABLE "Mirror" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "autoRun" BOOLEAN NOT NULL DEFAULT false,
    "autoRunInterval" INTEGER,
    "lastRun" TIMESTAMP(3),
    "lastResult" TEXT,

    CONSTRAINT "Mirror_pkey" PRIMARY KEY ("id")
);
