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

let server, baseURL, token, companyId;

before(async () => {
  ({ server, baseURL } = await startServer());
  const reg = await registerCompany(baseURL, {
    companyName: 'Empresa Employees',
    email: uniqueEmail('employees'),
  });
  ({ token, companyId } = reg.body);
});

after(async () => {
  await cleanupCompany(companyId);
  await stopServer(server);
  await closePool();
});

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

test('cria colaborador e ele aparece na listagem', async () => {
  const createRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: 'Colaborador Teste',
      cpf: uniqueCpf(),
      cargo: 'QA',
      salary: 5000,
      hire_date: '2026-01-01',
    }),
  });
  const created = await createRes.json();
  assert.equal(createRes.status, 201);
  assert.equal(created.status, 'ativo');

  const listRes = await fetch(`${baseURL}/employees`, { headers: authHeaders() });
  const list = await listRes.json();
  assert.ok(list.some((e) => e.id === created.id));
});

test('CPF duplicado retorna 409', async () => {
  const cpf = uniqueCpf();
  const payload = { name: 'Dup', cpf, cargo: 'X', salary: 1000, hire_date: '2026-01-01' };

  const first = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, name: 'Dup2' }),
  });
  assert.equal(second.status, 409);
});

test('campo obrigatório faltando retorna 400', async () => {
  const res = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'Sem CPF', cargo: 'X', salary: 1000, hire_date: '2026-01-01' }),
  });
  assert.equal(res.status, 400);
});

test('DELETE inativa em vez de remover (soft delete)', async () => {
  const createRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: 'Para Inativar',
      cpf: uniqueCpf(),
      cargo: 'X',
      salary: 1000,
      hire_date: '2026-01-01',
    }),
  });
  const created = await createRes.json();

  const delRes = await fetch(`${baseURL}/employees/${created.id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(delRes.status, 200);

  const listRes = await fetch(`${baseURL}/employees`, { headers: authHeaders() });
  const list = await listRes.json();
  const found = list.find((e) => e.id === created.id);
  assert.ok(found, 'colaborador ainda deve existir na listagem (soft delete, não remoção)');
  assert.equal(found.status, 'inativo');
});
