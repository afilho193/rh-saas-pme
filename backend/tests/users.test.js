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

let server, baseURL, adminToken, companyId;

before(async () => {
  ({ server, baseURL } = await startServer());
  const reg = await registerCompany(baseURL, {
    companyName: 'Empresa Team',
    email: uniqueEmail('team-admin'),
  });
  ({ token: adminToken, companyId } = reg.body);
});

after(async () => {
  await cleanupCompany(companyId);
  await stopServer(server);
  await closePool();
});

function headersFor(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function loginAs(email, password) {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

test('quem registra a empresa recebe role admin no login e no registro', async () => {
  const email = uniqueEmail('role-check');
  const reg = await registerCompany(baseURL, { companyName: 'Empresa Role', email });
  assert.equal(reg.body.role, 'admin');

  const login = await loginAs(email, 'senha123');
  assert.equal(login.role, 'admin');

  await cleanupCompany(reg.body.companyId);
});

test('admin consegue convidar um novo usuário member', async () => {
  const email = uniqueEmail('member');
  const res = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email, password: 'senha123', role: 'member' }),
  });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.role, 'member');
  assert.equal(body.email, email);
  assert.ok(!('password_hash' in body), 'a resposta não deve vazar o hash da senha');
});

test('convite com senha curta demais retorna 400', async () => {
  const res = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email: uniqueEmail('senha-curta'), password: '123', role: 'member' }),
  });
  assert.equal(res.status, 400);
});

test('convite com role inválido retorna 400', async () => {
  const res = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email: uniqueEmail('bad-role'), password: 'senha123', role: 'super-admin' }),
  });
  assert.equal(res.status, 400);
});

test('convite com email já usado na empresa retorna 409', async () => {
  const email = uniqueEmail('dup-invite');
  const first = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email, password: 'senha123', role: 'member' }),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email, password: 'outrasenha', role: 'member' }),
  });
  assert.equal(second.status, 409);
});

test('member consegue logar e o token carrega role member', async () => {
  const email = uniqueEmail('member-login');
  await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email, password: 'senha123', role: 'member' }),
  });

  const login = await loginAs(email, 'senha123');
  assert.equal(login.role, 'member');
  assert.ok(login.token);
});

test('member NÃO consegue convidar outro usuário (403)', async () => {
  const memberEmail = uniqueEmail('member-no-invite');
  await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email: memberEmail, password: 'senha123', role: 'member' }),
  });
  const { token: memberToken } = await loginAs(memberEmail, 'senha123');

  const res = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(memberToken),
    body: JSON.stringify({ email: uniqueEmail('blocked'), password: 'senha123', role: 'member' }),
  });
  assert.equal(res.status, 403);
});

test('member consegue LISTAR colaboradores mas NÃO consegue criar (leitura sim, escrita não)', async () => {
  const memberEmail = uniqueEmail('member-employees');
  await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: headersFor(adminToken),
    body: JSON.stringify({ email: memberEmail, password: 'senha123', role: 'member' }),
  });
  const { token: memberToken } = await loginAs(memberEmail, 'senha123');

  const listRes = await fetch(`${baseURL}/employees`, { headers: headersFor(memberToken) });
  assert.equal(listRes.status, 200);

  const createRes = await fetch(`${baseURL}/employees`, {
    method: 'POST',
    headers: headersFor(memberToken),
    body: JSON.stringify({
      name: 'Criado Por Member',
      cpf: uniqueCpf(),
      cargo: 'X',
      salary: 1000,
      hire_date: '2026-01-01',
    }),
  });
  assert.equal(createRes.status, 403);
});

test('GET /users lista todos os usuários da empresa com seus papéis', async () => {
  const res = await fetch(`${baseURL}/users`, { headers: headersFor(adminToken) });
  const list = await res.json();
  assert.equal(res.status, 200);
  assert.ok(list.some((u) => u.role === 'admin'));
  assert.ok(list.some((u) => u.role === 'member'));
});
