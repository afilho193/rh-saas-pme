import pool from '../db/config.js';

export const getLeaveRequests = async (req, res) => {
  const { companyId } = req;
  const { employeeId, status } = req.query;

  try {
    let query = `SELECT lr.id, lr.employee_id, e.name, lr.start_date, lr.end_date, lr.type, lr.status, lr.created_at
                 FROM leave_requests lr
                 JOIN employees e ON lr.employee_id = e.id
                 WHERE e.company_id = $1`;
    const params = [companyId];

    if (employeeId) {
      query += ` AND lr.employee_id = $${params.length + 1}`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND lr.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY lr.created_at DESC';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const createLeaveRequest = async (req, res) => {
  const { companyId } = req;
  const { employee_id, start_date, end_date, type } = req.body;

  if (!employee_id || !start_date || !end_date || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify employee belongs to company
    const empCheck = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [employee_id, companyId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await pool.query(
      'INSERT INTO leave_requests (employee_id, start_date, end_date, type, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [employee_id, start_date, end_date, type, 'pendente']
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const approveLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    // Get leave request details
    const leaveCheck = await pool.query(
      `SELECT lr.id, lr.employee_id, lr.start_date, lr.end_date, lr.type
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.id = $1 AND e.company_id = $2`,
      [id, companyId]
    );

    if (leaveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = leaveCheck.rows[0];

    // Calculate days
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Update leave request status
    const result = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
      ['aprovado', id]
    );

    // Update leave balance if it's vacation. leave_balance only gets a row for the
    // employee's hire year (see employeeController.createEmployee) — a plain UPDATE here
    // would silently affect zero rows for any other year, losing the deduction. Upsert
    // so a request for a year without a balance row creates one (20 days, matching the
    // default granted at hire) instead of failing quietly.
    if (leave.type === 'férias') {
      const year = start.getFullYear();
      await pool.query(
        `INSERT INTO leave_balance (employee_id, year, total_days, used_days)
         VALUES ($1, $2, 20, $3)
         ON CONFLICT (employee_id, year)
         DO UPDATE SET used_days = leave_balance.used_days + $3`,
        [leave.employee_id, year, daysRequested]
      );
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to approve leave request' });
  }
};

export const rejectLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    const leaveCheck = await pool.query(
      `SELECT lr.id FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.id = $1 AND e.company_id = $2`,
      [id, companyId]
    );

    if (leaveCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const result = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *',
      ['rejeitado', id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to reject leave request' });
  }
};

export const getLeaveBalance = async (req, res) => {
  const { employeeId } = req.params;
  const { companyId } = req;
  const year = req.query.year || new Date().getFullYear();

  try {
    // Verify employee belongs to company
    const empCheck = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await pool.query(
      'SELECT id, employee_id, year, total_days, used_days FROM leave_balance WHERE employee_id = $1 AND year = $2',
      [employeeId, year]
    );

    if (result.rows.length === 0) {
      return res.json({ employee_id: employeeId, year, total_days: 20, used_days: 0 });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
};
