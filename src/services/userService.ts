import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  getDoc, 
  doc
} from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  bio?: string;
  followers?: string[];
  following?: string[];
  isAdmin?: boolean;
  approved?: boolean;
  createdAt?: string;
  id?: string;
}

export const getUserById = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('Пользователь не найден');
    }
    
    const userData = userDoc.data();
    return { 
      id: userDoc.id, 
      uid: userData.uid,
      displayName: userData.displayName,
      email: userData.email,
      photoURL: userData.photoURL,
      bio: userData.bio,
      followers: userData.followers,
      following: userData.following,
      isAdmin: userData.isAdmin,
      approved: userData.approved,
      createdAt: userData.createdAt
    } as User;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    throw error;
  }
};

export const searchUsers = async (searchTerm: string) => {
  try {
    const usersRef = collection(db, 'users');
    
    const usersQuery = query(usersRef, limit(100));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      return [];
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const filteredUsers = usersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL,
          bio: data.bio,
          followers: data.followers,
          following: data.following,
          isAdmin: data.isAdmin,
          approved: data.approved,
          createdAt: data.createdAt
        } as User;
      })
      .filter(user => 
        user.displayName?.toLowerCase().includes(searchTermLower) ||
        user.email?.toLowerCase().includes(searchTermLower)
      );
    
    return filteredUsers;
  } catch (error) {
    console.error('Ошибка при поиске пользователей:', error);
    throw error;
  }
};

export const getUserFollowers = async (userId: string) => {
  try {
    const followersRef = collection(db, 'followers');
    const followersQuery = query(
      followersRef,
      where('followingId', '==', userId)
    );
    
    const followersSnapshot = await getDocs(followersQuery);
    const followerIds = followersSnapshot.docs.map(doc => doc.data().followerId);
    
    if (followerIds.length === 0) {
      return [];
    }
    
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('uid', 'in', followerIds)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    return usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        bio: data.bio,
        followers: data.followers,
        following: data.following,
        isAdmin: data.isAdmin,
        approved: data.approved,
        createdAt: data.createdAt
      } as User;
    });
  } catch (error) {
    console.error('Ошибка при получении подписчиков:', error);
    throw error;
  }
};

export const getUserFollowing = async (userId: string) => {
  try {
    const followingRef = collection(db, 'followers');
    const followingQuery = query(
      followingRef,
      where('followerId', '==', userId)
    );
    
    const followingSnapshot = await getDocs(followingQuery);
    const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);
    
    if (followingIds.length === 0) {
      return [];
    }
    
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('uid', 'in', followingIds)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    return usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        bio: data.bio,
        followers: data.followers,
        following: data.following,
        isAdmin: data.isAdmin,
        approved: data.approved,
        createdAt: data.createdAt
      } as User;
    });
  } catch (error) {
    console.error('Ошибка при получении подписок:', error);
    throw error;
  }
}; 