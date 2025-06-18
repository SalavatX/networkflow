import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { ChatType } from '../../services/chatService';

interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  name?: string;
  photoURL?: string | null;
  admins?: string[];
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
}

const Messages = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChatList, setShowChatList] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Обработка параметра chat из URL
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId) {
      setSelectedChat(chatId);
      if (isMobile) {
        setShowChatList(false);
      }
    }
  }, [searchParams, isMobile]);

  useEffect(() => {
    if (location.state && location.state.selectedUser) {
      setSelectedUser(location.state.selectedUser);
      if (isMobile) {
        setShowChatList(false);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname, isMobile]);

  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      
      setChats(chatsData);
      
      // Проверяем, если у нас есть выбранный чат, обновляем информацию о пользователе
      if (selectedChat) {
        const chat = chatsData.find(c => c.id === selectedChat);
        if (chat && chat.type === ChatType.PRIVATE) {
          const otherUserId = chat.participants.find(id => id !== currentUser.uid);
          if (otherUserId) {
            // Загрузим информацию о пользователе позже, когда получим всех пользователей
          }
        }
      }
      
      const userIds = new Set<string>();
      
      // Собираем уникальные ID всех пользователей из всех чатов
      chatsData.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId !== currentUser.uid) {
            userIds.add(participantId);
          }
        });
        
        // Для групповых чатов, нам также нужно знать информацию о всех участниках
        // для отображения имени отправителя сообщения
        if (chat.lastMessage && chat.lastMessage.senderId !== currentUser.uid && 
            chat.lastMessage.senderId !== 'system') {
          userIds.add(chat.lastMessage.senderId);
        }
      });
      
      if (userIds.size > 0) {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs
          .filter(doc => userIds.has(doc.id))
          .map(doc => ({
            uid: doc.id,
            ...doc.data()
          })) as User[];
        
        setUsers(usersData);
        
        // Теперь, когда у нас есть пользователи, обновляем selectedUser если нужно
        if (selectedChat) {
          const chat = chatsData.find(c => c.id === selectedChat);
          if (chat && chat.type === ChatType.PRIVATE) {
            const otherUserId = chat.participants.find(id => id !== currentUser.uid);
            if (otherUserId) {
              const user = usersData.find(u => u.uid === otherUserId);
              if (user) {
                setSelectedUser(user);
              }
            }
          }
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedChat]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId);
    
    // Обновляем URL с параметром chat
    navigate(`/messages?chat=${chatId}`, { replace: true });
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      // Проверяем тип чата, для старых чатов без поля type считаем их приватными
      const chatType = chat.type || ChatType.PRIVATE;
      
      // Для приватных чатов устанавливаем selectedUser
      if (chatType === ChatType.PRIVATE) {
        const otherUserId = chat.participants.find(id => id !== currentUser?.uid);
        if (otherUserId) {
          const user = users.find(u => u.uid === otherUserId);
          if (user) {
            setSelectedUser(user);
          }
        }
      } else {
        // Для групповых чатов сбрасываем selectedUser
        setSelectedUser(null);
      }
    }
    
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleStartNewChat = (user: User) => {
    // Проверяем, существует ли уже приватный чат с этим пользователем
    const existingChat = chats.find(chat => {
      // Проверяем тип чата, для старых чатов без поля type считаем их приватными
      const chatType = chat.type || ChatType.PRIVATE;
      
      return chatType === ChatType.PRIVATE &&
        chat.participants.length === 2 && 
        chat.participants.includes(user.uid) && 
        chat.participants.includes(currentUser?.uid || '');
    });
    
    if (existingChat) {
      handleSelectChat(existingChat.id);
    } else {
      setSelectedUser(user);
      setSelectedChat(null); 
      
      // Очищаем параметр chat из URL
      navigate('/messages', { replace: true });
      
      if (isMobile) {
        setShowChatList(false);
      }
    }
  };

  const handleCreateGroupChat = () => {
    // Эта функция будет вызываться при создании группового чата
    // Сама логика создания находится в ChatList компоненте
  };

  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };

  const handleBackToList = () => {
    setShowChatList(true);
    // При возврате к списку чатов очищаем параметр chat из URL
    navigate('/messages', { replace: true });
  };

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Доступ запрещен</h2>
          <p className="mt-2 text-gray-600">Вы должны войти в систему, чтобы просматривать сообщения.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Сообщения</h1>
        
        {isMobile && (
          <button 
            onClick={toggleChatList}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {showChatList ? 'Показать чат' : 'Показать список'}
          </button>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex h-[calc(100vh-200px)] max-w-full overflow-hidden">
          {(!isMobile || showChatList) && (
            <div className={`${isMobile ? 'w-full' : 'w-1/3'} border-r border-gray-200 overflow-hidden`}>
              <ChatList 
                chats={chats} 
                users={users} 
                currentUserId={currentUser.uid} 
                selectedChatId={selectedChat}
                onSelectChat={handleSelectChat}
                onStartNewChat={handleStartNewChat}
                onCreateGroupChat={handleCreateGroupChat}
              />
            </div>
          )}
          
          {(!isMobile || !showChatList) && (
            <div className={`${isMobile ? 'w-full' : 'w-2/3'} overflow-hidden`}>
              {selectedChat || selectedUser ? (
                <ChatWindow 
                  chatId={selectedChat} 
                  currentUser={currentUser} 
                  otherUser={selectedUser}
                  onBackToList={isMobile ? handleBackToList : undefined}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Выберите чат или начните новую беседу</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages; 