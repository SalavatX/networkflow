import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  PaperAirplaneIcon, 
  TrashIcon, 
  UserIcon, 
  ArrowLeftIcon,
  PaperClipIcon,
  DocumentIcon,
  VideoCameraIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  CheckIcon,
  Cog6ToothIcon,
  UsersIcon,
  PhoneIcon
} from '@heroicons/react/24/solid';
import { createMessageNotification } from '../../services/notificationService';
import { uploadFile, isImage, isVideo, isSupportedFileType, MAX_FILE_SIZE } from '../../services/fileService';
import { subscribeToUserStatus } from '../../services/onlineStatusService';
import { ChatType } from '../../services/chatService';
import GroupChatSettings from '../chat/GroupChatSettings';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: { toDate: () => Date };
  read: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  edited?: boolean;
  isSystemMessage?: boolean;
}

interface ChatUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

interface GroupChatData {
  id: string;
  type: ChatType;
  name: string;
  photoURL: string | null;
  participants: string[];
  admins: string[];
  createdBy: string;
}

interface ChatWindowProps {
  chatId: string | null;
  currentUser: User;
  otherUser: ChatUser | null;
  onBackToList?: () => void;
}

const ChatWindow = ({ chatId, currentUser, otherUser, onBackToList }: ChatWindowProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [otherUserOnlineStatus, setOtherUserOnlineStatus] = useState<{ online: boolean, lastSeen: any } | null>(null);
  
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupData, setGroupData] = useState<GroupChatData | null>(null);
  const [groupParticipants, setGroupParticipants] = useState<Map<string, ChatUser>>(new Map());
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);

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

  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        console.log('Таймаут загрузки чата, принудительно выходим из состояния загрузки');
        setLoading(false);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading]);

  useEffect(() => {
    let unsubscribe = () => {};
    
    if (!isGroupChat && otherUser && otherUser.uid) {
      unsubscribe = subscribeToUserStatus(otherUser.uid, (status) => {
        setOtherUserOnlineStatus(status);
      });
    }
    
    return () => unsubscribe();
  }, [otherUser, isGroupChat]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      if (!chatId) {
        setIsGroupChat(false);
        return;
      }
      
      if (!currentUser) return;
      
      setLoading(true);
      
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          
          const chatType = chatData.type || ChatType.PRIVATE;
          
          if (chatType === ChatType.GROUP) {
            setIsGroupChat(true);
            
            const groupChatData: GroupChatData = {
              id: chatDoc.id,
              type: chatType,
              name: chatData.name || 'Групповой чат',
              photoURL: chatData.photoURL,
              participants: chatData.participants || [],
              admins: chatData.admins || [],
              createdBy: chatData.createdBy || ''
            };
            
            setGroupData(groupChatData);
            setIsGroupAdmin(groupChatData.admins.includes(currentUser.uid));
            
            await fetchGroupParticipants(groupChatData.participants);
          } else {
            setIsGroupChat(false);
            
            if (!chatData.type) {
              try {
                await updateDoc(doc(db, 'chats', chatId), {
                  type: ChatType.PRIVATE
                });
                console.log('Обновлен старый чат, добавлен тип PRIVATE');
              } catch (updateError) {
                console.error('Ошибка при обновлении старого чата:', updateError);
              }
            }
          }
        } else {
          setIsGroupChat(false);
        }
      } catch (error) {
        console.error('Ошибка при получении информации о чате:', error);
        setIsGroupChat(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatInfo();
  }, [chatId, currentUser]);

  const fetchGroupParticipants = async (participantIds: string[]) => {
    if (!participantIds.length) return;
    
    try {
      const participants = new Map<string, ChatUser>();
      
      for (const userId of participantIds) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          participants.set(userId, {
            uid: userId,
            displayName: userData.displayName || 'Пользователь',
            photoURL: userData.photoURL
          });
        }
      }
      
      setGroupParticipants(participants);
    } catch (error) {
      console.error('Ошибка при загрузке информации об участниках группы:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMessageMenu && !(event.target as Element).closest('.message-menu-container')) {
        setActiveMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMessageMenu]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      const length = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(length, length);
    }
  }, [editingMessageId]);

  useEffect(() => {
    if (!currentUser) return;
    
    if (!chatId) {
      return;
    }
    
    setLoading(true);
    
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        
        setMessages(messagesData);
        setLoading(false);
        
        messagesData.forEach(async (message) => {
          if (message.senderId !== currentUser.uid && !message.read) {
            await updateDoc(doc(db, 'messages', message.id), {
              read: true
            });
          }
        });
      },
      (error) => {
        console.error('Ошибка при получении сообщений:', error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [chatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
        return;
      }
      
      if (!isSupportedFileType(file.type)) {
        setFileError('Неподдерживаемый тип файла');
        return;
      }
      
      setSelectedFile(file);
      setFileError(null);
      
      if (isImage(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUser || sending) return;
    
    setSending(true);
    
    try {
      let chatDocRef;
      
      if (chatId) {
        chatDocRef = doc(db, 'chats', chatId);
      } 
      else if (otherUser) {
        setSending(true);
        
        const chatsRef = collection(db, 'chats');
        const chatsQuery = query(
          chatsRef,
          where('participants', 'array-contains', currentUser.uid)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const existingChat = chatsSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.participants.includes(otherUser.uid);
        });
        
        if (existingChat) {
          chatDocRef = doc(db, 'chats', existingChat.id);
        } else {
          const newChatRef = doc(collection(db, 'chats'));
          await setDoc(newChatRef, {
            participants: [currentUser.uid, otherUser.uid],
            type: ChatType.PRIVATE,
            createdAt: serverTimestamp(),
            lastMessage: {
              text: newMessage || 'Отправил(а) файл',
              senderId: currentUser.uid,
              timestamp: serverTimestamp()
            }
          });
          
          chatDocRef = newChatRef;
        }
      } else {
        setSending(false);
        return;
      }
      
      let fileData = null;
      if (selectedFile) {
        try {
          fileData = await uploadFile(selectedFile, `messages/${chatDocRef.id}`);
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error);
          setFileError('Ошибка при загрузке файла. Пожалуйста, попробуйте снова.');
          setSending(false);
          return;
        }
      }

      const messageData: any = {
        chatId: chatDocRef.id,
        text: newMessage.trim(),
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        read: false
      };
      
      if (fileData) {
        messageData.fileUrl = fileData.url;
        messageData.fileName = fileData.fileName;
        messageData.fileType = fileData.fileType;
      }
      
      await addDoc(collection(db, 'messages'), messageData);
      
      await updateDoc(chatDocRef, {
        lastMessage: {
          text: newMessage.trim() || (fileData ? `Отправил(а) ${isImage(fileData.fileType) ? 'изображение' : isVideo(fileData.fileType) ? 'видео' : 'файл'}` : ''),
          senderId: currentUser.uid,
          timestamp: serverTimestamp()
        }
      });
      
      if (otherUser) {
        await createMessageNotification(
          currentUser.uid,
          currentUser.displayName || 'Пользователь',
          currentUser.photoURL,
          otherUser.uid
        );
      }
      
      setNewMessage('');
      clearSelectedFile();
      
      if (!chatId && chatDocRef) {
        navigate(`/messages?chat=${chatDocRef.id}`, { replace: true });
      }
      
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleMessageMenu = (messageId: string) => {
    if (activeMessageMenu === messageId) {
      setActiveMessageMenu(null);
    } else {
      setActiveMessageMenu(messageId);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedMessageText(message.text);
    setActiveMessageMenu(null);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditedMessageText('');
  };

  const saveEditedMessage = async (messageId: string) => {
    if (!editedMessageText.trim() || !currentUser) return;
    
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        text: editedMessageText.trim(),
        edited: true
      });
      
      setEditingMessageId(null);
      setEditedMessageText('');
    } catch (error) {
      console.error('Ошибка при редактировании сообщения:', error);
      alert('Не удалось отредактировать сообщение. Пожалуйста, попробуйте снова.');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    
    if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
      try {
        await deleteDoc(doc(db, 'messages', messageId));
        setActiveMessageMenu(null);
      } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
        alert('Не удалось удалить сообщение. Пожалуйста, попробуйте снова.');
      }
    }
  };

  const goToUserProfile = () => {
    if (otherUser) {
      navigate(`/profile/${otherUser.uid}`);
    }
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

  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'Недавно';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, messageId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditedMessage(messageId);
    } else if (e.key === 'Escape') {
      cancelEditMessage();
    }
  };

  const deleteChat = async () => {
    if (!chatId || !currentUser) return;
    
    if (window.confirm('Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.')) {
      try {
        const messagesRef = collection(db, 'messages');
        const messagesQuery = query(messagesRef, where('chatId', '==', chatId));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        await deleteDoc(doc(db, 'chats', chatId));
        
        if (onBackToList) {
          onBackToList();
        }
        
        console.log('Чат успешно удален');
      } catch (error) {
        console.error('Ошибка при удалении чата:', error);
        alert('Не удалось удалить чат. Пожалуйста, попробуйте снова.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (showGroupSettings && groupData) {
    return (
      <GroupChatSettings
        chatId={chatId || ''}
        groupData={groupData}
        currentUserId={currentUser.uid}
        onClose={() => setShowGroupSettings(false)}
        onUpdate={(updatedData: Partial<GroupChatData>) => {
          setGroupData({...groupData, ...updatedData});
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center">
        {isMobile && onBackToList && (
          <button 
            onClick={onBackToList}
            className="mr-2 text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        )}
        
        {isGroupChat && groupData ? (
          <div className="flex items-center flex-1 min-w-0">
            <div className="relative">
              {groupData.photoURL ? (
                <img 
                  src={groupData.photoURL} 
                  alt={groupData.name} 
                  className="h-10 w-10 rounded-full mr-3 flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <UsersIcon className="h-5 w-5 text-indigo-500" />
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center">
                <h2 className="text-lg font-medium text-gray-900 truncate">
                  {groupData.name}
                </h2>
                {isGroupAdmin && (
                  <button 
                    onClick={() => setShowGroupSettings(true)} 
                    className="ml-2 text-gray-500 hover:text-indigo-600"
                    title="Настройки группы"
                  >
                    <Cog6ToothIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {groupData.participants.length} участников
              </p>
            </div>
            
            {isGroupAdmin && chatId && (
              <button 
                onClick={deleteChat}
                className="ml-2 text-gray-500 hover:text-red-600 transition-colors"
                title="Удалить чат"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : otherUser ? (
          <div className="flex items-center flex-1 min-w-0 justify-between">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 min-w-0"
              onClick={goToUserProfile}
            >
              <div className="relative">
                {otherUser.photoURL ? (
                  <img 
                    src={otherUser.photoURL} 
                    alt={otherUser.displayName || 'Пользователь'} 
                    className="h-10 w-10 rounded-full mr-3 flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                
                <div className={`absolute bottom-0 right-2 h-3 w-3 rounded-full border-2 border-white ${
                  otherUserOnlineStatus?.online ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-gray-900 hover:underline truncate">
                  {otherUser.displayName || 'Пользователь'}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {otherUserOnlineStatus?.online ? (
                    <span className="text-green-500">онлайн</span>
                  ) : (
                    <span>{otherUserOnlineStatus?.lastSeen ? formatLastSeen(otherUserOnlineStatus.lastSeen) : 'не в сети'}</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <button 
                className="ml-2 text-gray-500 hover:text-indigo-600 transition-colors"
                title="Видеозвонок"
              >
                <VideoCameraIcon className="h-5 w-5" />
              </button>
              
              <button 
                className="ml-2 text-gray-500 hover:text-indigo-600 transition-colors"
                title="Аудиозвонок"
              >
                <PhoneIcon className="h-5 w-5" />
              </button>
              
              {chatId && (
                <button 
                  onClick={deleteChat}
                  className="ml-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Удалить чат"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
              <UserIcon className="h-5 w-5 text-gray-500" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 truncate">
              {chatId ? "Загрузка..." : "Выберите чат"}
            </h2>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map(message => {
              const isCurrentUser = message.senderId === currentUser.uid;
              const isEditing = editingMessageId === message.id;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {isCurrentUser && (
                    <div className="message-menu-container relative mr-2 flex items-start">
                      <button 
                        onClick={() => toggleMessageMenu(message.id)}
                        className={`h-8 w-8 flex items-center justify-center rounded-full ${
                          activeMessageMenu === message.id 
                            ? 'bg-gray-200 text-gray-700' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                      
                      {activeMessageMenu === message.id && (
                        <div className="absolute right-0 top-8 mt-1 w-40 bg-white rounded-md shadow-lg z-10 py-1 text-sm text-gray-700">
                          <button 
                            onClick={() => startEditMessage(message)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Редактировать
                          </button>
                          <button 
                            onClick={() => deleteMessage(message.id)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-xs sm:max-w-md px-4 py-2 rounded-lg ${
                      isCurrentUser 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    } relative break-words`}
                  >
                    {isGroupChat && !isCurrentUser && !message.isSystemMessage && (
                      <div className="text-xs font-medium text-indigo-700 mb-1">
                        {groupParticipants.get(message.senderId)?.displayName || 'Пользователь'}
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="flex flex-col">
                        <textarea
                          ref={editInputRef}
                          value={editedMessageText}
                          onChange={(e) => setEditedMessageText(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, message.id)}
                          className={`w-full p-2 rounded-md mb-2 resize-none min-h-[60px] ${
                            isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'
                          } focus:outline-none`}
                          placeholder="Введите сообщение..."
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelEditMessage}
                            className={`p-1 rounded-full ${
                              isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => saveEditedMessage(message.id)}
                            className={`p-1 rounded-full ${
                              isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.text && <p className="whitespace-pre-wrap mb-2">{message.text}</p>}
                        
                        {message.fileUrl && (
                          <div className="mt-2">
                            {isImage(message.fileType || '') ? (
                              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={message.fileUrl} 
                                  alt={message.fileName || 'Изображение'} 
                                  className="max-w-full rounded-md max-h-60 object-contain"
                                />
                              </a>
                            ) : isVideo(message.fileType || '') ? (
                              <div className="rounded-md overflow-hidden">
                                <video 
                                  src={message.fileUrl} 
                                  controls
                                  className="max-w-full max-h-60"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Ваш браузер не поддерживает видео.
                                </video>
                              </div>
                            ) : (
                              <a 
                                href={message.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center p-2 rounded-md ${
                                  isCurrentUser ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-gray-200 hover:bg-gray-300'
                                } transition-colors`}
                              >
                                <DocumentIcon className={`h-5 w-5 mr-2 ${isCurrentUser ? 'text-indigo-200' : 'text-gray-600'}`} />
                                <span className="truncate max-w-[200px]">{message.fileName}</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'}`}>
                            {message.timestamp && formatDate(message.timestamp.toDate())}
                          </p>
                          {message.edited && (
                            <p className={`text-xs ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'} ml-2`}>
                              (ред.)
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {!isCurrentUser && (
                    <div className="message-menu-container relative ml-2 flex items-start">
                      <div className={`h-2 w-2 rounded-full ${message.read ? 'bg-green-500' : 'bg-gray-300'}`} 
                           title={message.read ? 'Прочитано' : 'Не прочитано'}>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              {chatId 
                ? 'Нет сообщений. Начните общение!' 
                : 'Начните новый чат с этим пользователем'}
            </p>
          </div>
        )}
      </div>
      
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
            <div className="flex items-center">
              {filePreview ? (
                <div className="relative w-16 h-16 mr-2">
                  {isImage(selectedFile?.type || '') ? (
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : isVideo(selectedFile?.type || '') ? (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <VideoCameraIcon className="h-8 w-8 text-indigo-500" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <DocumentIcon className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>
              ) : (
                <DocumentIcon className="h-8 w-8 text-gray-500 mr-2" />
              )}
              <div className="truncate max-w-[200px]">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button 
              onClick={clearSelectedFile}
              className="text-gray-500 hover:text-red-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {fileError && (
            <p className="text-xs text-red-500 mt-1">{fileError}</p>
          )}
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            title="Прикрепить файл"
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/zip,application/x-rar-compressed"
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            className="flex-1 border border-gray-300 rounded-md py-2 px-4 ml-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow; 