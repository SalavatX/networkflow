import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserIcon, MagnifyingGlassIcon, UsersIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { subscribeToUserStatus } from '../../services/onlineStatusService';
import { ChatType } from '../../services/chatService';
import CreateGroupChat from '../chat/CreateGroupChat';

interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  name?: string;
  photoURL?: string | null;
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: { toDate: () => Date };
  };
  unreadCount: number;
}

interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email?: string | null;
}

interface UserStatus {
  [userId: string]: {
    online: boolean;
    lastSeen: any;
  };
}

interface ChatListProps {
  chats: Chat[];
  users: User[];
  currentUserId: string;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onStartNewChat: (user: User) => void;
  onCreateGroupChat?: () => void;
}

const ChatList = ({ 
  chats, 
  users, 
  currentUserId, 
  selectedChatId, 
  onSelectChat, 
  onStartNewChat,
  onCreateGroupChat
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>({});
  const [showCreateGroupChat, setShowCreateGroupChat] = useState(false);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    const chatParticipants = chats
      .flatMap(chat => chat.participants)
      .filter(id => id !== currentUserId);
    
    const uniqueParticipants = [...new Set(chatParticipants)];
    
    uniqueParticipants.forEach(userId => {
      const unsubscribe = subscribeToUserStatus(userId, (status) => {
        setUserStatus(prev => ({
          ...prev,
          [userId]: status
        }));
      });
      
      unsubscribes.push(unsubscribe);
    });
    
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [chats, currentUserId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const results = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as User))
        .filter(user => 
          user.uid !== currentUserId && 
          (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      
      setSearchResults(results);
      
      results.forEach(user => {
        if (!userStatus[user.uid]) {
                subscribeToUserStatus(user.uid, (status) => {
        setUserStatus(prev => ({
          ...prev,
          [user.uid]: status
        }));
      });
        }
      });
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'не в сети';
    
    try {
      const lastSeenDate = lastSeen.toDate();
      return `был(а) в сети ${formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: ru })}`;
    } catch (error) {
      console.error('Ошибка при форматировании времени последней активности:', error);
      return 'не в сети';
    }
  };

  const getChatName = (chat: Chat) => {
    const chatType = chat.type || ChatType.PRIVATE;
    
    if (chatType === ChatType.GROUP) {
      return chat.name || 'Групповой чат';
    }
    
    const otherParticipantId = chat.participants.find(id => id !== currentUserId);
    if (!otherParticipantId) return 'Чат';
    
    const otherUser = users.find(user => user.uid === otherParticipantId);
    return otherUser?.displayName || 'Пользователь';
  };

  const getChatAvatar = (chat: Chat) => {
    const chatType = chat.type || ChatType.PRIVATE;
    
    if (chatType === ChatType.GROUP) {
      return chat.photoURL;
    }
    
    const otherParticipantId = chat.participants.find(id => id !== currentUserId);
    if (!otherParticipantId) return null;
    
    const otherUser = users.find(user => user.uid === otherParticipantId);
    return otherUser?.photoURL;
  };

  const getChatParticipantId = (chat: Chat) => {
    const chatType = chat.type || ChatType.PRIVATE;
    
    if (chatType === ChatType.GROUP) return '';
    
    return chat.participants.find(id => id !== currentUserId) || '';
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) return 'Нет сообщений';
    
    if (chat.lastMessage.senderId === 'system') {
      return chat.lastMessage.text;
    }
    
    const isOwnMessage = chat.lastMessage.senderId === currentUserId;
    
    const chatType = chat.type || ChatType.PRIVATE;
    
    if (chatType === ChatType.GROUP && !isOwnMessage) {
      const sender = users.find(user => user.uid === chat.lastMessage.senderId);
      const senderName = sender?.displayName || 'Пользователь';
      return `${senderName}: ${chat.lastMessage.text}`;
    }
    
    const prefix = isOwnMessage ? 'Вы: ' : '';
    return `${prefix}${chat.lastMessage.text}`;
  };

  const handleOpenCreateGroupChat = () => {
    setShowCreateGroupChat(true);
    if (onCreateGroupChat) {
      onCreateGroupChat();
    }
  };

  const handleCloseCreateGroupChat = () => {
    setShowCreateGroupChat(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск пользователей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleSearch}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSearching ? 'Поиск...' : 'Найти'}
          </button>
          <button
            onClick={handleOpenCreateGroupChat}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            title="Создать групповой чат"
          >
            <UsersIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Результаты поиска</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map(user => (
              <div 
                key={user.uid}
                onClick={() => onStartNewChat(user)}
                className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
              >
                <div className="relative">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Пользователь'} 
                      className="h-10 w-10 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-500 font-bold">
                        {user.displayName?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  
                  <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    userStatus[user.uid]?.online ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'Пользователь'}</p>
                  <p className="text-xs truncate">
                    {userStatus[user.uid]?.online ? (
                      <span className="text-green-500">онлайн</span>
                    ) : (
                      <span className="text-gray-500">
                        {userStatus[user.uid]?.lastSeen ? 
                          formatLastSeen(userStatus[user.uid].lastSeen) : 'не в сети'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {chats.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {chats.map(chat => {
              const participantId = getChatParticipantId(chat);
              const chatType = chat.type || ChatType.PRIVATE;
              const isGroupChat = chatType === ChatType.GROUP;
              
              return (
                <div 
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedChatId === chat.id ? 'bg-indigo-50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {getChatAvatar(chat) ? (
                        <img 
                          src={getChatAvatar(chat) || ''} 
                          alt={getChatName(chat)} 
                          className="h-12 w-12 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {isGroupChat ? (
                            <UsersIcon className="h-6 w-6 text-gray-500" />
                          ) : (
                            <UserIcon className="h-6 w-6 text-gray-500" />
                          )}
                        </div>
                      )}
                      
                      {!isGroupChat && (
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                          userStatus[participantId]?.online ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      )}
                      
                      {isGroupChat && (
                        <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                          <UsersIcon className="h-3 w-3 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {getChatName(chat)}
                          </h3>
                          {!isGroupChat && userStatus[participantId]?.online && (
                            <span className="ml-2 text-xs text-green-500">онлайн</span>
                          )}
                          {isGroupChat && (
                            <span className="ml-2 text-xs text-indigo-500">{chat.participants.length} участников</span>
                          )}
                        </div>
                        {chat.lastMessage && chat.lastMessage.timestamp && (
                          <p className="text-xs text-gray-500 flex-shrink-0">
                            {formatDate(chat.lastMessage.timestamp.toDate())}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {getLastMessagePreview(chat)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p>У вас пока нет чатов.</p>
            <p className="mt-1 text-sm">Используйте поиск, чтобы найти пользователей и начать общение.</p>
          </div>
        )}
      </div>
      
      {showCreateGroupChat && (
        <CreateGroupChat onClose={handleCloseCreateGroupChat} />
      )}
    </div>
  );
};

export default ChatList; 