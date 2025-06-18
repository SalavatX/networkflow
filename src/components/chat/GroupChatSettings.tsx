import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  updateGroupChat, 
  addUserToGroupChat, 
  removeUserFromGroupChat, 
  makeUserAdmin, 
  ChatType 
} from '../../services/chatService';
import { 
  XMarkIcon, 
  PhotoIcon, 
  UserIcon, 
  PlusIcon, 
  CheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShieldCheckIcon,
  PencilIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

interface GroupChatSettingsProps {
  chatId: string;
  groupData: any;
  currentUserId: string;
  onClose: () => void;
  onUpdate?: (updatedData: any) => void;
}

interface ChatData {
  id: string;
  type: string;
  name: string;
  photoURL: string | null;
  participants: string[];
  admins: string[];
  createdBy: string;
}

interface UserData {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

const GroupChatSettings = ({ chatId, onClose, onUpdate }: GroupChatSettingsProps) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [chatName, setChatName] = useState('');
  const [participants, setParticipants] = useState<UserData[]>([]);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = chatData?.admins.includes(currentUser?.uid || '') || false;

  useEffect(() => {
    const fetchChatData = async () => {
      try {
        setLoading(true);
        const chatRef = doc(db, 'chats', chatId);
        const chatSnapshot = await getDoc(chatRef);
        
        if (!chatSnapshot.exists()) {
          setError('Чат не найден');
          setLoading(false);
          return;
        }
        
        const data = chatSnapshot.data() as ChatData;
        data.id = chatSnapshot.id;
        
        if (data.type !== ChatType.GROUP) {
          setError('Это не групповой чат');
          setLoading(false);
          return;
        }
        
        setChatData(data);
        setChatName(data.name);
        setPhotoPreview(data.photoURL);
        
        await fetchParticipantsData(data.participants, data.admins);
      } catch (error) {
        console.error('Ошибка при загрузке данных чата:', error);
        setError('Не удалось загрузить данные чата');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatData();
  }, [chatId]);

  const fetchParticipantsData = async (participantIds: string[], adminIds: string[]) => {
    try {
      const participantsData: UserData[] = [];
      
      for (const uid of participantIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          participantsData.push({
            uid,
            displayName: userData.displayName || 'Пользователь',
            photoURL: userData.photoURL,
            isAdmin: adminIds.includes(uid)
          });
        }
      }
      
      setParticipants(participantsData);
    } catch (error) {
      console.error('Ошибка при загрузке данных участников:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!chatData) return;
    
    try {
      setLoadingUsers(true);
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        orderBy('displayName'),
        limit(100)
      );
      
      const usersSnapshot = await getDocs(q);
      const usersData = usersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName || 'Пользователь',
            photoURL: data.photoURL,
            isAdmin: false
          };
        })
        .filter(user => !chatData.participants.includes(user.uid));
      
      setAvailableUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Ошибка при загрузке доступных пользователей:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showAddParticipants && availableUsers.length === 0) {
      fetchAvailableUsers();
    }
  }, [showAddParticipants, availableUsers.length]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter(user => 
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, availableUsers]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
        setError('Размер файла не должен превышать 2MB');
        return;
      }
      
      if (!file.type.match('image.*')) {
        setError('Пожалуйста, выберите изображение');
        return;
      }
      
      setNewPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !chatData || !isAdmin) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      let photoURL = chatData.photoURL || '';
      
      if (newPhoto) {
        const storageRef = storage.ref(`group-photos/${chatData.id}_${Date.now()}`);
        const uploadTask = await storageRef.put(newPhoto);
        photoURL = await uploadTask.ref.getDownloadURL();
      }
      
      const updates: { name?: string; photoURL?: string } = {};
      
      if (chatName !== chatData.name) {
        updates.name = chatName;
      }
      
      if (photoURL !== chatData.photoURL) {
        updates.photoURL = photoURL;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateGroupChat(chatId, currentUser.uid, updates);
        setChatData({ ...chatData, ...updates });
        setSuccess('Изменения сохранены');
        
        if (onUpdate) {
          onUpdate(updates);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении изменений:', error);
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipant = async (user: UserData) => {
    if (!currentUser || !chatData || !isAdmin) return;
    
    try {
      setSaving(true);
      setError('');
      
      await addUserToGroupChat(chatId, user.uid, currentUser.uid);
      
      setParticipants(prev => [...prev, { ...user, isAdmin: false }]);
      setAvailableUsers(prev => prev.filter(u => u.uid !== user.uid));
      setFilteredUsers(prev => prev.filter(u => u.uid !== user.uid));
      
      if (onUpdate) {
        onUpdate({ participants: [...chatData.participants, user.uid] });
      }
    } catch (error) {
      console.error('Ошибка при добавлении участника:', error);
      setError('Не удалось добавить участника');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveParticipant = async (user: UserData) => {
    if (!currentUser || !chatData || !isAdmin) return;
    if (user.uid === currentUser.uid) return;
    
    try {
      setSaving(true);
      setError('');
      
      await removeUserFromGroupChat(chatId, user.uid, currentUser.uid, false);
      
      setParticipants(prev => prev.filter(p => p.uid !== user.uid));
      
      if (onUpdate) {
        onUpdate({ participants: chatData.participants.filter(id => id !== user.uid) });
      }
    } catch (error) {
      console.error('Ошибка при удалении участника:', error);
      setError('Не удалось удалить участника');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !chatData) return;
    
    try {
      setSaving(true);
      setError('');
      
      await removeUserFromGroupChat(chatId, currentUser.uid, currentUser.uid, true);
      
      if (onUpdate) {
        onUpdate({ participants: chatData.participants.filter(id => id !== currentUser.uid) });
      }
      
      onClose();
    } catch (error) {
      console.error('Ошибка при выходе из группы:', error);
      setError('Не удалось выйти из группы');
    } finally {
      setSaving(false);
    }
  };

  const handleMakeAdmin = async (user: UserData) => {
    if (!currentUser || !chatData || !isAdmin || user.isAdmin) return;
    
    try {
      setSaving(true);
      setError('');
      
      await makeUserAdmin(chatId, user.uid, currentUser.uid);
      
      setParticipants(prev => 
        prev.map(p => 
          p.uid === user.uid ? { ...p, isAdmin: true } : p
        )
      );
      
      if (onUpdate) {
        onUpdate({ admins: [...chatData.admins, user.uid] });
      }
    } catch (error) {
      console.error('Ошибка при назначении администратора:', error);
      setError('Не удалось назначить администратора');
    } finally {
      setSaving(false);
    }
  };

  const toggleEditName = () => {
    setEditingName(!editingName);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="p-4 text-center">
            <div className="animate-spin inline-block rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
            <p>Загрузка данных чата...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="p-4 text-center">
            <p className="text-red-500">{error || 'Чат не найден'}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Настройки группового чата
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}
          
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Group Preview" 
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UsersIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                )}
                {isAdmin && (
                  <>
                    <label 
                      htmlFor="group-photo" 
                      className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 text-white shadow-md hover:bg-indigo-700 cursor-pointer"
                    >
                      <PhotoIcon className="h-4 w-4" />
                    </label>
                    <input
                      id="group-photo"
                      type="file"
                      className="hidden"
                      onChange={handlePhotoChange}
                      accept="image/*"
                      ref={fileInputRef}
                    />
                  </>
                )}
              </div>
              
              <div className="flex-1">
                {editingName ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Название группы"
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleEditName}
                      className="ml-2 text-indigo-600 hover:text-indigo-500"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{chatName}</h2>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={toggleEditName}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {participants.length} участников
                </p>
              </div>
            </div>
            
            {isAdmin && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium text-gray-900">Участники</h3>
              {isAdmin && !showAddParticipants && (
                <button
                  type="button"
                  onClick={() => setShowAddParticipants(true)}
                  className="flex items-center text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Добавить
                </button>
              )}
            </div>
            
            {showAddParticipants && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Добавить участников</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddParticipants(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск пользователей"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mb-2"
                />
                
                <div className="max-h-40 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {filteredUsers.map(user => (
                        <li key={user.uid} className="py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {user.photoURL ? (
                                <img 
                                  src={user.photoURL} 
                                  alt={user.displayName || 'Пользователь'} 
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <UserIcon className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">
                                  {user.displayName || 'Пользователь'}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleAddParticipant(user)}
                              className="p-1 text-indigo-600 hover:text-indigo-500"
                              disabled={saving}
                            >
                              <UserPlusIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-500 py-2 text-sm">
                      {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="max-h-60 overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {participants.map(user => (
                  <li key={user.uid} className="py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || 'Пользователь'} 
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {user.displayName || 'Пользователь'}
                            </p>
                            {user.uid === currentUser?.uid && (
                              <span className="ml-2 text-xs text-gray-500">(вы)</span>
                            )}
                          </div>
                          {user.isAdmin && (
                            <p className="text-xs text-indigo-600 flex items-center">
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              Администратор
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isAdmin && user.uid !== currentUser?.uid && (
                        <div className="flex space-x-2">
                          {!user.isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleMakeAdmin(user)}
                              className="p-1 text-indigo-600 hover:text-indigo-500 tooltip"
                              disabled={saving}
                              title="Назначить администратором"
                            >
                              <ShieldCheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(user)}
                            className="p-1 text-red-600 hover:text-red-500 tooltip"
                            disabled={saving}
                            title="Удалить из группы"
                          >
                            <UserMinusIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={saving}
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
              Выйти из группы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatSettings; 