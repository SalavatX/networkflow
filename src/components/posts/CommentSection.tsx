import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { TrashIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { createCommentNotification } from '../../services/notificationService';
import { deleteCommentWithReason } from '../../services/moderationService';

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  createdAt: { toDate: () => Date };
}

interface CommentSectionProps {
  postId: string;
}

const CommentSection = ({ postId }: CommentSectionProps) => {
  const { currentUser, userData, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [postAuthorId, setPostAuthorId] = useState<string | null>(null);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [moderationInProgress, setModerationInProgress] = useState(false);

  useEffect(() => {
    const fetchPostAuthor = async () => {
      try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
          const postData = postDoc.data();
          setPostAuthorId(postData.authorId);
        }
      } catch (error) {
        console.error('Ошибка при получении информации о посте:', error);
      }
    };

    fetchPostAuthor();
  }, [postId]);

  useEffect(() => {
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(
      commentsRef,
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !currentUser || !userData) return;
    
    setLoading(true);
    
    try {
      const commentRef = await addDoc(collection(db, 'comments'), {
        postId,
        text: newComment,
        authorId: currentUser.uid,
        authorName: userData.displayName || 'Пользователь',
        authorPhotoURL: userData.photoURL || '',
        createdAt: serverTimestamp()
      });
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1),
        comments: increment(1)
      });
      
      if (postAuthorId && postAuthorId !== currentUser.uid) {
        try {
          await createCommentNotification(
            currentUser.uid,
            userData.displayName || 'Пользователь',
            userData.photoURL,
            postAuthorId,
            postId,
            commentRef.id,
            newComment
          );
        } catch (error) {
          console.error('Ошибка при создании уведомления о комментарии:', error);
        }
      }
      
      setNewComment('');
    } catch (error) {
      console.error('Ошибка при добавлении комментария:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  };
  
  const handleDeleteComment = async (commentId: string, isUserComment: boolean) => {
    if (!currentUser) return;
    
    if (isAdmin && !isUserComment) {
      setSelectedCommentId(commentId);
      setShowModerationDialog(true);
      return;
    }
    
    try {
      setDeletingCommentId(commentId);
      
      await deleteDoc(doc(db, 'comments', commentId));
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(-1),
        comments: increment(-1)
      });
    } catch (error) {
      console.error('Ошибка при удалении комментария:', error);
      alert('Не удалось удалить комментарий. Пожалуйста, попробуйте снова.');
    } finally {
      setDeletingCommentId(null);
    }
  };
  
  const handleModerateComment = async () => {
    if (!currentUser || !selectedCommentId || !isAdmin) return;
    
    if (!moderationReason.trim()) {
      alert('Пожалуйста, укажите причину удаления комментария.');
      return;
    }
    
    try {
      setModerationInProgress(true);
      
      await deleteCommentWithReason(
        selectedCommentId,
        currentUser.uid,
        userData?.displayName || 'Администратор',
        moderationReason.trim()
      );
      
      setShowModerationDialog(false);
      setSelectedCommentId(null);
      setModerationReason('');
    } catch (error) {
      console.error('Ошибка при модерации комментария:', error);
      alert('Не удалось удалить комментарий. Пожалуйста, попробуйте снова.');
    } finally {
      setModerationInProgress(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Комментарии ({comments.length})</h3>
      
      {currentUser && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              {userData?.photoURL ? (
                <img 
                  src={userData.photoURL} 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-bold">
                    {userData?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                <textarea
                  rows={2}
                  name="comment"
                  id="comment"
                  className="block w-full py-3 border-0 resize-none focus:ring-0 sm:text-sm p-2"
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !newComment.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
      
      {comments.length > 0 ? (
        <ul className="space-y-4">
          {comments.map(comment => {
            const isUserComment = currentUser ? currentUser.uid === comment.authorId : false;
            const canDelete = isUserComment || (isAdmin || false);
            
            return (
              <li key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {comment.authorPhotoURL ? (
                        <img 
                          src={comment.authorPhotoURL} 
                          alt={comment.authorName} 
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-bold">
                            {comment.authorName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{comment.authorName}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(comment.createdAt.toDate())}
                      </div>
                    </div>
                  </div>
                  
                  {canDelete && (
                    <div>
                      {isAdmin && !isUserComment && (
                        <button
                          onClick={() => {
                            setSelectedCommentId(comment.id);
                            setShowModerationDialog(true);
                          }}
                          className="text-yellow-500 hover:text-yellow-600 transition-colors mr-2"
                          disabled={deletingCommentId === comment.id}
                          title="Модерировать комментарий"
                        >
                          <ShieldExclamationIcon className="h-5 w-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteComment(comment.id, isUserComment)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        disabled={deletingCommentId === comment.id}
                        title={isAdmin && !isUserComment ? "Модерировать комментарий" : "Удалить комментарий"}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-700">{comment.text}</div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-4 text-gray-500">
          Нет комментариев. Будьте первым, кто оставит комментарий!
        </div>
      )}
      
      {/* Модерационный диалог */}
      {showModerationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Модерация комментария</h3>
            
            <p className="text-gray-600 mb-4">
              Пожалуйста, укажите причину удаления комментария. Эта причина будет отправлена автору комментария.
            </p>
            
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              placeholder="Причина удаления комментария..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
            ></textarea>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModerationDialog(false);
                  setSelectedCommentId(null);
                  setModerationReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={moderationInProgress}
              >
                Отмена
              </button>
              <button
                onClick={handleModerateComment}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={moderationInProgress || !moderationReason.trim()}
              >
                {moderationInProgress ? 'Удаление...' : 'Удалить комментарий'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection; 