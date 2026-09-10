import pool from '../db/config.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { companyName, email, password } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create company
    const companyResult = await pool.query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id',
      [companyName]
    );
    const companyId = companyResult.rows[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (company_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [companyId, email, hashedPassword, 'admin']
    );
    const userId = userResult.rows[0].id;

    // Generate token
    const token = jwt.sign(
      { id: userId, companyId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, userId, companyId });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const result = await pool.query(
      'SELECT id, company_id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, companyId: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token, userId: user.id, companyId: user.company_id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Login failed' });
  }
};
