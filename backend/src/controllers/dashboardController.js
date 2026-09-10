import pool from '../db/config.js';

export const getSummary = async (req, res) => {
  const { companyId } = req;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  try {
    // Headcount
    const headcountResult = await pool.query(
      'SELECT COUNT(*) as total FROM employees WHERE company_id = $1 AND status = $2',
      [companyId, 'ativo']
    );
    const headcount = parseInt(headcountResult.rows[0].total);

    // Open payrolls
    const payrollResult = await pool.query(
      'SELECT COUNT(*) as total FROM payroll WHERE company_id = $1 AND status = $2 AND month = $3 AND year = $4',
      [companyId, 'draft', currentMonth, currentYear]
    );
    const openPayrolls = parseInt(payrollResult.rows[0].total);

    // Pending leave requests
    const leaveResult = await pool.query(
      `SELECT COUNT(*) as total FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE e.company_id = $1 AND lr.status = $2`,
      [companyId, 'pendente']
    );
    const pendingLeaves = parseInt(leaveResult.rows[0].total);

    // Expiring documents (next 30 days)
    const docsResult = await pool.query(
      `SELECT COUNT(*) as total FROM documents d
       JOIN employees e ON d.employee_id = e.id
       WHERE e.company_id = $1 
       AND d.expiration_date IS NOT NULL
       AND d.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
       AND d.expiration_date > CURRENT_DATE`,
      [companyId]
    );
    const expiringDocs = parseInt(docsResult.rows[0].total);

    return res.json({
      headcount,
      openPayrolls,
      pendingLeaves,
      expiringDocs,
      currentMonth,
      currentYear
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
};
