-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE,
  cargo VARCHAR(100),
  salary DECIMAL(10,2),
  hire_date DATE,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  doc_type VARCHAR(100),
  file_url VARCHAR(500),
  expiration_date DATE,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  month INT,
  year INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);

-- Payroll Items
CREATE TABLE IF NOT EXISTS payroll_items (
  id SERIAL PRIMARY KEY,
  payroll_id INT REFERENCES payroll(id) ON DELETE CASCADE,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  base_salary DECIMAL(10,2),
  deductions DECIMAL(10,2),
  additions DECIMAL(10,2),
  net_salary DECIMAL(10,2)
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  type VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leave Balance
CREATE TABLE IF NOT EXISTS leave_balance (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  year INT,
  total_days INT,
  used_days INT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
