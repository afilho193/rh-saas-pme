import pool from '../db/config.js';

export const getEmployees = async (req, res) => {
  const { companyId } = req;

  try {
    const result = await pool.query(
      'SELECT id, name, cpf, cargo, salary, hire_date, status FROM employees WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req, res) => {
  const { companyId } = req;
  const { name, cpf, cargo, salary, hire_date } = req.body;

  if (!name || !cpf || !cargo || !salary || !hire_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO employees (company_id, name, cpf, cargo, salary, hire_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [companyId, name, cpf, cargo, salary, hire_date, 'ativo']
    );

    // Create leave balance for current year
    const currentYear = new Date().getFullYear();
    await pool.query(
      'INSERT INTO leave_balance (employee_id, year, total_days, used_days) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, currentYear, 20, 0]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'CPF already exists' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;
  const { name, cargo, salary, status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE employees SET name = COALESCE($1, name), cargo = COALESCE($2, cargo), salary = COALESCE($3, salary), status = COALESCE($4, status), updated_at = NOW() WHERE id = $5 AND company_id = $6 RETURNING *',
      [name, cargo, salary, status, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    const result = await pool.query(
      'UPDATE employees SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
      ['inativo', id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json({ message: 'Employee deactivated' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete employee' });
  }
};
