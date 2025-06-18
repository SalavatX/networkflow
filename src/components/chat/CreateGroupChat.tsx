import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { createGroupChat } from '../../services/chatService';
import { XMarkIcon, PhotoIcon, UserIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface UserForSelection {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  selected: boolean;
}

interface CreateGroupChatProps {
  onClose: () => void;
}

const CreateGroupChat = ({ onClose }: CreateGroupChatProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserForSelection[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserForSelection[]>([]);
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('uid', '!=', currentUser.uid),
          orderBy('uid'),
          limit(100)
        );
        
        const usersSnapshot = await getDocs(q);
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName || 'Пользователь',
            photoURL: data.photoURL,
            selected: false
          };
        });
        
        setUsers(usersData);
        setFilteredUsers(usersData);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        setError('Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const toggleUserSelection = (uid: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.uid === uid ? { ...user, selected: !user.selected } : user
      )
    );
  };

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
      
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const selectedUsers = users.filter(user => user.selected);
    
    if (selectedUsers.length === 0) {
      setError('Выберите хотя бы одного участника');
      return;
    }
    
    if (!groupName.trim()) {
      setError('Введите название группы');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      let photoURL = '';
      
      if (groupPhoto) {
        const storageRef = storage.ref(`group-photos/${Date.now()}`);
        const uploadTask = await storageRef.put(groupPhoto);
        photoURL = await uploadTask.ref.getDownloadURL();
      }
      
      const participantIds = selectedUsers.map(user => user.uid);
      
      const chatId = await createGroupChat(
        currentUser.uid,
        groupName.trim(),
        participantIds,
        photoURL || undefined
      );
      
      navigate(`/messages/${chatId}`);
      onClose();
    } catch (error) {
      console.error('Ошибка при создании группового чата:', error);
      setError('Не удалось создать групповой чат');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = users.filter(user => user.selected).length;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Создать групповой чат
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 flex items-center space-x-4">
            <div className="relative">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Group Preview" 
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-indigo-600" />
                </div>
              )}
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
              />
            </div>
            
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Название группы"
              className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск пользователей"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          {selectedCount > 0 && (
            <div className="mb-4 p-2 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Выбрано участников: {selectedCount}
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <li key={user.uid} className="py-2">
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(user.uid)}
                      className={`flex items-center justify-between w-full p-2 rounded-md transition-colors ${
                        user.selected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
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
                          <p className="text-sm font-medium text-gray-900">
                            {user.displayName || 'Пользователь'}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`h-6 w-6 rounded-full border ${
                        user.selected 
                          ? 'bg-indigo-600 border-indigo-600 flex items-center justify-center' 
                          : 'border-gray-300'
                      }`}>
                        {user.selected && (
                          <CheckIcon className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={submitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Создание...' : 'Создать чат'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupChat; 