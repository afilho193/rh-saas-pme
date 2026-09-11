import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';

export default function Employees() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cargo: '',
    salary: '',
    hire_date: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, formData);
      } else {
        await api.post('/employees', formData);
      }
      setFormData({ name: '', cpf: '', cargo: '', salary: '', hire_date: '' });
      setShowForm(false);
      setEditingId(null);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert(error.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleEdit = (employee) => {
    setFormData(employee);
    setEditingId(employee.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja inativar este colaborador?')) {
      try {
        await api.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (error) {
        console.error('Failed to delete employee:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Colaboradores</h1>
          {isAdmin && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({ name: '', cpf: '', cargo: '', salary: '', hire_date: '' });
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Novo Colaborador
            </button>
          )}
        </div>

        {showForm && isAdmin && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="CPF"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Salário"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                  step="0.01"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {editingId ? 'Atualizar' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
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
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Nenhum colaborador registrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    CPF
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Salário
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Data Admissão
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{employee.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{employee.cpf}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{employee.cargo}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      R$ {parseFloat(employee.salary).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(employee.hire_date).toLocaleDateString('pt-BR')}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
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
