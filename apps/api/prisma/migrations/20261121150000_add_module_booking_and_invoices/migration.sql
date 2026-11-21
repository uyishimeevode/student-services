-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('BOOKED', 'REGISTERED');

-- AlterTable
ALTER TABLE "academic_terms" ADD COLUMN     "fee_per_credit" INTEGER NOT NULL DEFAULT 25000;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "registered_at" TIMESTAMPTZ,
ADD COLUMN     "status" "EnrollmentStatus" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "enrollment_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_enrollment_id_key" ON "invoices"("enrollment_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing registrations were confirmed when they were created
UPDATE "enrollments" SET "registered_at" = "created_at" WHERE "registered_at" IS NULL;
