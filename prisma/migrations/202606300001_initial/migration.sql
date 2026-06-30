CREATE TYPE "Role" AS ENUM ('SYSTEM', 'OWNER', 'MANAGER', 'STAFF');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'RESIGNED');
CREATE TYPE "AttendanceStatus" AS ENUM ('WORKING', 'NORMAL', 'LATE', 'VERY_LATE', 'NO_PAY', 'EARLY_LEAVE', 'ABSENT', 'LEAVE');

CREATE TABLE "employees" (
  "id" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "gender" TEXT,
  "age" INTEGER,
  "address" TEXT,
  "phone" TEXT,
  "line_id" TEXT,
  "position" TEXT,
  "start_date" DATE,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "employee_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_rules" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "from_time" TEXT NOT NULL,
  "to_time" TEXT,
  "deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "no_pay" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_records" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "leave_type_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wage_settings" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "daily_wage" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wage_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_records" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "check_in" TEXT,
  "check_out" TEXT,
  "check_out_date" DATE,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'WORKING',
  "status_label" TEXT NOT NULL DEFAULT 'ทำงาน',
  "leave_type_id" TEXT,
  "auto_closed" BOOLEAN NOT NULL DEFAULT false,
  "auto_closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wage_calculations" (
  "id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "attendance_record_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "base_wage" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "deduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "net_wage" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status_label" TEXT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wage_calculations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE UNIQUE INDEX "leave_types_name_key" ON "leave_types"("name");
CREATE UNIQUE INDEX "attendance_records_employee_id_date_key" ON "attendance_records"("employee_id", "date");
CREATE UNIQUE INDEX "wage_calculations_attendance_record_id_key" ON "wage_calculations"("attendance_record_id");
CREATE INDEX "employees_first_name_last_name_idx" ON "employees"("first_name", "last_name");
CREATE INDEX "sessions_token_idx" ON "sessions"("token");
CREATE INDEX "leave_records_date_employee_id_idx" ON "leave_records"("date", "employee_id");
CREATE INDEX "wage_settings_employee_id_active_idx" ON "wage_settings"("employee_id", "active");
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");
CREATE INDEX "wage_calculations_date_employee_id_idx" ON "wage_calculations"("date", "employee_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wage_settings" ADD CONSTRAINT "wage_settings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wage_calculations" ADD CONSTRAINT "wage_calculations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wage_calculations" ADD CONSTRAINT "wage_calculations_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
