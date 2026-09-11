import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startServer,
  stopServer,
  closePool,
  uniqueEmail,
  uniqueCpf,
  cleanupCompany,
  registerCompany,
} from './helpers.js';

// Isolamento multi-tenant é feito manualmente (WHERE company_id = $1) em cada controller,
// sem Row Level Security nem middleware central — ver docs/architecture.md. Estes testes
// travam esse comportamento: se um controller futuro esquecer o filtro, é aqui que quebra.

let server, baseURL;
let tokenA, companyIdA, employeeIdA;
let tokenB, companyIdB;

before(async () => {
  ({ server, baseURL } = await startServer());

  const regA = await registerCompany(baseURL, { companyName: 'Empresa A', email: uniqueEmail('tenantA') });
  ({ token: tokenA, companyId: companyIdA } = regA.body);

  const regB = await registerCompany(baseURL, { companyName: 'Empresa B', email: uniqueEmail('tenantB') });
  ({ token: tokenB, companyId: companyIdB } = regB.body);

  const empRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: 'Colaborador da Empresa A',
      cpf: uniqueCpf(),
      cargo: 'QA',
      salary: 5000,
      hire_date: '2026-01-01',
    }),
  });
  ({ id: employeeIdA } = await empRes.json());
});

after(async () => {
  await cleanupCompany(companyIdA);
  await cleanupCompany(companyIdB);
  await stopServer(server);
  await closePool();
});

test('empresa B não vê colaborador da empresa A na listagem', async () => {
  const res = await fetch(`${baseURL}/employees`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const list = await res.json();
  assert.ok(!list.some((e) => e.id === employeeIdA));
});

test('empresa B não consegue editar colaborador da empresa A (404, não vazamento)', async () => {
  const res = await fetch(`${baseURL}/employees/${employeeIdA}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ name: 'Nome Alterado Pela Empresa B' }),
  });
  assert.equal(res.status, 404);
});

test('empresa B não consegue listar documentos de colaborador da empresa A', async () => {
  const res = await fetch(`${baseURL}/documents/${employeeIdA}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(res.status, 404);
});

test('empresa B não consegue ver saldo de férias de colaborador da empresa A', async () => {
  const res = await fetch(`${baseURL}/leave-balance/${employeeIdA}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(res.status, 404);
});
