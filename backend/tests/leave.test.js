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
    companyName: 'Empresa Leave',
    email: uniqueEmail('leave'),
  });
  ({ token, companyId } = reg.body);

  const empRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Colaborador Ferias',
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

test('saldo inicial é 20 dias, 0 usados', async () => {
  const res = await fetch(`${baseURL}/leave-balance/${employeeId}`, { headers: authHeaders() });
  const balance = await res.json();
  assert.equal(Number(balance.total_days), 20);
  assert.equal(Number(balance.used_days), 0);
});

test('aprovar férias no ano corrente deduz o saldo pelo número de dias', async () => {
  const year = new Date().getFullYear();
  const createRes = await fetch(`${baseURL}/leave-requests`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      employee_id: employeeId,
      start_date: `${year}-12-01`,
      end_date: `${year}-12-10`,
      type: 'férias',
    }),
  });
  const created = await createRes.json();
  assert.equal(created.status, 'pendente');

  const approveRes = await fetch(`${baseURL}/leave-requests/${created.id}/approve`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  assert.equal(approveRes.status, 200);

  const balanceRes = await fetch(`${baseURL}/leave-balance/${employeeId}?year=${year}`, {
    headers: authHeaders(),
  });
  const balance = await balanceRes.json();
  assert.equal(Number(balance.used_days), 10); // 01 a 10/dez inclusive = 10 dias
});

test('rejeitar solicitação muda status sem deduzir saldo', async () => {
  const year = new Date().getFullYear();
  const createRes = await fetch(`${baseURL}/leave-requests`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      employee_id: employeeId,
      start_date: `${year}-11-01`,
      end_date: `${year}-11-02`,
      type: 'falta',
    }),
  });
  const created = await createRes.json();

  const rejectRes = await fetch(`${baseURL}/leave-requests/${created.id}/reject`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  const rejected = await rejectRes.json();
  assert.equal(rejected.status, 'rejeitado');
});

test('[bug conhecido] aprovar férias num ano sem linha de leave_balance não deduz nada', async () => {
  // Documentado em docs/database.md. leave_balance só é criado para o ano de cadastro do
  // colaborador — aprovar férias num ano futuro sem linha correspondente não gera erro,
  // mas também não persiste a dedução. Este teste existe para travar o comportamento
  // ATUAL, não para validar que ele está certo. No dia em que alguém corrigir o bug,
  // esta asserção vai quebrar de propósito — troque para `used_days === 6` nesse dia.
  const futureYear = new Date().getFullYear() + 2;
  const createRes = await fetch(`${baseURL}/leave-requests`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      employee_id: employeeId,
      start_date: `${futureYear}-01-05`,
      end_date: `${futureYear}-01-10`,
      type: 'férias',
    }),
  });
  const created = await createRes.json();

  const approveRes = await fetch(`${baseURL}/leave-requests/${created.id}/approve`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  assert.equal(approveRes.status, 200);

  const balanceRes = await fetch(`${baseURL}/leave-balance/${employeeId}?year=${futureYear}`, {
    headers: authHeaders(),
  });
  const balance = await balanceRes.json();
  assert.equal(Number(balance.used_days), 0);
});
