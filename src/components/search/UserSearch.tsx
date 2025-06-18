import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchUsers } from '../../services/userService';
import { User } from '../../services/userService';

const UserSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      
      try {
        const searchResults = await searchUsers(query);
        setUsers(searchResults);
      } catch (error) {
        console.error('Ошибка при поиске пользователей:', error);
        setError('Не удалось выполнить поиск. Пожалуйста, попробуйте еще раз.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [query, navigate]);

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg shadow-sm pt-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Результаты поиска: {query}
        </h1>
        <p className="text-gray-600 ml-11">Найдено {users.length} пользователей</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm">
          <p className="text-red-700">{error}</p>
        </div>
      ) : users.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {users.map(user => (
              <li 
                key={user.uid} 
                className="px-6 py-4 hover:bg-indigo-50 cursor-pointer transition-colors"
                onClick={() => handleUserClick(user.uid)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-14 w-14">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName} 
                        className="h-14 w-14 rounded-full object-cover border-2 border-indigo-100"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-300 to-purple-300 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-medium text-gray-900">
                          {user.displayName}
                          {user.isAdmin && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Администратор
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                      <button className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md text-sm transition-colors">
                        Профиль
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-white shadow-md rounded-lg border border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Пользователи не найдены</h2>
          <p className="text-gray-600 mb-6">
            По запросу <span className="font-medium">"{query}"</span> не найдено ни одного пользователя.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Вернуться на главную
          </button>
        </div>
      )}
    </div>
  );
};

export default UserSearch; 