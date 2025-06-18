import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface NotificationData {
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
  read: boolean;
  createdAt?: any;
}

/**
 * Создает уведомление в Firestore
 */
export const createNotification = async (notificationData: NotificationData): Promise<string | null> => {
  try {
    if (notificationData.senderId === notificationData.recipientId && notificationData.type !== 'moderation') {
      return null;
    }
    
    const notificationWithTimestamp = {
      ...notificationData,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    return null;
  }
};

/**
 * Создает модерационное уведомление
 */
export const createModerationNotification = async (
  recipientId: string,
  adminId: string,
  adminName: string,
  adminPhotoURL: string | null,
  title: string,
  reason: string,
  additionalInfo?: string
): Promise<string | null> => {
  return createNotification({
    type: 'moderation',
    senderId: adminId,
    senderName: adminName,
    senderPhotoURL: adminPhotoURL,
    recipientId,
    title,
    reason,
    additionalInfo,
    read: false
  });
};

/**
 * Создает уведомление о лайке поста
 */
export const createLikeNotification = async (
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string,
  postId: string
): Promise<string | null> => {
  const existingNotifications = await getDocs(
    query(
      collection(db, 'notifications'),
      where('type', '==', 'like'),
      where('senderId', '==', senderId),
      where('recipientId', '==', recipientId),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  );
  
  if (!existingNotifications.empty) {
    const notificationId = existingNotifications.docs[0].id;
    await updateDoc(doc(db, 'notifications', notificationId), {
      createdAt: serverTimestamp(),
      read: false
    });
    return notificationId;
  }
  
  return createNotification({
    type: 'like',
    senderId,
    senderName,
    senderPhotoURL,
    recipientId,
    postId,
    read: false
  });
};

/**
 * Создает уведомление о комментарии к посту
 */
export const createCommentNotification = async (
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string,
  postId: string,
  commentId: string,
  commentText: string
): Promise<string | null> => {
  return createNotification({
    type: 'comment',
    senderId,
    senderName,
    senderPhotoURL,
    recipientId,
    postId,
    commentId,
    message: commentText.length > 50 ? `${commentText.substring(0, 50)}...` : commentText,
    read: false
  });
};

/**
 * Создает уведомление о подписке
 */
export const createFollowNotification = async (
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string
): Promise<string | null> => {
  const existingNotifications = await getDocs(
    query(
      collection(db, 'notifications'),
      where('type', '==', 'follow'),
      where('senderId', '==', senderId),
      where('recipientId', '==', recipientId),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  );
  
  if (!existingNotifications.empty) {
    const notificationId = existingNotifications.docs[0].id;
    await updateDoc(doc(db, 'notifications', notificationId), {
      createdAt: serverTimestamp(),
      read: false
    });
    return notificationId;
  }
  
  return createNotification({
    type: 'follow',
    senderId,
    senderName,
    senderPhotoURL,
    recipientId,
    read: false
  });
};

/**
 * Создает уведомление о новом сообщении
 * Создает только одно уведомление для непрочитанных сообщений
 */
export const createMessageNotification = async (
  senderId: string,
  senderName: string,
  senderPhotoURL: string | null,
  recipientId: string
): Promise<string | null> => {
  const existingNotifications = await getDocs(
    query(
      collection(db, 'notifications'),
      where('type', '==', 'message'),
      where('senderId', '==', senderId),
      where('recipientId', '==', recipientId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
  );
  
  if (!existingNotifications.empty) {
    const notificationId = existingNotifications.docs[0].id;
    await updateDoc(doc(db, 'notifications', notificationId), {
      createdAt: serverTimestamp()
    });
    return notificationId;
  }
  
  return createNotification({
    type: 'message',
    senderId,
    senderName,
    senderPhotoURL,
    recipientId,
    message: 'Новое сообщение',
    read: false
  });
};

/**
 * Отмечает уведомление как прочитанное
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
    return true;
  } catch (error) {
    console.error('Ошибка при отметке уведомления как прочитанного:', error);
    return false;
  }
};

/**
 * Отмечает все уведомления пользователя как прочитанные
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const notificationsSnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      )
    );
    
    const updatePromises: Promise<void>[] = [];
    notificationsSnapshot.forEach(docSnapshot => {
      updatePromises.push(updateDoc(docSnapshot.ref, { read: true }));
    });
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    return false;
  }
};

/**
 * Удаляет уведомление по его ID
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return true;
  } catch (error) {
    console.error('Ошибка при удалении уведомления:', error);
    return false;
  }
};

/**
 * Удаляет все уведомления пользователя
 */
export const deleteAllNotifications = async (userId: string): Promise<boolean> => {
  try {
    const notificationsSnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId)
      )
    );
    
    const deletePromises: Promise<void>[] = [];
    notificationsSnapshot.forEach(docSnapshot => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Ошибка при удалении всех уведомлений:', error);
    return false;
  }
};

export default {
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createFollowNotification,
  createMessageNotification,
  createModerationNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications
}; 