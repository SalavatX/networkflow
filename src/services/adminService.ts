import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  addDoc 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { emailService } from './emailService';

export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    throw error;
  }
};

export const getPendingUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const pendingQuery = query(
      usersRef,
      where('approved', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const pendingSnapshot = await getDocs(pendingQuery);
    
    return pendingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Ошибка при получении ожидающих пользователей:', error);
    throw error;
  }
};

export const approveUser = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const userData = userSnap.data();
    
    await updateDoc(userRef, {
      approved: true
    });
    
    await createApprovalNotification(userId);
    
    if (userData.email) {
      try {
        console.log(`Отправка уведомления о подтверждении на email: ${userData.email}`);
        
        const subject = 'Ваша учетная запись подтверждена';
        const message = 'Мы рады сообщить, что администратор подтвердил вашу учетную запись. Теперь вы можете полноценно использовать нашу корпоративную социальную сеть. Вы можете войти в систему, используя свой email и пароль.';
        
        const result = await emailService.sendEmail(userData.email, subject, message, 'Администратор');
        
        if (result) {
          console.log(`✅ Email уведомление успешно отправлено пользователю ${userData.email}`);
        } else {
          console.warn(`⚠️ Не удалось отправить email уведомление пользователю ${userData.email}`);
        }
      } catch (emailError) {
        console.error('❌ Ошибка при отправке email:', emailError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при подтверждении пользователя:', error);
    throw error;
  }
};

export const rejectUser = async (userId: string) => {
  try {
    const functions = getFunctions();
    const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');
    await deleteUserAuth({ userId });
    
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    
    return true;
  } catch (error) {
    console.error('Ошибка при отклонении пользователя:', error);
    throw error;
  }
};


export const deleteUser = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const userData = userSnap.data();
    
    try {
      const functions = getFunctions();
      const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');
      await deleteUserAuth({ userId });
    } catch (authError) {
      console.error('Ошибка при удалении пользователя из Auth:', authError);
    }
    
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, where('authorId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);
    
    const deletePosts = postsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePosts);
    
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(commentsRef, where('authorId', '==', userId));
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const deleteComments = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteComments);
    
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef, 
      where('recipientId', '==', userId)
    );
    const notificationsSnapshot = await getDocs(notificationsQuery);
    
    const deleteNotifications = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteNotifications);
    
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('participants', 'array-contains', userId)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    
    const deleteChats = chatsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteChats);
    
    await deleteDoc(userRef);
    
    return {
      success: true,
      message: `Пользователь ${userData.displayName || userData.email || userId} успешно удален`
    };
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    throw error;
  }
};

export const toggleAdminRole = async (userId: string, isAdmin: boolean) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isAdmin
    });
    
    return true;
  } catch (error) {
    console.error('Ошибка при изменении роли администратора:', error);
    throw error;
  }
};

export const getPlatformStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;
    
    const pendingQuery = query(usersRef, where('approved', '==', false));
    const pendingSnapshot = await getDocs(pendingQuery);
    const pendingUsers = pendingSnapshot.size;
    
    const adminsQuery = query(usersRef, where('isAdmin', '==', true));
    const adminsSnapshot = await getDocs(adminsQuery);
    const totalAdmins = adminsSnapshot.size;
    
    const postsRef = collection(db, 'posts');
    const postsSnapshot = await getDocs(postsRef);
    const totalPosts = postsSnapshot.size;
    
    const messagesRef = collection(db, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    const totalMessages = messagesSnapshot.size;
    
    return {
      totalUsers,
      pendingUsers,
      totalAdmins,
      totalPosts,
      totalMessages
    };
  } catch (error) {
    console.error('Ошибка при получении статистики платформы:', error);
    throw error;
  }
};

const createApprovalNotification = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const notificationsRef = collection(db, 'notifications');
    const newNotification = {
      type: 'system',
      senderId: 'system',
      senderName: 'Система',
      senderPhotoURL: null,
      recipientId: userId,
      message: 'Ваш аккаунт подтвержден администратором. Добро пожаловать в корпоративную сеть!',
      createdAt: new Date(),
      read: false
    };
    
    await addDoc(notificationsRef, newNotification);
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
  }
}; 