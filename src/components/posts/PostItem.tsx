import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { HeartIcon, ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import CommentSection from './CommentSection';
import Image from '../common/Image';
import { createLikeNotification } from '../../services/notificationService';
import { isVideo } from '../../services/fileService';
import { Post, getPostById } from '../../services/postService';
import { deletePostWithReason } from '../../services/moderationService';

interface PostItemProps {
  post?: Post;
}

const PostItem = ({ post: propPost }: PostItemProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData, isAdmin } = useAuth();
  const [post, setPost] = useState<Post | null>(propPost || null);
  const [loading, setLoading] = useState(!propPost);
  const [error, setError] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<number | null>(null);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationInProgress, setModerationInProgress] = useState(false);

  useEffect(() => {
    if (propPost) {
      setPost(propPost);
      setIsLiked(currentUser ? propPost.likes.includes(currentUser.uid) : false);
      setLikesCount(propPost.likes.length);
      return;
    }
    
    if (!id) {
      setError('Пост не найден');
      return;
    }
    
    const fetchPost = async () => {
      setLoading(true);
      
      try {
        const postData = await getPostById(id);
        
        if (postData) {
          setPost(postData);
          const userLiked = currentUser ? postData.likes.includes(currentUser.uid) : false;
          setIsLiked(userLiked);
          setLikesCount(postData.likes.length);
        } else {
          setError('Пост не найден');
        }
      } catch (err) {
        console.error('Ошибка при загрузке поста:', err);
        setError('Не удалось загрузить пост');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id, propPost, currentUser]);

  const getPostFiles = () => {
    if (!post) return [];
    
    if (post.fileUrls && post.fileTypes) {
      return post.fileUrls.map((url, index) => ({
        url,
        type: post.fileTypes?.[index] || ''
      }));
    } else if (post.fileUrls) {
      return post.fileUrls.map(url => ({
        url,
        type: url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov') 
          ? 'video/mp4' 
          : 'image/jpeg'
      }));
    } else if (post.imageUrls) {
      return post.imageUrls.map(url => ({
        url,
        type: 'image/jpeg'
      }));
    } else if (post.attachments) {
      return post.attachments.map(url => ({
        url,
        type: 'image/jpeg'
      }));
    }
    return [];
  };

  const files = getPostFiles();

  const toggleLike = async () => {
    if (!currentUser || !userData || !post) return;
    
    const postRef = doc(db, 'posts', post.id);
    
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid)
        });
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid)
        });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        
        if (post.authorId !== currentUser.uid) {
          try {
            await createLikeNotification(
              currentUser.uid,
              userData.displayName || 'Пользователь',
              userData.photoURL,
              post.authorId,
              post.id
            );
          } catch (error) {
            console.error('Ошибка при создании уведомления о лайке:', error);
          }
        }
      }
      
      const updatedPostDoc = await getDoc(postRef);
      if (updatedPostDoc.exists()) {
      }
    } catch (error) {
      console.error('Ошибка при обновлении лайка:', error);
      alert('Не удалось обновить лайк. Пожалуйста, попробуйте снова.');
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const formatDate = (date: any) => {
    try {
      if (!date) {
        return 'Недавно';
      }
      
      if (date && typeof date.toDate === 'function') {
        return formatDistanceToNow(date.toDate(), { addSuffix: true, locale: ru });
      }
      
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return formatDistanceToNow(parsedDate, { addSuffix: true, locale: ru });
        }
      }
      
      if (date instanceof Date && !isNaN(date.getTime())) {
        return formatDistanceToNow(date, { addSuffix: true, locale: ru });
      }
      
      return 'Недавно';
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'Недавно';
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser || !post) return;
    
    const canDelete = currentUser.uid === post.authorId || isAdmin;
    
    if (!canDelete) return;
    
    if (isAdmin && currentUser.uid !== post.authorId) {
      setShowModerationDialog(true);
      return;
    }

    if (window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      try {
        setIsDeleting(true);
        
        if (isAdmin && currentUser.uid === post.authorId) {
          await deletePostWithReason(
            post.id,
            currentUser.uid,
            userData?.displayName || 'Администратор',
            'Удалено автором (администратором)'
          );
        } else {
          await deleteDoc(doc(db, 'posts', post.id));
        }
        
        setIsDeleted(true);
        
        if (id) {
          navigate('/');
        }
      } catch (error) {
        console.error('Ошибка при удалении поста:', error);
        alert('Не удалось удалить пост. Пожалуйста, попробуйте снова.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const handleModeratePost = async () => {
    if (!currentUser || !post || !isAdmin) return;
    
    if (!moderationReason.trim()) {
      alert('Пожалуйста, укажите причину удаления поста.');
      return;
    }
    
    try {
      setModerationInProgress(true);
      
      await deletePostWithReason(
        post.id,
        currentUser.uid,
        userData?.displayName || 'Администратор',
        moderationReason.trim()
      );
      
      setIsDeleted(true);
      setShowModerationDialog(false);
      
      if (id) {
        navigate('/');
      }
    } catch (error) {
      console.error('Ошибка при модерации поста:', error);
      alert('Не удалось удалить пост. Пожалуйста, попробуйте снова.');
    } finally {
      setModerationInProgress(false);
    }
  };

  const handleMediaClick = (index: number) => {
    setExpandedMedia(expandedMedia === index ? null : index);
  };

  if (isDeleted) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-800">
        Пост был удален.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{error || 'Пост не найден'}</h2>
          <p className="text-gray-600 mb-4">
            Не удалось загрузить запрошенный пост.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  const containerClass = id 
    ? "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10" 
    : "";

  return (
    <div className={containerClass}>
      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="p-4 flex items-center space-x-3">
          <Link to={`/profile/${post.authorId}`}>
            {post.authorPhotoURL ? (
              <img 
                src={post.authorPhotoURL} 
                alt={post.authorName} 
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-bold">
                  {post.authorName?.charAt(0)}
                </span>
              </div>
            )}
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${post.authorId}`} className="font-medium text-gray-900 hover:underline">
              {post.authorName}
            </Link>
            <p className="text-xs text-gray-500">
              {post.createdAt ? formatDate(post.createdAt) : 'Недавно'}
            </p>
          </div>
          {currentUser && (currentUser.uid === post.authorId || isAdmin) && (
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-500"
              title={isAdmin && currentUser.uid !== post.authorId ? "Модерировать пост" : "Удалить пост"}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
        </div>

        {files.length > 0 && (
          <div className={`${files.length === 1 ? '' : 'grid grid-cols-2'} gap-1`}>
            {files.map((file, index) => (
              <div 
                key={index} 
                className={`relative ${
                  files.length === 1 ? 'w-full' : 
                  index === 0 && files.length === 3 ? 'col-span-2' : ''
                }`}
                onClick={() => handleMediaClick(index)}
              >
                {file.type.startsWith('image/') || (!file.type.startsWith('video/') && !isVideo(file.type)) ? (
                  <Image 
                    src={file.url} 
                    alt={`Post attachment ${index + 1}`} 
                    className={`w-full ${expandedMedia === index ? 'h-auto max-h-[600px]' : 'h-80'} object-cover cursor-pointer transition-all duration-300`}
                    fallback="/placeholder-image.jpg"
                  />
                ) : isVideo(file.type) ? (
                  <div className="relative h-80 w-full bg-gray-100">
                    <video 
                      src={file.url} 
                      className="h-full w-full object-contain" 
                      controls
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      Видео
                    </div>
                  </div>
                ) : (
                  <div className="h-80 w-full bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="bg-gray-200 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Открыть файл
                      </a>
                    </div>
                  </div>
                )}
                {expandedMedia === index && (
                  <div 
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMedia(null);
                    }}
                  >
                    ✕
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 flex space-x-6">
          <button 
            onClick={toggleLike}
            className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
          >
            {isLiked ? (
              <HeartIconSolid className="h-5 w-5" />
            ) : (
              <HeartIcon className="h-5 w-5" />
            )}
            <span>{likesCount}</span>
          </button>
          <button 
            onClick={toggleComments}
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span>{post.commentsCount || post.comments || 0}</span>
          </button>

        </div>

        {showComments && (
          <div className="border-t border-gray-200">
            <CommentSection postId={post.id} />
          </div>
        )}
      </div>

      {showModerationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Модерация поста</h3>
            
            <p className="text-gray-600 mb-4">
              Пожалуйста, укажите причину удаления поста. Эта причина будет отправлена автору поста.
            </p>
            
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:ring-indigo-500 focus:border-indigo-500"
              rows={6}
              placeholder="Причина удаления поста..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              autoFocus
            ></textarea>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModerationDialog(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={moderationInProgress}
              >
                Отмена
              </button>
              <button
                onClick={handleModeratePost}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={moderationInProgress || !moderationReason.trim()}
              >
                {moderationInProgress ? 'Удаление...' : 'Удалить пост'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostItem; 