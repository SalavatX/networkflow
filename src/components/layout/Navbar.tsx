import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  BellIcon, 
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import SearchBar from '../search/SearchBar';

const Navbar = () => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    const messagesRef = collection(db, 'messages');
    const chatsRef = collection(db, 'chats');
    
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsubscribeChats = onSnapshot(chatsQuery, (chatsSnapshot) => {
      if (chatsSnapshot.empty) {
        setUnreadMessages(0);
        return;
      }
      
      const chatIds = chatsSnapshot.docs.map(doc => doc.id);
      
      const messagesQuery = query(
        messagesRef,
        where('chatId', 'in', chatIds),
        where('senderId', '!=', currentUser.uid),
        where('read', '==', false)
      );
      
      const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
        setUnreadMessages(messagesSnapshot.size);
      });
      
      return () => unsubscribeMessages();
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeChats();
    };
  }, [currentUser]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">
                <span className="mr-1">Work</span>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Flow</span>
              </h1>
            </Link>
          </div>
          
          {currentUser && (
            <>
              <div className="hidden md:flex items-center justify-center flex-1 px-8">
                <SearchBar />
              </div>
              
              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                <Link to="/" className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors">
                  <HomeIcon className="h-6 w-6" />
                </Link>
                <Link to="/explore" className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors">
                  <AdjustmentsHorizontalIcon className="h-6 w-6" />
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors relative">
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link to="/notifications" className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors relative">
                  <BellIcon className="h-6 w-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Link>
                
                {isAdmin && (
                  <Link to="/admin" className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}
                
                <Link to={`/profile/${currentUser.uid}`} className="text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors">
                  {userData?.photoURL ? (
                    <img 
                      src={userData.photoURL} 
                      alt={userData.displayName || 'Пользователь'} 
                      className="h-8 w-8 rounded-full border-2 border-indigo-100"
                    />
                  ) : (
                    <UserIcon className="h-6 w-6" />
                  )}
                </Link>
                
                <button 
                  onClick={signOut} 
                  className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  Выйти
                </button>
              </div>

              <div className="flex items-center sm:hidden">
                <button
                  onClick={toggleSearch}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 mr-2"
                >
                  <span className="sr-only">Открыть поиск</span>
                  <MagnifyingGlassIcon className="block h-6 w-6" />
                </button>
                <button
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  <span className="sr-only">Открыть меню</span>
                  {menuOpen ? (
                    <XMarkIcon className="block h-6 w-6" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </>
          )}
          
          {!currentUser && (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md transition-colors"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>

      {currentUser && searchOpen && (
        <div className="sm:hidden p-4 border-t border-gray-200">
          <SearchBar />
        </div>
      )}

      {currentUser && menuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <HomeIcon className="h-6 w-6 mr-3" />
                Главная
              </div>
            </Link>
            <Link
              to="/explore"
              className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <AdjustmentsHorizontalIcon className="h-6 w-6 mr-3" />
                Исследовать
              </div>
            </Link>
            <Link
              to="/messages"
              className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              onClick={toggleMenu}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3" />
                  Сообщения
                </div>
                {unreadMessages > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </div>
            </Link>
            <Link
              to="/notifications"
              className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              onClick={toggleMenu}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BellIcon className="h-6 w-6 mr-3" />
                  Уведомления
                </div>
                {unreadNotifications > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </div>
            </Link>
            
            {isAdmin && (
              <Link
                to="/admin"
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
                onClick={toggleMenu}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Админ-панель
                </div>
              </Link>
            )}
            
            <Link
              to={`/profile/${currentUser.uid}`}
              className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
              onClick={toggleMenu}
            >
              <div className="flex items-center">
                <UserIcon className="h-6 w-6 mr-3" />
                Мой профиль
              </div>
            </Link>
            
            <button
              onClick={() => {
                signOut();
                toggleMenu();
              }}
              className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Выйти
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 