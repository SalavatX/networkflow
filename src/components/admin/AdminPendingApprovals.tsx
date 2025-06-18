import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPendingUsers, approveUser, rejectUser } from '../../services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: string;
}

const AdminPendingApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const users = await getPendingUsers();
      setPendingUsers(users as User[]);
    } catch (error) {
      console.error('Ошибка при получении ожидающих пользователей:', error);
      setErrorMessage('Не удалось загрузить список ожидающих подтверждения пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      setProcessingIds(prev => [...prev, userId]);
      await approveUser(userId);
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      setSuccessMessage('Пользователь успешно подтвержден');
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка при подтверждении пользователя:', error);
      setErrorMessage('Не удалось подтвердить пользователя');
      
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (window.confirm('Вы действительно хотите отклонить заявку на регистрацию? Пользователь будет удален из системы.')) {
      try {
        setProcessingIds(prev => [...prev, userId]);
        await rejectUser(userId);
        setPendingUsers(prev => prev.filter(user => user.id !== userId));
        setSuccessMessage('Заявка на регистрацию отклонена');
        
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Ошибка при отклонении пользователя:', error);
        setErrorMessage('Не удалось отклонить заявку на регистрацию');
        
        setTimeout(() => setErrorMessage(''), 3000);
      } finally {
        setProcessingIds(prev => prev.filter(id => id !== userId));
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch (error) {
      return 'Недавно';
    }
  };

  return (
    <div className="relative">
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 z-0">
        <div className="absolute inset-0 bg-grid-indigo-100 opacity-30"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-white px-3 py-1 rounded-md shadow-sm">Заявки на регистрацию</h1>
            <p className="mt-2 text-gray-800 font-medium bg-white px-3 py-1 rounded-md shadow-sm">
              Подтвердите или отклоните заявки новых пользователей
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

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-800">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : pendingUsers.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.photoURL ? (
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={user.photoURL} 
                              alt={user.displayName} 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-800 font-medium text-sm">
                                {user.displayName?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          disabled={processingIds.includes(user.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingIds.includes(user.id) ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Подтвердить
                        </button>
                        
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          disabled={processingIds.includes(user.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingIds.includes(user.id) ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="-ml-0.5 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет ожидающих заявок</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                В настоящее время нет пользователей, ожидающих подтверждения регистрации.
              </p>
              <button
                onClick={fetchPendingUsers}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить список
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPendingApprovals; 