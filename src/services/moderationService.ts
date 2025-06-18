import { 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createModerationNotification } from './notificationService';

export enum ModerationType {
  WARNING = 'warning',
  BLOCK = 'block',
  POST_DELETION = 'post_deletion',
  COMMENT_DELETION = 'comment_deletion',
  UNBLOCK = 'unblock'
}

export interface ModerationAction {
  id?: string;
  type: ModerationType;
  userId: string;
  adminId: string;
  adminName: string;
  reason: string;
  contentId?: string;
  contentSnapshot?: any;
  createdAt?: any;
  expiresAt?: any;
  read?: boolean;
}

/**
 * Блокирует пользователя
 * @param userId ID пользователя для блокировки
 * @param adminId ID администратора
 * @param adminName Имя администратора
 * @param reason Причина блокировки
 * @param duration Продолжительность блокировки в днях (0 для постоянной блокировки)
 * @returns ID записи о блокировке
 */
export const blockUser = async (
  userId: string,
  adminId: string,
  adminName: string,
  reason: string,
  duration: number = 0
): Promise<string> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const userData = userDoc.data();
    if (userData.isAdmin) {
      throw new Error('Нельзя заблокировать администратора');
    }
    
    await updateDoc(userRef, {
      blocked: true,
      blockedAt: serverTimestamp(),
      blockedBy: adminId,
      blockedReason: reason,
      blockedUntil: duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
      adminName: adminName
    });
    
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);
    const adminPhotoURL = adminDoc.exists() ? adminDoc.data().photoURL : null;
    
    const blockAction: ModerationAction = {
      type: ModerationType.BLOCK,
      userId,
      adminId,
      adminName,
      reason,
      createdAt: serverTimestamp(),
      expiresAt: duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
      read: false
    };
    
    const actionRef = await addDoc(collection(db, 'moderationActions'), blockAction);
    
    await createModerationNotification(
      userId,
      adminId,
      adminName,
      adminPhotoURL,
      'Ваш аккаунт заблокирован',
      reason,
      duration > 0 ? `Срок блокировки: ${duration} дней` : 'Блокировка постоянная'
    );
    
    return actionRef.id;
  } catch (error) {
    console.error('Ошибка при блокировке пользователя:', error);
    throw error;
  }
};

/**
 * Разблокирует пользователя
 * @param userId ID пользователя для разблокировки
 * @param adminId ID администратора
 * @param adminName Имя администратора
 * @param reason Причина разблокировки
 * @returns ID записи о разблокировке
 */
export const unblockUser = async (
  userId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<string> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    await updateDoc(userRef, {
      blocked: false,
      blockedAt: null,
      blockedBy: null,
      blockedReason: null,
      blockedUntil: null
    });
    
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);
    const adminPhotoURL = adminDoc.exists() ? adminDoc.data().photoURL : null;
    
    const unblockAction: ModerationAction = {
      type: ModerationType.UNBLOCK,
      userId,
      adminId,
      adminName,
      reason,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const actionRef = await addDoc(collection(db, 'moderationActions'), unblockAction);
    
    await createModerationNotification(
      userId,
      adminId,
      adminName,
      adminPhotoURL,
      'Ваш аккаунт разблокирован',
      reason,
      ''
    );
    
    return actionRef.id;
  } catch (error) {
    console.error('Ошибка при разблокировке пользователя:', error);
    throw error;
  }
};

/**
 * Отправляет предупреждение пользователю
 * @param userId ID пользователя для предупреждения
 * @param adminId ID администратора
 * @param adminName Имя администратора
 * @param reason Причина предупреждения
 * @returns ID записи о предупреждении
 */
export const warnUser = async (
  userId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<string> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const userData = userDoc.data();
    if (userData.isAdmin) {
      throw new Error('Нельзя отправить предупреждение администратору');
    }
    
    const warnings = userData.warnings || 0;
    await updateDoc(userRef, {
      warnings: warnings + 1,
      lastWarningAt: serverTimestamp(),
      lastWarningBy: adminId,
      lastWarningReason: reason
    });
    
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);
    const adminPhotoURL = adminDoc.exists() ? adminDoc.data().photoURL : null;
    
    const warnAction: ModerationAction = {
      type: ModerationType.WARNING,
      userId,
      adminId,
      adminName,
      reason,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const actionRef = await addDoc(collection(db, 'moderationActions'), warnAction);
    
    await createModerationNotification(
      userId,
      adminId,
      adminName,
      adminPhotoURL,
      'Вы получили предупреждение',
      reason,
      'Повторные нарушения могут привести к блокировке аккаунта'
    );
    
    return actionRef.id;
  } catch (error) {
    console.error('Ошибка при отправке предупреждения пользователю:', error);
    throw error;
  }
};

/**
 * Удаляет пост с указанием причины
 * @param postId ID поста для удаления
 * @param adminId ID администратора
 * @param adminName Имя администратора
 * @param reason Причина удаления
 * @returns ID записи об удалении
 */
export const deletePostWithReason = async (
  postId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<string> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Пост не найден');
    }
    
    const postData = postDoc.data();
    const authorId = postData.authorId;
    
    const userRef = doc(db, 'users', authorId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Автор поста не найден');
    }
    
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);
    const adminPhotoURL = adminDoc.exists() ? adminDoc.data().photoURL : null;
    
    const postContent = postData.content ? 
      (postData.content.length > 50 ? `${postData.content.substring(0, 50)}...` : postData.content) : 
      'содержимое недоступно';
    
    const deleteAction: ModerationAction = {
      type: ModerationType.POST_DELETION,
      userId: authorId,
      adminId,
      adminName,
      reason,
      contentId: postId,
      contentSnapshot: postData,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const actionRef = await addDoc(collection(db, 'moderationActions'), deleteAction);
    
    await createModerationNotification(
      authorId,
      adminId,
      adminName,
      adminPhotoURL,
      `Ваш пост был удален администратором`,
      reason,
      `Текст поста: "${postContent}". Повторные нарушения могут привести к блокировке аккаунта.`
    );
    
    await deleteDoc(postRef);
    
    return actionRef.id;
  } catch (error) {
    console.error('Ошибка при удалении поста с указанием причины:', error);
    throw error;
  }
};

/**
 * Удаляет комментарий с указанием причины
 * @param commentId ID комментария для удаления
 * @param adminId ID администратора
 * @param adminName Имя администратора
 * @param reason Причина удаления
 * @returns ID записи об удалении
 */
export const deleteCommentWithReason = async (
  commentId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<string> => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);
    
    if (!commentDoc.exists()) {
      throw new Error('Комментарий не найден');
    }
    
    const commentData = commentDoc.data();
    const authorId = commentData.authorId;
    
    const userRef = doc(db, 'users', authorId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Автор комментария не найден');
    }
    
    const adminRef = doc(db, 'users', adminId);
    const adminDoc = await getDoc(adminRef);
    const adminPhotoURL = adminDoc.exists() ? adminDoc.data().photoURL : null;
    
    const commentContent = commentData.text ? 
      (commentData.text.length > 50 ? `${commentData.text.substring(0, 50)}...` : commentData.text) : 
      'содержимое недоступно';
    
    const deleteAction: ModerationAction = {
      type: ModerationType.COMMENT_DELETION,
      userId: authorId,
      adminId,
      adminName,
      reason,
      contentId: commentId,
      contentSnapshot: commentData,
      createdAt: serverTimestamp(),
      read: false
    };
    
    const actionRef = await addDoc(collection(db, 'moderationActions'), deleteAction);
    
    await createModerationNotification(
      authorId,
      adminId,
      adminName,
      adminPhotoURL,
      'Ваш комментарий был удален администратором',
      reason,
      `Текст комментария: "${commentContent}". Повторные нарушения могут привести к блокировке аккаунта.`
    );
    
    await deleteDoc(commentRef);
    
    return actionRef.id;
  } catch (error) {
    console.error('Ошибка при удалении комментария с указанием причины:', error);
    throw error;
  }
};

/**
 * Получает историю модерационных действий для пользователя
 * @param userId ID пользователя
 * @returns Массив модерационных действий
 * 
 */
export const getUserModerationHistory = async (userId: string): Promise<ModerationAction[]> => {
  try {
    const actionsRef = collection(db, 'moderationActions');
    const actionsQuery = query(
      actionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const actionsSnapshot = await getDocs(actionsQuery);
    
    return actionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ModerationAction[];
  } catch (error) {
    console.error('Ошибка при получении истории модерации пользователя:', error);
    throw error;
  }
};
