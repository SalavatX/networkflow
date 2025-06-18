import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../../services/userService';
import { User } from '../../services/userService';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        try {
          const users = await searchUsers(searchTerm);
          setUserResults(users);
          setShowResults(true);
        } catch (error) {
          console.error('Ошибка при поиске:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setUserResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search/users?q=${encodeURIComponent(searchTerm)}`);
      setShowResults(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-lg" ref={searchRef}>
      <form onSubmit={handleSearch} className="mb-2">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Поиск пользователей..."
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          />
        </div>
      </form>

      {showResults && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-xl max-h-96 overflow-y-auto border border-gray-100">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-700 flex justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            userResults.length > 0 ? (
              <div>
                <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  Пользователи
                </h3>
                <ul className="divide-y divide-gray-100">
                  {userResults.map((user) => (
                    <li
                      key={user.uid}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(user.uid)}
                    >
                      <div className="flex items-center">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="h-10 w-10 rounded-full mr-3 object-cover border-2 border-indigo-50"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                            <span className="text-indigo-800 font-medium text-sm">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              searchTerm.length >= 2 && (
                <div className="px-4 py-3 text-sm text-gray-700">
                  Пользователи не найдены
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 