import pool from '../db/config.js';
import bcrypt from 'bcryptjs';
import { emailError, passwordError } from '../utils/validation.js';

const VALID_ROLES = ['admin', 'member'];

export const listUsers = async (req, res) => {
  const { companyId } = req;

  try {
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE company_id = $1 ORDER BY created_at',
      [companyId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const inviteUser = async (req, res) => {
  const { companyId } = req;
  const { email, password, role = 'member' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const validationError = emailError(email) || passwordError(password);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role, created_at',
      [companyId, email, hashedPassword, role]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to invite user' });
  }
};
