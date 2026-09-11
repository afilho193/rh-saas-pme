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

let server, baseURL, token, companyId, employeeId;

before(async () => {
  ({ server, baseURL } = await startServer());
  const reg = await registerCompany(baseURL, {
    companyName: 'Empresa Payroll',
    email: uniqueEmail('payroll'),
  });
  ({ token, companyId } = reg.body);

  const empRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Colaborador Folha',
      cpf: uniqueCpf(),
      cargo: 'QA',
      salary: 5000,
      hire_date: '2026-01-01',
    }),
  });
  ({ id: employeeId } = await empRes.json());
});

after(async () => {
  await cleanupCompany(companyId);
  await stopServer(server);
  await closePool();
});

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Usa ano 2030 para não colidir com folhas de outras execuções/testes na mesma empresa.
test('cria folha e o net_salary do item é calculado no servidor', async () => {
  const payrollRes = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 6, year: 2030 }),
  });
  const payroll = await payrollRes.json();
  assert.equal(payrollRes.status, 201);
  assert.equal(payroll.status, 'draft');

  const itemRes = await fetch(`${baseURL}/payroll/${payroll.id}/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ employee_id: employeeId, base_salary: 5000, deductions: 500, additions: 200 }),
  });
  const item = await itemRes.json();
  assert.equal(itemRes.status, 201);
  assert.equal(Number(item.net_salary), 4700);
});

test('folha duplicada no mesmo mês/ano retorna 409', async () => {
  const first = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 7, year: 2030 }),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 7, year: 2030 }),
  });
  assert.equal(second.status, 409);
});

test('mês fora do intervalo 1-12 retorna 400', async () => {
  const res = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 13, year: 2030 }),
  });
  assert.equal(res.status, 400);
});

test('deductions negativo retorna 400', async () => {
  const payrollRes = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 9, year: 2030 }),
  });
  const payroll = await payrollRes.json();

  const itemRes = await fetch(`${baseURL}/payroll/${payroll.id}/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ employee_id: employeeId, base_salary: 5000, deductions: -50 }),
  });
  assert.equal(itemRes.status, 400);
});

test('atualização parcial de item preserva os campos não enviados (regressão)', async () => {
  // Antes da correção, PUT .../items/:itemId coagia deductions/additions ausentes para 0
  // em JS antes de chegar no SQL, então o COALESCE nunca via NULL e sempre zerava os
  // campos que não foram enviados na atualização parcial.
  const payrollRes = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 10, year: 2030 }),
  });
  const payroll = await payrollRes.json();

  const itemRes = await fetch(`${baseURL}/payroll/${payroll.id}/items`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ employee_id: employeeId, base_salary: 5000, deductions: 300, additions: 100 }),
  });
  const item = await itemRes.json();

  // Atualiza só o base_salary — deductions/additions não deveriam ser tocados.
  const updateRes = await fetch(`${baseURL}/payroll/${payroll.id}/items/${item.id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ base_salary: 6000 }),
  });
  const updated = await updateRes.json();

  assert.equal(Number(updated.base_salary), 6000);
  assert.equal(Number(updated.deductions), 300, 'deductions deveria ter sido preservado');
  assert.equal(Number(updated.additions), 100, 'additions deveria ter sido preservado');
  assert.equal(Number(updated.net_salary), 5800); // 6000 - 300 + 100
});

test('aprovar folha muda status para approved', async () => {
  const createRes = await fetch(`${baseURL}/payroll`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ month: 8, year: 2030 }),
  });
  const payroll = await createRes.json();

  const approveRes = await fetch(`${baseURL}/payroll/${payroll.id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const approved = await approveRes.json();
  assert.equal(approveRes.status, 200);
  assert.equal(approved.status, 'approved');
});
