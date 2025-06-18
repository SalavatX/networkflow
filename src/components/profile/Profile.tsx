import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import PostItem from '../posts/PostItem';
import EditProfile from './EditProfile';
import { UserIcon, PencilIcon, ChatBubbleLeftIcon, UserPlusIcon, UserMinusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Image from '../common/Image';
import { createFollowNotification } from '../../services/notificationService';
import { subscribeToUserStatus } from '../../services/onlineStatusService';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import AdminActions from '../admin/AdminActions';
import { blockUser, unblockUser, getUserModerationHistory } from '../../services/moderationService';

interface ProfileData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio: string;
  followers: string[];
  following: string[];
  bannerURL?: string | null;
  blocked?: boolean;
  blockedReason?: string;
  blockedUntil?: Date | null;
  isAdmin?: boolean;
}

interface UserData {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<UserData[]>([]);
  const [followingList, setFollowingList] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userOnlineStatus, setUserOnlineStatus] = useState<{ online: boolean, lastSeen: any } | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [validFollowersCount, setValidFollowersCount] = useState(0);
  const [validFollowingCount, setValidFollowingCount] = useState(0);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = currentUser && userId === currentUser.uid;
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState(0);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let unsubscribe = () => {};
    
    if (userId) {
      unsubscribe = subscribeToUserStatus(userId, (status) => {
        setUserOnlineStatus(status);
      });
    }
    
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;

      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const followers = Array.isArray(userData.followers) ? userData.followers : [];
          const following = Array.isArray(userData.following) ? userData.following : [];
          
          const validFollowers = followers.filter(id => id && typeof id === 'string' && id.trim() !== '');
          const validFollowing = following.filter(id => id && typeof id === 'string' && id.trim() !== '');
          
          if (followers.length !== validFollowers.length) {
          }
          
          if (following.length !== validFollowing.length) {

          }
          
          const profileData: ProfileData = {
            ...userData,
            followers: validFollowers,
            following: validFollowing
          } as ProfileData;
          
          setProfileData(profileData);
          
          if (currentUser && profileData.followers) {
            setIsFollowing(profileData.followers.includes(currentUser.uid));
          }
        }
        
        const postsRef = collection(db, 'posts');
        const postsQuery = query(
          postsRef,
          where('authorId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPosts(postsData);
      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, currentUser]);

  const toggleEditProfile = () => {
    setShowEditProfile(!showEditProfile);
  };

  const handleSendMessage = () => {
    if (!currentUser || !profileData) return;
    
    navigate('/messages', { 
      state: { 
        selectedUser: {
          uid: profileData.uid,
          displayName: profileData.displayName,
          photoURL: profileData.photoURL
        } 
      } 
    });
  };

  const toggleFollow = async () => {
    if (!currentUser || !profileData || !userData || isOwnProfile) return;
    
    try {
      setIsUpdating(true);
      const userDocRef = doc(db, 'users', profileData.uid);
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      
      if (isFollowing) {
        await updateDoc(userDocRef, {
          followers: arrayRemove(currentUser.uid)
        });
        
        await updateDoc(currentUserDocRef, {
          following: arrayRemove(profileData.uid)
        });
        
        setIsFollowing(false);
        setProfileData(prev => {
          if (!prev) return null;
          const updatedFollowers = prev.followers.filter(id => id !== currentUser.uid);
          return { ...prev, followers: updatedFollowers };
        });
      } else {
        await updateDoc(userDocRef, {
          followers: arrayUnion(currentUser.uid)
        });
        
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(profileData.uid)
        });
        
        try {
          await createFollowNotification(
            currentUser.uid,
            userData.displayName || 'Пользователь',
            userData.photoURL,
            profileData.uid
          );
        } catch (error) {
          console.error('Ошибка при создании уведомления о подписке:', error);
        }
        
        setIsFollowing(true);
        setProfileData(prev => {
          if (!prev) return null;
          return { ...prev, followers: [...prev.followers, currentUser.uid] };
        });
      }
    } catch (error) {
      console.error('Ошибка при изменении подписки:', error);
      alert('Не удалось изменить подписку. Пожалуйста, попробуйте снова.');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchUsersList = async (userIds: string[], listType: 'followers' | 'following') => {
    if (!userIds.length) return [];
    
    try {
      setLoadingUsers(true);
      const usersData: UserData[] = [];
      const validUserIds = [...userIds];
      const notFoundIds: string[] = [];
      
      for (const uid of validUserIds) {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            usersData.push({
              uid,
              displayName: userData.displayName || 'Пользователь',
              photoURL: userData.photoURL
            });
          } else {
            notFoundIds.push(uid);
          }
        } catch (userError) {
          console.error(`Ошибка при загрузке пользователя ${uid} (${listType}):`, userError);
          notFoundIds.push(uid);
        }
      }
      
      if (notFoundIds.length > 0) {
        console.log('Не найдены пользователи:', notFoundIds);
      }
      
      return usersData;
    } catch (error) {
      console.error(`Ошибка при загрузке списка ${listType}:`, error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  const showFollowers = async () => {
    if (!profileData) return;
    
    if (!profileData.followers || !Array.isArray(profileData.followers) || profileData.followers.length === 0) {
      setFollowersList([]);
      setShowFollowingModal(false);
      setShowFollowersModal(true);
      return;
    }
    
    setShowFollowingModal(false);
    setFollowingList([]);
    
    try {
      setLoadingUsers(true);
      const users = await fetchUsersList(profileData.followers, 'followers');
      setFollowersList(users);
      setValidFollowersCount(users.length);
      setShowFollowersModal(true);
    } catch (error) {
      console.error("Ошибка при загрузке подписчиков:", error);
      setFollowersList([]);
      setShowFollowersModal(true);
    } finally {
      setLoadingUsers(false);
    }
  };

  const showFollowing = async () => {
    if (!profileData) return;
    
    if (!profileData.following || !Array.isArray(profileData.following) || profileData.following.length === 0) {
      setFollowingList([]);
      setShowFollowersModal(false);
      setShowFollowingModal(true);
      return;
    }
    
    setShowFollowersModal(false);
    setFollowersList([]);
    
    try {
      setLoadingUsers(true);
      const users = await fetchUsersList(profileData.following, 'following');
      setFollowingList(users);
      setValidFollowingCount(users.length);
      setShowFollowingModal(true);
    } catch (error) {
      console.error("Ошибка при загрузке подписок:", error);
      setFollowingList([]);
      setShowFollowingModal(true);
    } finally {
      setLoadingUsers(false);
    }
  };

  const closeFollowersModal = () => {
    setShowFollowersModal(false);
    setFollowersList([]);
  };
  
  const closeFollowingModal = () => {
    setShowFollowingModal(false);
    setFollowingList([]);
  };

  const navigateToFollowerProfile = (uid: string) => {
    closeFollowersModal();
    navigate(`/profile/${uid}`);
  };
  
  const navigateToFollowingProfile = (uid: string) => {
    closeFollowingModal();
    navigate(`/profile/${uid}`);
  };

  const formatLastSeen = (lastSeen: any) => {
    try {
      if (!lastSeen) return 'не в сети';
      
      const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ru
      });
    } catch (error) {
      console.error('Ошибка при форматировании времени последнего посещения:', error);
      return 'не в сети';
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, {
        addSuffix: true,
        locale: ru
      });
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'неизвестно';
    }
  };

  const handleBannerClick = () => {
    if (isOwnProfile && bannerInputRef.current) {
      bannerInputRef.current.click();
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return;
    
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB');
      return;
    }
    
    if (!file.type.match('image.*')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    try {
      setUploadingBanner(true);
      
      const storageRef = storage.ref(`banners/${currentUser.uid}`);
      const uploadResult = await storageRef.put(file);
      
      const bannerURL = await uploadResult.ref.getDownloadURL();
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { bannerURL });
      
      setProfileData(prev => {
        if (!prev) return null;
        return { ...prev, bannerURL };
      });
      
    } catch (error) {
      console.error('Ошибка при загрузке баннера:', error);
      alert('Не удалось загрузить баннер. Пожалуйста, попробуйте снова.');
    } finally {
      setUploadingBanner(false);
    }
  };

  useEffect(() => {
    const fetchUserCounts = async () => {
      if (!profileData) return;
      
      if (profileData.followers && profileData.followers.length > 0) {
        const users = await fetchUsersList(profileData.followers, 'followers');
        setValidFollowersCount(users.length);
      }
      
      if (profileData.following && profileData.following.length > 0) {
        const users = await fetchUsersList(profileData.following, 'following');
        setValidFollowingCount(users.length);
      }
    };
    
    fetchUserCounts();
  }, [profileData]);

  const handleMakeAdmin = async () => {
    if (!currentUser || !profileData) return;
    
    const isConfirmed = window.confirm(`Вы действительно хотите назначить пользователя ${profileData.displayName || 'Пользователь'} администратором?`);
    
    if (!isConfirmed) return;
    
    try {
      const userDocRef = doc(db, 'users', profileData.uid);
      await updateDoc(userDocRef, {
        isAdmin: true
      });
      
      setSuccessMessage(`Пользователь ${profileData.displayName || 'Пользователь'} назначен администратором`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setProfileData(prev => {
        if (!prev) return null;
        return { ...prev, isAdmin: true };
      });
    } catch (error: any) {
      console.error('Ошибка при назначении администратора:', error);
      setErrorMessage(error.message || 'Не удалось назначить администратора');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleShowBlockModal = () => {
    setBlockReason('');
    setBlockDuration(0);
    setShowBlockModal(true);
  };

  const handleBlockUser = async () => {
    if (!currentUser || !profileData || !blockReason) {
      setErrorMessage('Необходимо указать причину блокировки');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      await blockUser(
        profileData.uid, 
        currentUser.uid, 
        currentUser.displayName || 'Администратор', 
        blockReason,
        blockDuration
      );
      
      setSuccessMessage(`Пользователь ${profileData.displayName || 'Пользователь'} заблокирован`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowBlockModal(false);
      
      setProfileData(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          blocked: true, 
          blockedReason: blockReason,
          blockedUntil: blockDuration > 0 ? new Date(Date.now() + blockDuration * 24 * 60 * 60 * 1000) : null
        };
      });
    } catch (error: any) {
      console.error('Ошибка при блокировке пользователя:', error);
      setErrorMessage(error.message || 'Не удалось заблокировать пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleUnblockUser = async () => {
    if (!currentUser || !profileData) return;
    
    const isConfirmed = window.confirm(`Вы действительно хотите разблокировать пользователя ${profileData.displayName || 'Пользователь'}?`);
    
    if (!isConfirmed) return;
    
    try {
      await unblockUser(
        profileData.uid, 
        currentUser.uid, 
        currentUser.displayName || 'Администратор', 
        'Разблокировка администратором'
      );
      
      setSuccessMessage(`Пользователь ${profileData.displayName || 'Пользователь'} разблокирован`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setProfileData(prev => {
        if (!prev) return null;
        return { ...prev, blocked: false, blockedReason: undefined, blockedUntil: null };
      });
    } catch (error: any) {
      console.error('Ошибка при разблокировке пользователя:', error);
      setErrorMessage(error.message || 'Не удалось разблокировать пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleBlockOrUnblock = () => {
    if (profileData?.blocked) {
      handleUnblockUser();
    } else {
      handleShowBlockModal();
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser || !profileData) return;
    
    const isConfirmed = window.confirm(`Вы действительно хотите удалить пользователя ${profileData.displayName || 'Пользователь'}? Это действие необратимо.`);
    
    if (!isConfirmed) return;
    
    try { 
      setSuccessMessage(`Пользователь ${profileData.displayName || 'Пользователь'} удален`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      navigate('/admin/users');
    } catch (error: any) {
      console.error('Ошибка при удалении пользователя:', error);
      setErrorMessage(error.message || 'Не удалось удалить пользователя');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleViewModerationHistory = async () => {
    if (!profileData) return;
    
    try {
      const history = await getUserModerationHistory(profileData.uid);
      setModerationHistory(history);
      setShowModerationModal(true);
    } catch (error: any) {
      console.error('Ошибка при получении истории модерации:', error);
      setErrorMessage(error.message || 'Не удалось загрузить историю модерации');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Профиль не найден</h2>
          <p className="mt-2 text-gray-600">Пользователь с указанным ID не существует.</p>
          <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div 
          className={`h-48 sm:h-64 bg-cover bg-center relative ${
            isOwnProfile ? 'cursor-pointer group' : ''
          }`}
          style={{ 
            backgroundImage: profileData.bannerURL 
              ? `url(${profileData.bannerURL})` 
              : 'linear-gradient(to right, #4f46e5, #7c3aed)'
          }}
          onClick={handleBannerClick}
        >
          {isOwnProfile && (
            <>
              <input 
                type="file" 
                ref={bannerInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleBannerChange}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg p-2">
                  <PhotoIcon className="h-8 w-8 text-gray-700" />
                </div>
              </div>
              {uploadingBanner && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="px-4 py-5 sm:px-6 -mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-5">
            <div className="flex relative mx-auto sm:mx-0 sm:mt-2">
              {profileData.photoURL ? (
                <Image 
                  src={profileData.photoURL} 
                  alt={profileData.displayName || 'Профиль пользователя'} 
                  className="h-32 w-32 rounded-full ring-4 ring-white sm:h-40 sm:w-40 object-cover"
                />
              ) : (
                <div className="h-32 w-32 rounded-full ring-4 ring-white sm:h-40 sm:w-40 bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-16 w-16 text-gray-500 sm:h-20 sm:w-20" />
                </div>
              )}
              
              <div className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-white ${
                userOnlineStatus?.online ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>
            
            <div className="mt-6 sm:mt-0 sm:flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mt-8 sm:mt-16">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {profileData.displayName || 'Пользователь'}
              </h1>
                  
                  <div className={`text-sm mt-1 ${userOnlineStatus?.online ? 'text-green-500' : 'text-gray-500'}`}>
                    {userOnlineStatus?.online ? 'онлайн' : (
                      userOnlineStatus?.lastSeen ? formatLastSeen(userOnlineStatus.lastSeen) : 'не в сети'
                    )}
              </div>
            </div>
                
                <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 items-center sm:items-start">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={toggleEditProfile}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                    Редактировать профиль
                  </button>
                  <Link
                    to="/change-password"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Сменить пароль
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ChatBubbleLeftIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                    Написать
                  </button>
                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={isUpdating}
                    className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      isFollowing 
                        ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' 
                        : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinusIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                        Отписаться
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="-ml-1 mr-2 h-5 w-5 text-white" />
                        Подписаться
                      </>
                    )}
                  </button>
                  
                  {userData?.isAdmin && !profileData?.isAdmin && (
                    <AdminActions 
                      userId={profileData?.uid || ''}
                      onMakeAdmin={handleMakeAdmin}
                      onBlock={handleBlockOrUnblock}
                      onDelete={handleDeleteUser}
                      onHistory={handleViewModerationHistory}
                      isBlocked={profileData?.blocked}
                    />
                  )}
                </>
              )}
            </div>
          </div>
          
                              <div className="mt-6 flex items-center justify-center sm:justify-start space-x-6">
                <button 
                  onClick={showFollowers}
                  className={`${profileData.followers?.length ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-400'} transition-colors focus:outline-none flex flex-col items-center sm:items-start`}
                  disabled={!profileData.followers?.length}
                  aria-label="Показать подписчиков"
                  title="Показать подписчиков"
                  data-testid="followers-button"
                >
                  <span className="font-semibold text-xl">{validFollowersCount || 0}</span>
                  <span className="text-sm">подписчиков</span>
                </button>
                
                <button 
                  onClick={showFollowing}
                  className={`${profileData.following?.length ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-400'} transition-colors focus:outline-none flex flex-col items-center sm:items-start`}
                  disabled={!profileData.following?.length}
                  aria-label="Показать подписки"
                  title="Показать подписки"
                  data-testid="following-button"
                >
                  <span className="font-semibold text-xl">{validFollowingCount || 0}</span>
                  <span className="text-sm">подписок</span>
                </button>
                
                <div className="text-gray-600 flex flex-col items-center sm:items-start">
                  <span className="font-semibold text-xl">{posts.length}</span>
                  <span className="text-sm">публикаций</span>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-lg">
            {profileData.bio ? (
              <p className="text-sm text-gray-700">{profileData.bio}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">Нет информации о пользователе</p>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditProfile && (
        <EditProfile 
          profileData={profileData} 
          onClose={toggleEditProfile} 
          onUpdate={(updatedData) => setProfileData({...profileData, ...updatedData})}
        />
      )}

      {showFollowersModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeFollowersModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Подписчики
                  </h3>
                  <button 
                    onClick={closeFollowersModal}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {loadingUsers ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : followersList && followersList.length > 0 ? (
                  <ul className="divide-y divide-gray-200" data-list-type="followers">
                    {followersList.map(user => (
                      <li key={user.uid} className="py-4">
                        <button 
                          onClick={() => navigateToFollowerProfile(user.uid)}
                          className="flex items-center space-x-3 w-full text-left hover:bg-gray-50 p-2 rounded-md transition-colors"
                        >
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || 'Пользователь'} 
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.displayName || 'Пользователь'}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4" data-empty-list="followers">
                    <p className="text-gray-500">Нет подписчиков</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {profileData?.followers && profileData.followers.length > 0 ? 
                        `IDs загружены (${profileData.followers.length}), но данные недоступны` : 
                        'Список ID не загружен или пуст'}
                    </p>
                    {profileData?.followers && profileData.followers.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-left">
                        <p className="font-medium">ID подписчиков:</p>
                        <p className="overflow-x-auto whitespace-nowrap mt-1">{profileData.followers.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFollowingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeFollowingModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Подписки
                  </h3>
                  <button 
                    onClick={closeFollowingModal}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {loadingUsers ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : followingList && followingList.length > 0 ? (
                  <ul className="divide-y divide-gray-200" data-list-type="following">
                    {followingList.map(user => (
                      <li key={user.uid} className="py-4">
                        <button 
                          onClick={() => navigateToFollowingProfile(user.uid)}
                          className="flex items-center space-x-3 w-full text-left hover:bg-gray-50 p-2 rounded-md transition-colors"
                        >
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName || 'Пользователь'} 
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.displayName || 'Пользователь'}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4" data-empty-list="following">
                    <p className="text-gray-500">Нет подписок</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {profileData?.following && profileData.following.length > 0 ? 
                        `IDs загружены (${profileData.following.length}), но данные недоступны` : 
                        'Список ID не загружен или пуст'}
                    </p>
                    {profileData?.following && profileData.following.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-left">
                        <p className="font-medium">ID подписок:</p>
                        <p className="overflow-x-auto whitespace-nowrap mt-1">{profileData.following.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Публикации</h2>
        
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden transition-transform hover:transform hover:scale-[1.02]">
                <PostItem post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white shadow rounded-lg">
            <p className="text-gray-500">У пользователя пока нет публикаций.</p>
          </div>
        )}
      </div>

      {/* Модальное окно блокировки */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowBlockModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Блокировка пользователя
                    </h3>
                    <div className="mt-4">
                      <div className="mb-4">
                        <label htmlFor="block-reason" className="block text-sm font-medium text-gray-700">
                          Причина блокировки
                        </label>
                        <textarea
                          id="block-reason"
                          name="block-reason"
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Укажите причину блокировки"
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          autoFocus
                        ></textarea>
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="block-duration" className="block text-sm font-medium text-gray-700">
                          Продолжительность блокировки (в днях, 0 для постоянной)
                        </label>
                        <input
                          type="number"
                          id="block-duration"
                          name="block-duration"
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={blockDuration}
                          onChange={(e) => setBlockDuration(parseInt(e.target.value) || 0)}
                        />
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
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowModerationModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
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
                                    {action.createdAt && formatDate(action.createdAt.toDate())}
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

      {/* Сообщения об успехе/ошибке */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50">
          <p>{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md z-50">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default Profile; 