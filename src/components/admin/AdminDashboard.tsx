import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformStats } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

interface PlatformStats {
  totalUsers: number;
  pendingUsers: number;
  totalAdmins: number;
  totalPosts: number;
  totalMessages: number;
}

const AdminDashboard = () => {
  const { userData } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const platformStats = await getPlatformStats();
        setStats(platformStats);
      } catch (error) {
        console.error('Ошибка при получении статистики:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 bg-white px-3 py-1 rounded-md shadow-sm inline-block">Панель администратора</h1>
          <p className="mt-2 text-gray-800 font-medium bg-white px-3 py-1 rounded-md shadow-sm">
            Добро пожаловать, {userData?.displayName}! Здесь вы можете управлять пользователями и видеть статистику платформы.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link 
            to="/admin/users" 
            className="admin-card bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Управление пользователями</h2>
            <p className="text-gray-600">Просмотр и управление всеми пользователями платформы</p>
          </Link>
          
          <Link 
            to="/admin/pending" 
            className="admin-card bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col items-center text-center relative"
          >
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Заявки на регистрацию</h2>
            <p className="text-gray-600">Подтверждение или отклонение новых пользователей</p>
            
            {stats && stats.pendingUsers > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                {stats.pendingUsers}
              </div>
            )}
          </Link>
          
          <Link 
            to="/admin/stats" 
            className="admin-card bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Статистика платформы</h2>
            <p className="text-gray-600">Детальный обзор активности и использования платформы</p>
          </Link>
        </div>
        
        <div className="admin-card bg-white shadow-md rounded-lg p-5 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Краткая статистика платформы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего пользователей</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ожидают подтверждения</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingUsers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего постов</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalPosts || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего сообщений</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="admin-card bg-white shadow-md rounded-lg p-5">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Быстрые действия</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/admin/pending" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Подтвердить регистрации ({stats?.pendingUsers || 0})
            </Link>
            
            <Link 
              to="/admin/users" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Назначить администратора
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 