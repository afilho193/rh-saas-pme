import app from '../src/app.js';
import pool from '../src/db/config.js';

export function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseURL: `http://localhost:${port}/api` });
    });
  });
}

export function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

export async function closePool() {
  await pool.end();
}

export function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@teste.com`;
}

export function uniqueCpf() {
  return `${Date.now()}${Math.floor(Math.random() * 100)}`.slice(-11);
}

export async function cleanupCompany(companyId) {
  if (!companyId) return;
  await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
}

export async function countCompaniesByName(name) {
  const res = await pool.query('SELECT COUNT(*)::int AS count FROM companies WHERE name = $1', [name]);
  return res.rows[0].count;
}

export async function registerCompany(baseURL, { companyName, email, password = 'senha123' }) {
  const res = await fetch(`${baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName, email, password }),
  });
  const body = await res.json();
  return { status: res.status, body };
}
