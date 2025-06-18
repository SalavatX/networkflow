import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BellIcon, HeartIcon, ChatBubbleLeftIcon, UserIcon, TrashIcon, CheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from '../../services/notificationService';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'moderation';
  senderId: string;
  senderName: string;
  senderPhotoURL: string | null;
  recipientId: string;
  postId?: string;
  commentId?: string;
  message?: string;
  title?: string;
  reason?: string;
  additionalInfo?: string;
  createdAt: { toDate: () => Date };
  read: boolean;
}

const Notifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsAsRead(currentUser.uid);
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUser) return;
    
    if (window.confirm('Вы уверены, что хотите удалить это уведомление?')) {
      await deleteNotification(notificationId);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!currentUser) return;
    setShowDeleteConfirm(false);
    await deleteAllNotifications(currentUser.uid);
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  };

  const getNotificationIcon = (type: string, title?: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="h-6 w-6 text-red-500" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="h-6 w-6 text-blue-500" />;
      case 'follow':
        return <UserIcon className="h-6 w-6 text-green-500" />;
      case 'message':
        return <ChatBubbleLeftIcon className="h-6 w-6 text-purple-500" />;
      case 'moderation':
        if (title?.includes('заблокирован')) {
          return <ShieldExclamationIcon className="h-6 w-6 text-red-600" />;
        } else if (title?.includes('разблокирован')) {
          return <ShieldExclamationIcon className="h-6 w-6 text-green-600" />;
        } else if (title?.includes('предупреждение')) {
          return <ShieldExclamationIcon className="h-6 w-6 text-yellow-500" />;
        } else if (title?.includes('пост')) {
          return <ShieldExclamationIcon className="h-6 w-6 text-red-600" />;
        } else if (title?.includes('комментарий')) {
          return <ShieldExclamationIcon className="h-6 w-6 text-red-600" />;
        }
        return <ShieldExclamationIcon className="h-6 w-6 text-red-600" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return `поставил(а) лайк на вашу публикацию`;
      case 'comment':
        return `оставил(а) комментарий: "${notification.message}"`;
      case 'follow':
        return `подписался(ась) на вас`;
      case 'message':
        return `отправил(а) вам сообщение`;
      case 'moderation':
        return notification.title || 'выполнил(а) модерационное действие';
      default:
        return 'взаимодействовал(а) с вами';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return `/post/${notification.postId}`;
      case 'follow':
        return `/profile/${notification.senderId}`;
      case 'message':
        return `/messages`;
      case 'moderation':
        return '/';
      default:
        return '/';
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Доступ запрещен</h2>
          <p className="mt-2 text-gray-600">Вы должны войти в систему, чтобы просматривать уведомления.</p>
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
        <div className="flex space-x-4">
        {notifications.some(notification => !notification.read) && (
          <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
              <CheckIcon className="h-4 w-4 mr-1" />
            Отметить все как прочитанные
          </button>
        )}
          {notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Удалить все
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 mb-3">Вы уверены, что хотите удалить все уведомления?</p>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteAllNotifications}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Да, удалить все
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <li 
                key={notification.id}
                className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-indigo-50' : ''} relative group`}
              >
                <div className="flex justify-between items-start">
                <Link 
                  to={getNotificationLink(notification)}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    className="flex items-start space-x-3 flex-1"
                >
                  <div className="flex-shrink-0">
                    {notification.senderPhotoURL ? (
                      <img 
                        src={notification.senderPhotoURL} 
                        alt={notification.senderName} 
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-bold">
                          {notification.senderName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                    
                    <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="font-bold">{notification.senderName}</span>{' '}
                        {getNotificationText(notification)}
                      </p>
                      <div className="ml-2 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.title)}
                      </div>
                    </div>
                    {notification.type === 'moderation' && notification.reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Причина: {notification.reason}
                      </p>
                    )}
                    {notification.type === 'moderation' && notification.additionalInfo && (
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.additionalInfo}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        {notification.createdAt ? formatDate(notification.createdAt.toDate()) : 'Недавно'}
                    </p>
                  </div>
                </Link>

                  <div className="flex space-x-1 ml-2">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-100 bg-white shadow-sm border border-gray-200"
                        title="Отметить как прочитанное"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(notification.id, e)}
                      className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100 bg-white shadow-sm border border-gray-200"
                      title="Удалить уведомление"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Нет уведомлений</h3>
          <p className="mt-2 text-gray-500">
            У вас пока нет уведомлений. Они появятся, когда кто-то будет взаимодействовать с вашим контентом.
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications; 