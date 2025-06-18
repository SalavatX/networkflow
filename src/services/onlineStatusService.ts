import { doc, setDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ONLINE_THRESHOLD = 5 * 60 * 1000;

/**
 * Устанавливает пользователя как онлайн
 * @param userId ID пользователя
 */
export const setUserOnline = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await setDoc(userStatusRef, {
      online: true,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Ошибка при установке статуса онлайн:', error);
  }
};

/**
 * Устанавливает пользователя как оффлайн
 * @param userId ID пользователя
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await setDoc(userStatusRef, {
      online: false,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Ошибка при установке статуса оффлайн:', error);
  }
};

interface UserStatus {
  online: boolean;
  lastSeen: any;
}

/**
 * Получает текущий онлайн-статус пользователя
 * @param userId ID пользователя
 * @returns Объект с информацией о статусе
 */
export const getUserOnlineStatus = async (userId: string): Promise<UserStatus> => {
  if (!userId) return { online: false, lastSeen: null };
  
  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    const userStatusDoc = await getDoc(userStatusRef);
    
    if (userStatusDoc.exists()) {
      const data = userStatusDoc.data();
      if (data.lastSeen) {
        const lastSeenDate = data.lastSeen.toDate();
        const now = new Date();
        const isRecent = now.getTime() - lastSeenDate.getTime() < ONLINE_THRESHOLD;
        
        return {
          online: data.online && isRecent,
          lastSeen: data.lastSeen
        };
      }
      return { online: data.online, lastSeen: data.lastSeen };
    }
    
    return { online: false, lastSeen: null };
  } catch (error) {
    console.error('Ошибка при получении статуса пользователя:', error);
    return { online: false, lastSeen: null };
  }
};

/**
 * Подписывается на изменения статуса пользователя
 * @param userId ID пользователя
 * @param callback Функция, вызываемая при изменении статуса
 * @returns Функция для отписки
 */
export const subscribeToUserStatus = (
  userId: string, 
  callback: (status: UserStatus) => void
): (() => void) => {
  if (!userId) return () => {};
  
  const userStatusRef = doc(db, 'userStatus', userId);
  return onSnapshot(userStatusRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      
      if (data.lastSeen) {
        const lastSeenDate = data.lastSeen.toDate();
        const now = new Date();
        const isRecent = now.getTime() - lastSeenDate.getTime() < ONLINE_THRESHOLD;
        
        callback({
          online: data.online && isRecent,
          lastSeen: data.lastSeen
        });
      } else {
        callback({ online: data.online, lastSeen: data.lastSeen });
      }
    } else {
      callback({ online: false, lastSeen: null });
    }
  });
};

export default {
  setUserOnline,
  setUserOffline,
  getUserOnlineStatus,
  subscribeToUserStatus
}; 