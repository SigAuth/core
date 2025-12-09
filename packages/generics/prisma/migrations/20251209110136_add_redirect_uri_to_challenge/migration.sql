/*
  Warnings:

  - Added the required column `redirectUri` to the `AuthorizationChallenge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthorizationChallenge" ADD COLUMN     "redirectUri" TEXT NOT NULL;
