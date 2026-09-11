import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function Leave() {
  const { isAdmin } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    type: 'férias',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaveRes, empRes] = await Promise.all([
        api.get('/leave-requests'),
        api.get('/employees'),
      ]);
      setLeaveRequests(leaveRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave-requests', formData);
      setFormData({ employee_id: '', start_date: '', end_date: '', type: 'férias' });
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create leave request:', error);
      alert(error.response?.data?.error || 'Erro ao criar solicitação');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/leave-requests/${id}/approve`);
      fetchData();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/leave-requests/${id}/reject`);
      fetchData();
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejeitado':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-50 text-green-700';
      case 'rejeitado':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-yellow-50 text-yellow-700';
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Férias e Ausências</h1>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Nova Solicitação
            </button>
          )}
        </div>

        {showForm && isAdmin && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Nova Solicitação</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colaborador
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione um colaborador</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="férias">Férias</option>
                    <option value="falta">Falta</option>
                    <option value="abono">Abono</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Criar Solicitação
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
        ) : leaveRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Nenhuma solicitação de férias</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Data Início
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Data Fim
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{request.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{request.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(request.start_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(request.end_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && request.status === 'pendente' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
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
