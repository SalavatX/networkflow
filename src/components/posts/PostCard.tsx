import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Post } from '../../services/postService';
import { useAuth } from '../../contexts/AuthContext';
import { isVideo } from '../../services/fileService';

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.likes?.includes(currentUser?.uid || '') || false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${post.authorId}`);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${post.id}?showComments=true`);
  };

  const formatDate = (date: any) => {
    try {
      if (date && typeof date.toDate === 'function') {
        const dateObj = date.toDate();
        return dateObj.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      if (typeof date === 'string') {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return 'Недавно';
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'Недавно';
    }
  };

  const getPostFiles = () => {
    if (post.fileUrls && post.fileTypes?.length) {
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

  return (
    <div 
      className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handlePostClick}
    >
      <div className="p-4 border-b">
        <div className="flex items-center">
          <div className="flex-shrink-0" onClick={handleAuthorClick}>
            {post.authorPhotoURL ? (
              <img 
                src={post.authorPhotoURL} 
                alt={post.authorName} 
                className="h-10 w-10 rounded-full object-cover border-2 border-indigo-50"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-800 font-medium text-sm">
                  {post.authorName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3">
            <p 
              className="text-sm font-medium text-gray-900 hover:text-indigo-600" 
              onClick={handleAuthorClick}
            >
              {post.authorName}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Link
                key={tag}
                to={`/search/tags?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                onClick={(e) => e.stopPropagation()}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        
        {files.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {files.slice(0, 4).map((file, index) => (
                <div key={index} className="relative h-52 rounded-md overflow-hidden">
                  {file.type.startsWith('image/') || (!file.type.startsWith('video/') && !isVideo(file.type)) ? (
                    <img 
                      src={file.url} 
                      alt={`Вложение ${index + 1}`} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex flex-col">
                      <video 
                        src={file.url} 
                        className="h-full w-full object-contain" 
                        controls
                        onClick={(e) => e.stopPropagation()}
                        preload="metadata"
                      />
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Видео
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {files.length > 4 && (
                <div className="absolute bottom-2 right-2 bg-gray-800 bg-opacity-75 text-white text-sm px-2 py-1 rounded">
                  +{files.length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            className={`flex items-center text-sm ${liked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
            onClick={handleLikeClick}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              fill={liked ? "currentColor" : "none"} 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
            <span>{likesCount}</span>
          </button>
          
          <button 
            className="flex items-center text-sm text-gray-500 hover:text-indigo-500"
            onClick={handleCommentClick}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
            <span>{post.comments || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCard; 