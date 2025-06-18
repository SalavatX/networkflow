import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToUserStatus } from '../../services/onlineStatusService';
import { UserIcon, ChatBubbleOvalLeftEllipsisIcon, UsersIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { createGroupChat } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  online?: boolean;
  lastSeen?: any;
}

interface OnlineUsersListProps {
  maxUsers?: number;
}

const OnlineUsersList = ({ maxUsers = 10 }: OnlineUsersListProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroupChat, setShowCreateGroupChat] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('displayName'), limit(50));
        const snapshot = await getDocs(q);
        
        const usersData = snapshot.docs
          .map(doc => ({
            uid: doc.id,
            ...doc.data(),
            online: false
          }))
          .filter(user => user.uid !== currentUser?.uid) as User[];
        
        setUsers(usersData);
        
        const unsubscribers = usersData.map(user => 
          subscribeToUserStatus(user.uid, (status) => {
            setUsers(prevUsers => 
              prevUsers.map(u => 
                u.uid === user.uid 
                  ? { ...u, online: status.online, lastSeen: status.lastSeen }
                  : u
              )
            );
          })
        );
        
        setLoading(false);
        
        return () => {
          unsubscribers.forEach(unsubscribe => unsubscribe());
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const handleMessageUser = (user: User) => {
    navigate('/messages', { state: { selectedUser: user } });
  };
  
  const handleNavigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroupChat = async () => {
    if (!currentUser) return;
    if (!groupName.trim()) {
      setError('Введите название группы');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Выберите хотя бы одного участника');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      const participants = [...selectedUsers];
      if (!participants.includes(currentUser.uid)) {
        participants.push(currentUser.uid);
      }
      
      const chatId = await createGroupChat(
        currentUser.uid,
        groupName.trim(),
        participants
      );
      
      setGroupName('');
      setSelectedUsers([]);
      setShowCreateGroupChat(false);
      
      navigate(`/messages?chat=${chatId}`);
    } catch (error) {
      console.error('Error creating group chat:', error);
      setError('Не удалось создать групповой чат');
    } finally {
      setCreating(false);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  const displayedUsers = expanded 
    ? sortedUsers 
    : sortedUsers.slice(0, Math.min(5, maxUsers));

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
        <h2 className="font-semibold">
          Пользователи
        </h2>
        <div className="flex">
          <button 
            onClick={() => setShowCreateGroupChat(!showCreateGroupChat)}
            className="flex items-center text-white hover:text-indigo-200 transition-colors"
            title="Создать групповой чат"
          >
            <UsersIcon className="h-5 w-5 mr-1" />
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showCreateGroupChat && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-800 mb-2">Создать групповой чат</h3>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Название группы"
            className="w-full p-2 border border-gray-300 rounded-md mb-2"
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="flex justify-between mt-3">
            <button
              onClick={() => {
                setShowCreateGroupChat(false);
                setSelectedUsers([]);
                setGroupName('');
                setError('');
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateGroupChat}
              disabled={creating || !groupName.trim() || selectedUsers.length === 0}
              className={`px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
            >
              {creating ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Создание...
                </>
              ) : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : displayedUsers.length > 0 ? (
        <div>
          <ul className="divide-y divide-gray-200">
            {displayedUsers.map(user => (
              <li key={user.uid} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                  {showCreateGroupChat && (
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.uid)}
                      onChange={() => toggleUserSelection(user.uid)}
                      className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  )}
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => !showCreateGroupChat && handleNavigateToProfile(user.uid)}
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName || 'Пользователь'} 
                        className="h-8 w-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                    <span 
                      className={`absolute bottom-0 right-1 h-3 w-3 rounded-full border-2 border-white ${
                        user.online ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    ></span>
                  </div>
                  <div 
                    className="ml-1 cursor-pointer"
                    onClick={() => !showCreateGroupChat && handleNavigateToProfile(user.uid)}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors">
                      {user.displayName || 'Пользователь'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.online ? 'онлайн' : 'не в сети'}
                    </p>
                  </div>
                </div>
                
                {!showCreateGroupChat && (
                  <button 
                    onClick={() => handleMessageUser(user)}
                    className="text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Написать сообщение"
                  >
                    <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          
          {!expanded && sortedUsers.length > displayedUsers.length && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button 
                onClick={() => setExpanded(true)}
                className="w-full py-2 px-3 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium flex items-center justify-center hover:bg-indigo-100 transition-colors"
              >
                <span>Показать больше</span>
              </button>
            </div>
          )}
          
          <div className="p-3 border-t border-gray-200">
            <Link 
              to="/search/users" 
              className="flex items-center justify-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>Все пользователи</span>
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          Нет доступных пользователей
        </div>
      )}
    </div>
  );
};

export default OnlineUsersList; 