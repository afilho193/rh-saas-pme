import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { Plus, ShieldCheck, Eye } from 'lucide-react';

export default function Team() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'member' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', formData);
      setFormData({ email: '', password: '', role: 'member' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao convidar usuário');
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Equipe</h1>
            <p className="text-gray-600 text-sm mt-1">
              Administradores podem gerenciar tudo. Membros só podem visualizar.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Convidar Usuário
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-8 text-sm">
            Você está como <strong>membro</strong>: pode visualizar todos os dados, mas
            criar, editar, excluir e aprovar é restrito a administradores.
          </div>
        )}

        {showForm && isAdmin && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Convidar Usuário</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Senha provisória"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="member">Membro (somente leitura)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Convidar
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
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Papel</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Desde</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {u.role === 'admin' ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        {u.role === 'admin' ? 'Administrador' : 'Membro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
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
