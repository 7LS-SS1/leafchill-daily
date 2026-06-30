CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SYSTEM', 'Owner', 'Manager', 'Staff')),
  employee_id TEXT REFERENCES employees(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  address TEXT,
  phone TEXT,
  line_id TEXT,
  position TEXT,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'กำลังทำงาน',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_rules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  from_time TIME NOT NULL,
  to_time TIME,
  deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
  no_pay BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wage_settings (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  daily_wage NUMERIC(10, 2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  check_out_date DATE,
  auto_closed BOOLEAN NOT NULL DEFAULT FALSE,
  auto_closed_at TIMESTAMP,
  status TEXT NOT NULL,
  leave_type_id TEXT REFERENCES leave_types(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, date)
);

CREATE TABLE wage_calculations (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  attendance_record_id TEXT NOT NULL REFERENCES attendance_records(id),
  date DATE NOT NULL,
  base_wage NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_wage NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_name ON employees(first_name, last_name);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_wage_date_employee ON wage_calculations(date, employee_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
