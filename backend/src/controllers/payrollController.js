import pool from '../db/config.js';
import { monthError, positiveNumberError, nonNegativeNumberError } from '../utils/validation.js';

export const getPayrolls = async (req, res) => {
  const { companyId } = req;
  const { month, year } = req.query;

  try {
    let query = 'SELECT id, month, year, status, created_at FROM payroll WHERE company_id = $1';
    const params = [companyId];

    if (month && year) {
      query += ' AND month = $2 AND year = $3';
      params.push(month, year);
    }

    query += ' ORDER BY year DESC, month DESC';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch payrolls' });
  }
};

export const createPayroll = async (req, res) => {
  const { companyId } = req;
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ error: 'Missing month or year' });
  }

  const monthValidationError = monthError(month);
  if (monthValidationError) {
    return res.status(400).json({ error: monthValidationError });
  }

  try {
    const result = await pool.query(
      'INSERT INTO payroll (company_id, month, year, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyId, month, year, 'draft']
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Payroll for this month already exists' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to create payroll' });
  }
};

export const getPayrollDetails = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    const payrollCheck = await pool.query(
      'SELECT id FROM payroll WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (payrollCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    const result = await pool.query(
      `SELECT pi.id, pi.employee_id, e.name, e.cargo, pi.base_salary, pi.deductions, pi.additions, pi.net_salary
       FROM payroll_items pi
       JOIN employees e ON pi.employee_id = e.id
       WHERE pi.payroll_id = $1
       ORDER BY e.name`,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch payroll details' });
  }
};

export const addPayrollItem = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;
  const { employee_id, base_salary, deductions, additions } = req.body;

  if (!employee_id || base_salary === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const validationError =
    positiveNumberError(base_salary, 'base_salary') ||
    (deductions !== undefined && nonNegativeNumberError(deductions, 'deductions')) ||
    (additions !== undefined && nonNegativeNumberError(additions, 'additions'));
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // Verify payroll belongs to company
    const payrollCheck = await pool.query(
      'SELECT id FROM payroll WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (payrollCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Verify employee belongs to company
    const empCheck = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [employee_id, companyId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const deductionsVal = deductions || 0;
    const additionsVal = additions || 0;
    const netSalary = base_salary - deductionsVal + additionsVal;

    const result = await pool.query(
      'INSERT INTO payroll_items (payroll_id, employee_id, base_salary, deductions, additions, net_salary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, employee_id, base_salary, deductionsVal, additionsVal, netSalary]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to add payroll item' });
  }
};

export const updatePayrollItem = async (req, res) => {
  const { id, itemId } = req.params;
  const { companyId } = req;
  const { base_salary, deductions, additions } = req.body;

  const validationError =
    (base_salary !== undefined && positiveNumberError(base_salary, 'base_salary')) ||
    (deductions !== undefined && nonNegativeNumberError(deductions, 'deductions')) ||
    (additions !== undefined && nonNegativeNumberError(additions, 'additions'));
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    // Fetch the current row (joined through payroll to enforce company_id — the old
    // query here had no tenant filter at all, so any authenticated admin from any
    // company could edit any payroll_item by id) so a partial update — e.g. only
    // base_salary — merges onto the existing deductions/additions instead of zeroing
    // them out. The previous COALESCE never actually fired: deductions/additions were
    // pre-coerced to 0 in JS before reaching the query, so the column always saw 0, not
    // NULL.
    const current = await pool.query(
      `SELECT pi.base_salary, pi.deductions, pi.additions
       FROM payroll_items pi
       JOIN payroll p ON pi.payroll_id = p.id
       WHERE pi.id = $1 AND pi.payroll_id = $2 AND p.company_id = $3`,
      [itemId, id, companyId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll item not found' });
    }

    // pg returns DECIMAL columns as strings (to avoid float precision loss), while values
    // from the request body arrive as JS numbers — mixing the two unconverted turns `+`
    // into string concatenation instead of addition. Number(...) everything up front.
    const baseSalaryVal = Number(base_salary !== undefined ? base_salary : current.rows[0].base_salary);
    const deductionsVal = Number(deductions !== undefined ? deductions : current.rows[0].deductions);
    const additionsVal = Number(additions !== undefined ? additions : current.rows[0].additions);
    const netSalary = baseSalaryVal - deductionsVal + additionsVal;

    const result = await pool.query(
      `UPDATE payroll_items
       SET base_salary = $1, deductions = $2, additions = $3, net_salary = $4
       WHERE id = $5 AND payroll_id = $6
       RETURNING *`,
      [baseSalaryVal, deductionsVal, additionsVal, netSalary, itemId, id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update payroll item' });
  }
};

export const approvePayroll = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    const result = await pool.query(
      'UPDATE payroll SET status = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      ['approved', id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to approve payroll' });
  }
};
