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
    companyName: 'Empresa Documents',
    email: uniqueEmail('documents'),
  });
  ({ token, companyId } = reg.body);

  const empRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Colaborador Docs',
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

test('cria documento e ele aparece na lista do colaborador', async () => {
  const createRes = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ doc_type: 'RG', file_url: 'https://example.com/rg.pdf' }),
  });
  assert.equal(createRes.status, 201);

  const listRes = await fetch(`${baseURL}/documents/${employeeId}`, { headers: authHeaders() });
  const list = await listRes.json();
  assert.ok(list.some((d) => d.doc_type === 'RG'));
});

test('documento vencendo em breve aparece em /documents/expiring/list', async () => {
  const soon = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ doc_type: 'ASO', file_url: 'https://example.com/aso.pdf', expiration_date: soon }),
  });

  const res = await fetch(`${baseURL}/documents/expiring/list?days=30`, { headers: authHeaders() });
  const list = await res.json();
  assert.ok(list.some((d) => d.doc_type === 'ASO' && d.employee_id === employeeId));
});

test('documento sem data de vencimento não aparece na lista de vencendo', async () => {
  await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ doc_type: 'Contrato Indefinido', file_url: 'https://example.com/contrato.pdf' }),
  });

  const res = await fetch(`${baseURL}/documents/expiring/list?days=30`, { headers: authHeaders() });
  const list = await res.json();
  assert.ok(!list.some((d) => d.doc_type === 'Contrato Indefinido'));
});

test('exclui documento', async () => {
  const createRes = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ doc_type: 'Para Excluir', file_url: 'https://example.com/excluir.pdf' }),
  });
  const created = await createRes.json();

  const delRes = await fetch(`${baseURL}/documents/${created.id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(delRes.status, 200);

  const listRes = await fetch(`${baseURL}/documents/${employeeId}`, { headers: authHeaders() });
  const list = await listRes.json();
  assert.ok(!list.some((d) => d.id === created.id));
});
