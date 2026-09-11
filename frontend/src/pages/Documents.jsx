import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export default function Documents() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    doc_type: '',
    file_url: '',
    expiration_date: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) fetchDocuments(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const fetchInitialData = async () => {
    try {
      const [empRes, expiringRes] = await Promise.all([
        api.get('/employees'),
        api.get('/documents/expiring/list'),
      ]);
      setEmployees(empRes.data);
      setExpiringDocs(expiringRes.data);
      if (empRes.data.length > 0) setSelectedEmployeeId(empRes.data[0].id);
      else setLoading(false);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setLoading(false);
    }
  };

  const fetchDocuments = async (employeeId) => {
    setLoading(true);
    try {
      const response = await api.get(`/documents/${employeeId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/documents/${selectedEmployeeId}`, formData);
      setFormData({ doc_type: '', file_url: '', expiration_date: '' });
      setShowForm(false);
      fetchDocuments(selectedEmployeeId);
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert(error.response?.data?.error || 'Erro ao salvar documento');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await api.delete(`/documents/${id}`);
        fetchDocuments(selectedEmployeeId);
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentos</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={!selectedEmployeeId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Novo Documento
          </button>
        </div>

        {expiringDocs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-800 mb-1">
                {expiringDocs.length} documento(s) vencendo em breve
              </p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {expiringDocs.map((doc) => (
                  <li key={doc.id}>
                    {doc.employee_name} — {doc.doc_type} (vence em{' '}
                    {new Date(doc.expiration_date).toLocaleDateString('pt-BR')})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Colaborador
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg"
          >
            {employees.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Novo Documento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Tipo (ex: RG, CTPS, Contrato)"
                  value={formData.doc_type}
                  onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="URL do arquivo"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  placeholder="Data de vencimento"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Nenhum documento registrado para este colaborador</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Arquivo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Enviado em
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{doc.doc_type}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-xs">
                      <a href={doc.file_url} target="_blank" rel="noreferrer">
                        {doc.file_url}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.expiration_date
                        ? new Date(doc.expiration_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
