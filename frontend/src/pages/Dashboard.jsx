import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { Users, FileText, Calendar, AlertCircle, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">RH SaaS</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : summary ? (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Headcount */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Funcionários</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {summary.headcount}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Open Payrolls */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Folhas Abertas</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {summary.openPayrolls}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <FileText className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                {summary.openPayrolls > 0 && (
                  <button
                    onClick={() => navigate('/payroll')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver folhas →
                  </button>
                )}
              </div>

              {/* Pending Leave Requests */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Férias Pendentes</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {summary.pendingLeaves}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                {summary.pendingLeaves > 0 && (
                  <button
                    onClick={() => navigate('/leave')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Revisar solicitações →
                  </button>
                )}
              </div>

              {/* Expiring Documents */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Docs Vencendo</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {summary.expiringDocs}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                {summary.expiringDocs > 0 && (
                  <button
                    onClick={() => navigate('/employees')}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Verificar documentos →
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/employees')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Users className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="font-medium text-gray-900">Colaboradores</p>
                  <p className="text-sm text-gray-600">Gerenciar dados</p>
                </button>

                <button
                  onClick={() => navigate('/payroll')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <FileText className="w-5 h-5 text-yellow-600 mb-2" />
                  <p className="font-medium text-gray-900">Folha de Pagamento</p>
                  <p className="text-sm text-gray-600">Processar folhas</p>
                </button>

                <button
                  onClick={() => navigate('/leave')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <Calendar className="w-5 h-5 text-green-600 mb-2" />
                  <p className="font-medium text-gray-900">Férias e Ausências</p>
                  <p className="text-sm text-gray-600">Gerenciar solicitações</p>
                </button>

                <button
                  onClick={() => navigate('/employees')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
                  <p className="font-medium text-gray-900">Documentos</p>
                  <p className="text-sm text-gray-600">Verificar vencimentos</p>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Erro ao carregar dados</p>
          </div>
        )}
      </main>
    </div>
  );
}
