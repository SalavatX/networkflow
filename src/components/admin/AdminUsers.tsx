import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, toggleAdminRole, deleteUser } from '../../services/adminService';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { blockUser, unblockUser, getUserModerationHistory } from '../../services/moderationService';
import UserActionsMenu from './UserActionsMenu';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: string;
  approved: boolean;
  isAdmin: boolean;
  blocked?: boolean;
  blockedReason?: string;
  blockedUntil?: Date | null;
}

const AdminUsers = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [blockingIds, setBlockingIds] = useState<string[]>([]);
  const [unblockingIds, setUnblockingIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.displayName?.toLowerCase().includes(term) || 
        user.email?.toLowerCase().includes(term)
      );
    }
    
    if (filter === 'admin') {
      result = result.filter(user => user.isAdmin);
    } else if (filter === 'user') {
      result = result.filter(user => !user.isAdmin);
    } else if (filter === 'blocked') {
      result = result.filter(user => user.blocked);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers as User[]);
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      setErrorMessage('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === currentUser?.uid && isCurrentlyAdmin) {
      setErrorMessage('Вы не можете снять права администратора у самого себя');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    try {
      setProcessingIds(prev => [...prev, userId]);
      await toggleAdminRole(userId, !isCurrentlyAdmin);
      
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, isAdmin: !isCurrentlyAdmin } 
            : user
        )
      );
      
      setSuccessMessage(`Пользователь ${!isCurrentlyAdmin ? 'назначен администратором' : 'лишен прав администратора'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка при изменении роли пользователя:', error);
      setErrorMessage('Не удалось изменить роль пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.uid) {
      setErrorMessage('Вы не можете удалить свой собственный аккаунт');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    const isConfirmed = window.confirm(`Вы действительно хотите удалить пользователя ${userName || userId}? Это действие нельзя отменить. Все данные пользователя, включая посты, комментарии и сообщения, будут удалены.`);
    
    if (!isConfirmed) return;
    
    try {
      setDeletingIds(prev => [...prev, userId]);
      
      const result = await deleteUser(userId);
      
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      setSuccessMessage(result.message || 'Пользователь успешно удален');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Ошибка при удалении пользователя:', error);
      setErrorMessage(error.message || 'Не удалось удалить пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleShowBlockModal = (userId: string) => {
    setSelectedUserId(userId);
    setBlockReason('');
    setBlockDuration(0);
    setShowBlockModal(true);
  };

  const handleBlockUser = async () => {
    if (!selectedUserId || !blockReason) {
      setErrorMessage('Необходимо указать причину блокировки');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setBlockingIds(prev => [...prev, selectedUserId]);
      
      const user = users.find(u => u.id === selectedUserId);
      const userName = user?.displayName || selectedUserId;
      
      await blockUser(
        selectedUserId, 
        currentUser?.uid || '', 
        currentUser?.displayName || 'Администратор', 
        blockReason,
        blockDuration
      );
      
      setUsers(prev => 
        prev.map(user => 
          user.id === selectedUserId 
            ? { 
                ...user, 
                blocked: true, 
                blockedReason: blockReason,
                blockedUntil: blockDuration > 0 ? new Date(Date.now() + blockDuration * 24 * 60 * 60 * 1000) : null
              } 
            : user
        )
      );
      
      setSuccessMessage(`Пользователь ${userName} заблокирован`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowBlockModal(false);
    } catch (error: any) {
      console.error('Ошибка при блокировке пользователя:', error);
      setErrorMessage(error.message || 'Не удалось заблокировать пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setBlockingIds(prev => prev.filter(id => id !== selectedUserId));
    }
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    const isConfirmed = window.confirm(`Вы действительно хотите разблокировать пользователя ${userName || userId}?`);
    
    if (!isConfirmed) return;
    
    try {
      setUnblockingIds(prev => [...prev, userId]);
      
      await unblockUser(
        userId, 
        currentUser?.uid || '', 
        currentUser?.displayName || 'Администратор', 
        'Разблокировка администратором'
      );
      
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, blocked: false, blockedReason: undefined, blockedUntil: null } 
            : user
        )
      );
      
      setSuccessMessage(`Пользователь ${userName} разблокирован`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Ошибка при разблокировке пользователя:', error);
      setErrorMessage(error.message || 'Не удалось разблокировать пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setUnblockingIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleViewModerationHistory = async (userId: string) => {
    setSelectedUserId(userId);
    setLoading(true);
    
    try {
      const history = await getUserModerationHistory(userId);
      setModerationHistory(history);
      setShowModerationModal(true);
    } catch (error) {
      console.error('Ошибка при получении истории модерации:', error);
      setErrorMessage('Не удалось загрузить историю модерации');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold text-gray-900 bg-white px-3 py-1 rounded-md shadow-sm">Управление пользователями</h1>
            <p className="mt-2 text-gray-800 font-medium bg-white px-3 py-1 rounded-md shadow-sm">
              Просмотр и управление всеми пользователями платформы
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

        <div className="admin-card bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Поиск пользователей
              </label>
              <input
                type="text"
                id="search"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Имя или email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Фильтр по роли
              </label>
              <select
                id="role-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Все пользователи</option>
                <option value="admin">Только администраторы</option>
                <option value="user">Только пользователи</option>
                <option value="blocked">Заблокированные</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchUsers}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Обновить список
              </button>
            </div>
          </div>
        </div>

        <div className="admin-card bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
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
                      Статус
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
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${user.id === currentUser?.uid ? 'bg-indigo-50' : ''}`}>
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
                              <div className={`h-10 w-10 rounded-full ${user.isAdmin ? 'bg-purple-100' : 'bg-indigo-100'} flex items-center justify-center`}>
                                <span className={`${user.isAdmin ? 'text-purple-800' : 'text-indigo-800'} font-medium text-sm`}>
                                  {user.displayName?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {user.displayName}
                              {user.id === currentUser?.uid && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Вы
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.isAdmin ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              Администратор
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Пользователь
                            </span>
                          )}
                          
                          {!user.approved && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Не подтвержден
                            </span>
                          )}

                          {user.blocked && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Заблокирован
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <UserActionsMenu
                            userId={user.id}
                            userName={user.displayName}
                            isAdmin={user.isAdmin}
                            isBlocked={!!user.blocked}
                            onMakeAdmin={() => handleToggleAdminRole(user.id, false)}
                            onRemoveAdmin={() => handleToggleAdminRole(user.id, true)}
                            onBlock={() => handleShowBlockModal(user.id)}
                            onUnblock={() => handleUnblockUser(user.id, user.displayName)}
                            onDelete={() => handleDeleteUser(user.id, user.displayName)}
                            onHistory={() => handleViewModerationHistory(user.id)}
                            isProcessing={
                              processingIds.includes(user.id) || 
                              blockingIds.includes(user.id) || 
                              unblockingIds.includes(user.id) || 
                              deletingIds.includes(user.id)
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Пользователи не найдены</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchTerm || filter !== 'all' 
                  ? 'Попробуйте изменить параметры поиска или фильтрации.' 
                  : 'В системе пока нет зарегистрированных пользователей.'}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                  fetchUsers();
                }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {showBlockModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Блокировка пользователя
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="block-reason" className="block text-sm font-medium text-gray-700">
                            Причина блокировки*
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="block-reason"
                              name="block-reason"
                              rows={3}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Укажите причину блокировки"
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="block-duration" className="block text-sm font-medium text-gray-700">
                            Продолжительность блокировки (дней)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              id="block-duration"
                              name="block-duration"
                              min="0"
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="0 для постоянной блокировки"
                              value={blockDuration}
                              onChange={(e) => setBlockDuration(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Введите 0 для постоянной блокировки
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleBlockUser}
                  >
                    Заблокировать
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowBlockModal(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно истории модерации */}
        {showModerationModal && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        История модерации
                      </h3>
                      <div className="mt-4">
                        {moderationHistory.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Тип
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Администратор
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Причина
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Дата
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {moderationHistory.map((action) => (
                                  <tr key={action.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                      {action.type === 'warning' && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                          Предупреждение
                                        </span>
                                      )}
                                      {action.type === 'block' && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                          Блокировка
                                        </span>
                                      )}
                                      {action.type === 'unblock' && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          Разблокировка
                                        </span>
                                      )}
                                      {action.type === 'post_deletion' && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                          Удаление поста
                                        </span>
                                      )}
                                      {action.type === 'comment_deletion' && (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                          Удаление комментария
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {action.adminName}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-500">
                                      {action.reason}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {action.createdAt && formatDate(action.createdAt.toDate().toString())}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500">История модерации отсутствует</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowModerationModal(false)}
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers; 