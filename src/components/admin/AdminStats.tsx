import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformStats } from '../../services/adminService';

interface PlatformStats {
  totalUsers: number;
  pendingUsers: number;
  totalAdmins: number;
  totalPosts: number;
  totalMessages: number;
}

const AdminStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const platformStats = await getPlatformStats();
      setStats(platformStats);
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      setError('Не удалось загрузить статистику платформы');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 z-0">
        <div className="absolute inset-0 bg-grid-indigo-100 opacity-30"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-white px-3 py-1 rounded-md shadow-sm">Статистика платформы</h1>
            <p className="mt-2 text-gray-800 font-medium bg-white px-3 py-1 rounded-md shadow-sm">
              Детальный обзор активности и использования корпоративной сети
            </p>
          </div>
          <Link 
            to="/admin" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Назад к панели
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
            {error}
          </div>
        )}

        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-5 bg-indigo-500 text-white">
              <h3 className="text-lg font-medium">Пользователи</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Всего</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Администраторы</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalAdmins || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Ожидают подтверждения</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.pendingUsers || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Подтверждены</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats ? stats.totalUsers - stats.pendingUsers : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-5 bg-green-500 text-white">
              <h3 className="text-lg font-medium">Контент</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Всего постов</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalPosts || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Всего сообщений</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Постов на пользователя</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats && stats.totalUsers > 0 
                      ? (stats.totalPosts / stats.totalUsers).toFixed(1) 
                      : 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Сообщений на пользователя</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats && stats.totalUsers > 0 
                      ? (stats.totalMessages / stats.totalUsers).toFixed(1) 
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden lg:col-span-1 md:col-span-2">
            <div className="px-6 py-5 bg-purple-500 text-white">
              <h3 className="text-lg font-medium">Активность</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Соотношение постов к сообщениям</p>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 bg-indigo-500 rounded-full" style={{ 
                      width: `${stats && (stats.totalPosts + stats.totalMessages) > 0 
                        ? (stats.totalPosts / (stats.totalPosts + stats.totalMessages) * 100) 
                        : 50}%` 
                    }}></div>
                    <div className="h-4 bg-green-500 rounded-full" style={{ 
                      width: `${stats && (stats.totalPosts + stats.totalMessages) > 0 
                        ? (stats.totalMessages / (stats.totalPosts + stats.totalMessages) * 100) 
                        : 50}%` 
                    }}></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Посты: {stats?.totalPosts || 0}</span>
                    <span>Сообщения: {stats?.totalMessages || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Общая статистика платформы</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Метрика
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Значение
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Всего пользователей
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats?.totalUsers || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Общее количество зарегистрированных пользователей в системе
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Ожидают подтверждения
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats?.pendingUsers || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Количество пользователей, ожидающих подтверждения администратором
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Администраторы
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats?.totalAdmins || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Количество пользователей с правами администратора
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Всего постов
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats?.totalPosts || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Общее количество созданных постов
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Всего сообщений
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats?.totalMessages || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Общее количество отправленных личных сообщений
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Среднее количество постов на пользователя
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats && stats.totalUsers > 0 
                      ? (stats.totalPosts / stats.totalUsers).toFixed(2) 
                      : 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Среднее количество постов, созданных одним пользователем
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Среднее количество сообщений на пользователя
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats && stats.totalUsers > 0 
                      ? (stats.totalMessages / stats.totalUsers).toFixed(2) 
                      : 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Среднее количество сообщений, отправленных одним пользователем
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={fetchStats}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить статистику
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats; 