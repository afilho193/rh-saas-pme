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
  return { Authorization: `Bearer ${token}` };
}

function fakeFile({ name = 'documento.pdf', type = 'application/pdf', content = '%PDF-1.4 fake' } = {}) {
  return new Blob([content], { type });
}

function uploadForm({ doc_type, expiration_date, file } = {}) {
  const form = new FormData();
  if (doc_type !== undefined) form.append('doc_type', doc_type);
  if (expiration_date) form.append('expiration_date', expiration_date);
  if (file !== null) form.append('file', file ?? fakeFile(), 'documento.pdf');
  return form;
}

test('faz upload de um arquivo real e ele aparece na lista do colaborador, com URL baixável', async () => {
  const createRes = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({ doc_type: 'RG' }),
  });
  const created = await createRes.json();
  assert.equal(createRes.status, 201);
  assert.match(created.file_url, /^https:\/\/.*\.blob\.vercel-storage\.com\/[0-9a-f]+\.pdf$/);

  const listRes = await fetch(`${baseURL}/documents/${employeeId}`, { headers: authHeaders() });
  const list = await listRes.json();
  assert.ok(list.some((d) => d.doc_type === 'RG'));

  // o arquivo precisa estar de fato servível na URL devolvida, não só registrado no banco
  const fileRes = await fetch(created.file_url);
  assert.equal(fileRes.status, 200);
  assert.equal(await fileRes.text(), '%PDF-1.4 fake');
});

test('upload sem arquivo retorna 400', async () => {
  const res = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({ doc_type: 'Sem Arquivo', file: null }),
  });
  assert.equal(res.status, 400);
});

test('tipo de arquivo não permitido retorna 400', async () => {
  const res = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({
      doc_type: 'Executavel',
      file: fakeFile({ name: 'virus.exe', type: 'application/x-msdownload' }),
    }),
  });
  assert.equal(res.status, 400);
});

test('documento vencendo em breve aparece em /documents/expiring/list', async () => {
  const soon = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({ doc_type: 'ASO', expiration_date: soon }),
  });

  const res = await fetch(`${baseURL}/documents/expiring/list?days=30`, { headers: authHeaders() });
  const list = await res.json();
  assert.ok(list.some((d) => d.doc_type === 'ASO' && d.employee_id === employeeId));
});

test('documento sem data de vencimento não aparece na lista de vencendo', async () => {
  await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({ doc_type: 'Contrato Indefinido' }),
  });

  const res = await fetch(`${baseURL}/documents/expiring/list?days=30`, { headers: authHeaders() });
  const list = await res.json();
  assert.ok(!list.some((d) => d.doc_type === 'Contrato Indefinido'));
});

test('exclui documento e o blob some do storage', async () => {
  const createRes = await fetch(`${baseURL}/documents/${employeeId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: uploadForm({ doc_type: 'Para Excluir' }),
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

  const fileRes = await fetch(created.file_url);
  assert.equal(fileRes.status, 404, 'blob deveria ter sido removido do storage junto com o registro');
});
