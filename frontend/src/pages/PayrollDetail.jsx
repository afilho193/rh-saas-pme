import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Plus, Edit2, CheckCircle, Clock } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const EMPTY_ITEM_FORM = { employee_id: '', base_salary: '', deductions: '', additions: '' };

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [payroll, setPayroll] = useState(null);
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_ITEM_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [payrollListRes, detailsRes, employeesRes] = await Promise.all([
        api.get('/payroll'),
        api.get(`/payroll/${id}/details`),
        api.get('/employees'),
      ]);
      const found = payrollListRes.data.find((p) => String(p.id) === String(id));
      if (!found) {
        setNotFound(true);
      } else {
        setPayroll(found);
        setItems(detailsRes.data);
        setEmployees(employeesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch payroll details:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        base_salary: parseFloat(formData.base_salary),
        deductions: formData.deductions ? parseFloat(formData.deductions) : 0,
        additions: formData.additions ? parseFloat(formData.additions) : 0,
      };
      if (editingItemId) {
        await api.put(`/payroll/${id}/items/${editingItemId}`, payload);
      } else {
        await api.post(`/payroll/${id}/items`, { ...payload, employee_id: formData.employee_id });
      }
      setFormData(EMPTY_ITEM_FORM);
      setShowForm(false);
      setEditingItemId(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar lançamento');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      employee_id: item.employee_id,
      base_salary: item.base_salary,
      deductions: item.deductions,
      additions: item.additions,
    });
    setEditingItemId(item.id);
    setShowForm(true);
  };

  const handleApprove = async () => {
    if (!confirm('Aprovar esta folha? Não será possível editar lançamentos depois.')) return;
    try {
      await api.post(`/payroll/${id}/approve`);
      fetchAll();
    } catch (err) {
      console.error('Failed to approve payroll:', err);
    }
  };

  const employeesNotYetAdded = employees.filter(
    (emp) => !items.some((item) => item.employee_id === emp.id) || editingItemId
  );

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-600">Carregando...</div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="p-8">
          <Link to="/payroll" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-6">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
            Folha não encontrada.
          </div>
        </div>
      </Layout>
    );
  }

  const totalNet = items.reduce((sum, item) => sum + parseFloat(item.net_salary), 0);
  const isDraft = payroll.status !== 'approved';

  return (
    <Layout>
      <div className="p-8">
        <button
          onClick={() => navigate('/payroll')}
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Folhas
        </button>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {MONTH_NAMES[payroll.month - 1]} {payroll.year}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              {payroll.status === 'approved' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Aprovada</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-yellow-600 font-medium">Rascunho</span>
                </>
              )}
            </div>
          </div>
          {isAdmin && isDraft && items.length > 0 && (
            <button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Aprovar Folha
            </button>
          )}
        </div>

        {isAdmin && isDraft && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingItemId(null);
                setFormData(EMPTY_ITEM_FORM);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </button>
          </div>
        )}

        {showForm && isAdmin && isDraft && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingItemId ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  disabled={!!editingItemId}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                >
                  <option value="">Colaborador</option>
                  {employeesNotYetAdded.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Salário base"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Descontos"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Adicionais"
                  value={formData.additions}
                  onChange={(e) => setFormData({ ...formData, additions: e.target.value })}
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
                  onClick={() => {
                    setShowForm(false);
                    setEditingItemId(null);
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
            Nenhum lançamento nesta folha ainda.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Colaborador</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cargo</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Salário Base</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Descontos</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Adicionais</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Líquido</th>
                  {isAdmin && isDraft && (
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.cargo}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      R$ {parseFloat(item.base_salary).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 text-right">
                      - R$ {parseFloat(item.deductions).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right">
                      + R$ {parseFloat(item.additions).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      R$ {parseFloat(item.net_salary).toFixed(2)}
                    </td>
                    {isAdmin && isDraft && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td colSpan={5} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    Total líquido
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    R$ {totalNet.toFixed(2)}
                  </td>
                  {isAdmin && isDraft && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
