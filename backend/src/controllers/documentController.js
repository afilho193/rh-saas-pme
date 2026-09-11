import pool from '../db/config.js';
import { dateError } from '../utils/validation.js';

export const getDocuments = async (req, res) => {
  const { employeeId } = req.params;
  const { companyId } = req;

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
      'SELECT id, doc_type, file_url, expiration_date, uploaded_at FROM documents WHERE employee_id = $1 ORDER BY uploaded_at DESC',
      [employeeId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const uploadDocument = async (req, res) => {
  const { employeeId } = req.params;
  const { companyId } = req;
  const { doc_type, file_url, expiration_date } = req.body;

  if (!doc_type || !file_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (expiration_date) {
    const validationError = dateError(expiration_date, 'expiration_date');
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
  }

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
      'INSERT INTO documents (employee_id, doc_type, file_url, expiration_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [employeeId, doc_type, file_url, expiration_date || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req;

  try {
    // Verify document belongs to company
    const docCheck = await pool.query(
      'SELECT d.id FROM documents d JOIN employees e ON d.employee_id = e.id WHERE d.id = $1 AND e.company_id = $2',
      [id, companyId]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const getExpiringDocuments = async (req, res) => {
  const { companyId } = req;
  const days = parseInt(req.query.days) || 30;

  try {
    const result = await pool.query(
      `SELECT d.id, d.doc_type, d.expiration_date, e.id as employee_id, e.name as employee_name
       FROM documents d
       JOIN employees e ON d.employee_id = e.id
       WHERE e.company_id = $1 
       AND d.expiration_date IS NOT NULL
       AND d.expiration_date <= CURRENT_DATE + INTERVAL '1 day' * $2
       AND d.expiration_date > CURRENT_DATE
       ORDER BY d.expiration_date ASC`,
      [companyId, days]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch expiring documents' });
  }
};
