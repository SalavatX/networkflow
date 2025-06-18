import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  likes: string[];
  comments: number;
  commentsCount: number;
  tags: string[];
  attachments?: string[];
  imageUrls?: string[];
  fileUrls?: string[];
  fileTypes?: string[];
}

export const getPostById = async (postId: string): Promise<Post | null> => {
  try {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    
    if (postDoc.exists()) {
      return { id: postDoc.id, ...postDoc.data() } as Post;
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка при получении поста по ID:', error);
    throw error;
  }
};

export const getPosts = async (lastVisible: QueryDocumentSnapshot<DocumentData> | null = null, postsPerPage = 10) => {
  try {
    let postsQuery;
    
    if (lastVisible) {
      postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(postsPerPage)
      );
    } else {
      postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(postsPerPage)
      );
    }
    
    const postsSnapshot = await getDocs(postsQuery);
    const lastVisibleDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];
    
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
    
    return { posts, lastVisibleDoc };
  } catch (error) {
    console.error('Ошибка при получении постов:', error);
    throw error;
  }
};

export const searchPostsByTag = async (tag: string) => {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      where('tags', 'array-contains', tag.toLowerCase()),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    
    return postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
  } catch (error) {
    console.error('Ошибка при поиске постов по тегу:', error);
    throw error;
  }
};

export const getPopularTags = async (tagsLimit = 10) => {
  try {
    const tagsRef = collection(db, 'tags');
    const tagsQuery = query(
      tagsRef,
      orderBy('count', 'desc'),
      limit(tagsLimit)
    );
    
    const tagsSnapshot = await getDocs(tagsQuery);
    
    return tagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Ошибка при получении популярных тегов:', error);
    throw error;
  }
};

export const filterPosts = async (filters: {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  authorId?: string;
  popular?: boolean;
  withAttachments?: boolean;
  limit?: number;
}) => {
  try {
    let postsRef = collection(db, 'posts');
    let constraints: any[] = [];
    
    if (filters.dateFrom) {
      constraints.push(where('createdAt', '>=', filters.dateFrom.toISOString()));
    }
    
    if (filters.dateTo) {
      constraints.push(where('createdAt', '<=', filters.dateTo.toISOString()));
    }
    
    if (filters.authorId) {
      constraints.push(where('authorId', '==', filters.authorId));
    }
    
    if (filters.popular) {
      constraints.push(orderBy('createdAt', 'desc'));
    } else {
      constraints.push(orderBy('createdAt', 'desc'));
    }
    
    constraints.push(limit(filters.limit || 20));
    
    const postsQuery = query(postsRef, ...constraints);
    const postsSnapshot = await getDocs(postsQuery);
    
    let posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
    
    if (filters.withAttachments) {
      posts = posts.filter(post => {
        const hasAttachments = post.attachments && post.attachments.length > 0;
        const hasImageUrls = post.imageUrls && post.imageUrls.length > 0;
        const hasFileUrls = post.fileUrls && post.fileUrls.length > 0;
        return hasAttachments || hasImageUrls || hasFileUrls;
      });
    }
    
    if (filters.popular) {
      posts.sort((a, b) => {
        const likesA = a.likes ? a.likes.length : 0;
        const likesB = b.likes ? b.likes.length : 0;
        return likesB - likesA;
      });
    }
    
    return posts;
  } catch (error) {
    console.error('Ошибка при фильтрации постов:', error);
    throw error;
  }
}; 