-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('TRANSCRIPT', 'LETTER', 'APPOINTMENT', 'RECORD_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'REJECTED', 'ENROLLED');

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "registration_open" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "year_level" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "program_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "lecturer_id" UUID,
    "grade_status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "grade_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "score" DOUBLE PRECISION,
    "grade" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "topic" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "present" BOOLEAN NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_materials" (
    "id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "term_id" UUID,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "waiver_amount" INTEGER NOT NULL DEFAULT 0,
    "waiver_reason" TEXT,
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "type" "RequestType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" UUID,
    "response" TEXT,
    "appointment_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "previous_school" TEXT NOT NULL,
    "program_id" UUID NOT NULL,
    "intake_year" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "documents_verified" BOOLEAN NOT NULL DEFAULT false,
    "decision_note" TEXT,
    "reviewed_by_id" UUID,
    "student_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_name_key" ON "academic_terms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_program_id_year_level_idx" ON "courses"("program_id", "year_level");

-- CreateIndex
CREATE INDEX "course_offerings_lecturer_id_idx" ON "course_offerings"("lecturer_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_course_id_term_id_key" ON "course_offerings"("course_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_offering_id_key" ON "enrollments"("student_id", "offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_offering_id_date_key" ON "attendance_sessions"("offering_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_enrollment_id_key" ON "attendance_records"("session_id", "enrollment_id");

-- CreateIndex
CREATE INDEX "invoices_student_id_idx" ON "invoices"("student_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_student_id_key" ON "applications"("student_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
