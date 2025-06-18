import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

/**
 * Создает приватный чат между двумя пользователями
 * @param currentUserId ID текущего пользователя
 * @param otherUserId ID другого пользователя
 * @returns ID созданного чата
 */
export const createPrivateChat = async (currentUserId: string, otherUserId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId),
      where('type', '==', ChatType.PRIVATE)
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    const existingChat = chatsSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(otherUserId);
    });
    
    if (existingChat) {
      return existingChat.id;
    }
    
    const newChatRef = doc(collection(db, 'chats'));
    await setDoc(newChatRef, {
      type: ChatType.PRIVATE,
      participants: [currentUserId, otherUserId],
      createdAt: serverTimestamp(),
      lastMessage: {
        text: '',
        senderId: '',
        timestamp: serverTimestamp()
      }
    });
    
    return newChatRef.id;
  } catch (error) {
    console.error('Ошибка при создании приватного чата:', error);
    throw error;
  }
};

/**
 * Создает групповой чат
 * @param currentUserId ID создателя чата
 * @param name Название группового чата
 * @param participants Массив ID участников (включая создателя)
 * @param photoURL Опциональная ссылка на аватар группы
 * @returns ID созданного группового чата
 */
export const createGroupChat = async (
  currentUserId: string, 
  name: string, 
  participants: string[], 
  photoURL?: string
) => {
  try {
    if (!participants.includes(currentUserId)) {
      participants.push(currentUserId);
    }
    
    const newChatRef = doc(collection(db, 'chats'));
    await setDoc(newChatRef, {
      type: ChatType.GROUP,
      name,
      photoURL: photoURL || null,
      participants,
      admins: [currentUserId],
      createdAt: serverTimestamp(),
      createdBy: currentUserId,
      lastMessage: {
        text: '',
        senderId: '',
        timestamp: serverTimestamp()
      }
    });
    
    await addDoc(collection(db, 'messages'), {
      chatId: newChatRef.id,
      text: `${name} создан`,
      senderId: 'system',
      timestamp: serverTimestamp(),
      isSystemMessage: true,
      read: true
    });
    
    return newChatRef.id;
  } catch (error) {
    console.error('Ошибка при создании группового чата:', error);
    throw error;
  }
};

/**
 * Добавляет пользователя в групповой чат
 * @param chatId ID группового чата
 * @param userId ID пользователя для добавления
 * @param addedByUserId ID пользователя, который добавляет
 */
export const addUserToGroupChat = async (
  chatId: string,
  userId: string,
  addedByUserId: string
) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data();
    
    if (chatData.type !== ChatType.GROUP) {
      throw new Error('Это не групповой чат');
    }
    
    if (!chatData.admins.includes(addedByUserId)) {
      throw new Error('У вас нет прав для добавления участников');
    }
    
    if (chatData.participants.includes(userId)) {
      throw new Error('Пользователь уже в чате');
    }
    
    await updateDoc(chatRef, {
      participants: arrayUnion(userId)
    });
    
    const addedUserDoc = await getDoc(doc(db, 'users', userId));
    const addedByUserDoc = await getDoc(doc(db, 'users', addedByUserId));
    
    const addedUserName = addedUserDoc.exists() ? addedUserDoc.data().displayName || 'Пользователь' : 'Пользователь';
    const addedByUserName = addedByUserDoc.exists() ? addedByUserDoc.data().displayName || 'Пользователь' : 'Пользователь';
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: `${addedByUserName} добавил(а) ${addedUserName} в чат`,
      senderId: 'system',
      timestamp: serverTimestamp(),
      isSystemMessage: true,
      read: true
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при добавлении пользователя в групповой чат:', error);
    throw error;
  }
};

/**
 * Удаляет пользователя из группового чата
 * @param chatId ID группового чата
 * @param userId ID пользователя для удаления
 * @param removedByUserId ID пользователя, который удаляет (или сам userId при выходе)
 * @param isLeaving true если пользователь покидает чат сам
 */
export const removeUserFromGroupChat = async (
  chatId: string,
  userId: string,
  removedByUserId: string,
  isLeaving = false
) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data();
    
    if (chatData.type !== ChatType.GROUP) {
      throw new Error('Это не групповой чат');
    }
    
    if (userId !== removedByUserId && !chatData.admins.includes(removedByUserId)) {
      throw new Error('У вас нет прав для удаления участников');
    }
    
    if (!chatData.participants.includes(userId)) {
      throw new Error('Пользователь не является участником чата');
    }
    
    await updateDoc(chatRef, {
      participants: arrayRemove(userId)
    });
    
    if (chatData.admins.includes(userId)) {
      await updateDoc(chatRef, {
        admins: arrayRemove(userId)
      });
    }
    
    const removedUserDoc = await getDoc(doc(db, 'users', userId));
    const removedByUserDoc = await getDoc(doc(db, 'users', removedByUserId));
    
    const removedUserName = removedUserDoc.exists() ? removedUserDoc.data().displayName || 'Пользователь' : 'Пользователь';
    const removedByUserName = removedByUserDoc.exists() ? removedByUserDoc.data().displayName || 'Пользователь' : 'Пользователь';
    
    let messageText = '';
    if (isLeaving) {
      messageText = `${removedUserName} покинул(а) чат`;
    } else {
      messageText = `${removedByUserName} удалил(а) ${removedUserName} из чата`;
    }
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: messageText,
      senderId: 'system',
      timestamp: serverTimestamp(),
      isSystemMessage: true,
      read: true
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при удалении пользователя из группового чата:', error);
    throw error;
  }
};

/**
 * Назначает пользователя администратором группового чата
 * @param chatId ID группового чата
 * @param userId ID пользователя для назначения администратором
 * @param adminId ID администратора, который назначает
 */
export const makeUserAdmin = async (
  chatId: string,
  userId: string,
  adminId: string
) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data();
    
    if (chatData.type !== ChatType.GROUP) {
      throw new Error('Это не групповой чат');
    }
    
    if (!chatData.admins.includes(adminId)) {
      throw new Error('У вас нет прав для назначения администраторов');
    }
    
    if (!chatData.participants.includes(userId)) {
      throw new Error('Пользователь не является участником чата');
    }
    
    if (chatData.admins.includes(userId)) {
      throw new Error('Пользователь уже является администратором');
    }
    
    await updateDoc(chatRef, {
      admins: arrayUnion(userId)
    });
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    const adminDoc = await getDoc(doc(db, 'users', adminId));
    
    const userName = userDoc.exists() ? userDoc.data().displayName || 'Пользователь' : 'Пользователь';
    const adminName = adminDoc.exists() ? adminDoc.data().displayName || 'Пользователь' : 'Пользователь';
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: `${adminName} назначил(а) ${userName} администратором`,
      senderId: 'system',
      timestamp: serverTimestamp(),
      isSystemMessage: true,
      read: true
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при назначении администратора группового чата:', error);
    throw error;
  }
};

/**
 * Обновляет информацию о групповом чате
 * @param chatId ID группового чата
 * @param adminId ID администратора, который обновляет информацию
 * @param updates Объект с обновлениями (name и/или photoURL)
 */
export const updateGroupChat = async (
  chatId: string,
  adminId: string,
  updates: { name?: string; photoURL?: string }
) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    const chatData = chatDoc.data();
    
    if (chatData.type !== ChatType.GROUP) {
      throw new Error('Это не групповой чат');
    }
    
    if (!chatData.admins.includes(adminId)) {
      throw new Error('У вас нет прав для обновления информации о чате');
    }
    
    const updateData: { name?: string; photoURL?: string } = {};
    let systemMessage = '';
    
    if (updates.name && updates.name !== chatData.name) {
      updateData.name = updates.name;
      systemMessage = `Название чата изменено на "${updates.name}"`;
    }
    
    if (updates.photoURL !== undefined) {
      updateData.photoURL = updates.photoURL;
      if (!systemMessage) {
        systemMessage = 'Аватар чата был обновлен';
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return false;
    }
    
    await updateDoc(chatRef, updateData);
    
    const adminDoc = await getDoc(doc(db, 'users', adminId));
    const adminName = adminDoc.exists() ? adminDoc.data().displayName || 'Пользователь' : 'Пользователь';
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      text: `${adminName} ${systemMessage}`,
      senderId: 'system',
      timestamp: serverTimestamp(),
      isSystemMessage: true,
      read: true
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении информации о групповом чате:', error);
    throw error;
  }
};

/**
 * Получает информацию о чате
 * @param chatId ID чата
 * @returns Данные чата
 */
export const getChatInfo = async (chatId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Чат не найден');
    }
    
    return {
      id: chatDoc.id,
      ...chatDoc.data()
    };
  } catch (error) {
    console.error('Ошибка при получении информации о чате:', error);
    throw error;
  }
};

/**
 * Получает список чатов пользователя
 * @param userId ID пользователя
 * @returns Массив чатов пользователя
 */
export const getUserChats = async (userId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessage.timestamp', 'desc')
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    return chatsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Ошибка при получении списка чатов пользователя:', error);
    throw error;
  }
};

export default {
  createPrivateChat,
  createGroupChat,
  addUserToGroupChat,
  removeUserFromGroupChat,
  makeUserAdmin,
  updateGroupChat,
  getChatInfo,
  getUserChats,
  ChatType
}; 