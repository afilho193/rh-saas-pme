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
let payrollIdA, payrollItemIdA;

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

  const payrollRes = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ month: 5, year: 2031 }), // ano só desta suite, evita colisão
  });
  ({ id: payrollIdA } = await payrollRes.json());

  const itemRes = await fetch(`${baseURL}/payroll/${payrollIdA}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ employee_id: employeeIdA, base_salary: 5000 }),
  });
  ({ id: payrollItemIdA } = await itemRes.json());
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

test('empresa B não consegue editar item de folha da empresa A (regressão: updatePayrollItem não filtrava por company_id)', async () => {
  // Antes da correção, PUT /payroll/:id/items/:itemId só checava
  // `WHERE id = itemId AND payroll_id = id` — sem nenhum filtro de company_id. Qualquer
  // admin autenticado, de qualquer empresa, conseguia editar o item de folha de outra
  // empresa desde que soubesse (ou adivinhasse) os ids. Ver docs/known-limitations.md.
  const res = await fetch(`${baseURL}/payroll/${payrollIdA}/items/${payrollItemIdA}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ base_salary: 999999 }),
  });
  assert.equal(res.status, 404);

  // confirma que o valor da empresa A não foi alterado pela tentativa da empresa B
  const detailsRes = await fetch(`${baseURL}/payroll/${payrollIdA}/details`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const items = await detailsRes.json();
  const item = items.find((i) => i.id === payrollItemIdA);
  assert.equal(Number(item.base_salary), 5000);
});
