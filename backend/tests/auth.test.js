import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startServer,
  stopServer,
  closePool,
  uniqueEmail,
  cleanupCompany,
  registerCompany,
  countCompaniesByName,
} from './helpers.js';

let server, baseURL;
const createdCompanyIds = [];

before(async () => {
  ({ server, baseURL } = await startServer());
});

after(async () => {
  await Promise.all(createdCompanyIds.map(cleanupCompany));
  await stopServer(server);
  await closePool();
});

test('POST /auth/register cria empresa e usuário admin, devolve token', async () => {
  const { status, body } = await registerCompany(baseURL, {
    companyName: 'Empresa Teste',
    email: uniqueEmail('register'),
  });
  createdCompanyIds.push(body.companyId);

  assert.equal(status, 201);
  assert.ok(body.token);
  assert.ok(body.userId);
  assert.ok(body.companyId);
});

test('POST /auth/register com email duplicado retorna 409', async () => {
  const email = uniqueEmail('dup');
  const first = await registerCompany(baseURL, { companyName: 'A', email });
  createdCompanyIds.push(first.body.companyId);

  const second = await registerCompany(baseURL, { companyName: 'B', email });
  assert.equal(second.status, 409);
});

test('email duplicado não deixa empresa órfã (regressão do bug corrigido em set/2026)', async () => {
  // authController.register cria company + user dentro de uma transação; se o insert do
  // user falhar por email duplicado, o insert da company precisa ser desfeito também.
  // Antes da correção, essa empresa ficava no banco para sempre, sem nenhum user.
  const email = uniqueEmail('orfa-regressao');
  const orphanCandidateName = `Empresa Orfa ${Date.now()}`;

  const first = await registerCompany(baseURL, { companyName: 'Empresa Original', email });
  createdCompanyIds.push(first.body.companyId);

  const second = await registerCompany(baseURL, { companyName: orphanCandidateName, email });
  assert.equal(second.status, 409);

  const orphanCount = await countCompaniesByName(orphanCandidateName);
  assert.equal(orphanCount, 0, 'a empresa da tentativa que falhou não deveria ter sido persistida');
});

test('POST /auth/login com senha correta devolve token', async () => {
  const email = uniqueEmail('login-ok');
  const reg = await registerCompany(baseURL, { companyName: 'C', email, password: 'senhacerta' });
  createdCompanyIds.push(reg.body.companyId);

  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'senhacerta' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.token);
});

test('POST /auth/login com senha errada retorna 401', async () => {
  const email = uniqueEmail('login-fail');
  const reg = await registerCompany(baseURL, { companyName: 'D', email, password: 'senhacerta' });
  createdCompanyIds.push(reg.body.companyId);

  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'senhaerrada' }),
  });
  assert.equal(res.status, 401);
});

test('registro com email em formato inválido retorna 400', async () => {
  const { status } = await registerCompany(baseURL, {
    companyName: 'Empresa Email Invalido',
    email: 'não-é-um-email',
  });
  assert.equal(status, 400);
});

test('registro com senha curta demais retorna 400', async () => {
  const { status } = await registerCompany(baseURL, {
    companyName: 'Empresa Senha Curta',
    email: uniqueEmail('senha-curta'),
    password: '123',
  });
  assert.equal(status, 400);
});

test('rota protegida sem token retorna 401', async () => {
  const res = await fetch(`${baseURL}/employees`);
  assert.equal(res.status, 401);
});

test('rota protegida com token inválido retorna 401', async () => {
  const res = await fetch(`${baseURL}/employees`, {
    headers: { Authorization: 'Bearer token-invalido' },
  });
  assert.equal(res.status, 401);
});
