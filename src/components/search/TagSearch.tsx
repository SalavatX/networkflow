import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchPostsByTag } from '../../services/postService';
import { Post } from '../../services/postService';
import PostCard from '../posts/PostCard';

const TagSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const searchParams = new URLSearchParams(location.search);
  const tag = searchParams.get('tag') || '';

  useEffect(() => {
    if (!tag) {
      navigate('/');
      return;
    }

    const fetchPostsByTag = async () => {
      setLoading(true);
      setError('');
      
      try {
        const taggedPosts = await searchPostsByTag(tag);
        setPosts(taggedPosts);
      } catch (error) {
        console.error('Ошибка при поиске постов по тегу:', error);
        setError('Не удалось загрузить посты. Пожалуйста, попробуйте еще раз.');
      } finally {
        setLoading(false);
      }
    };

    fetchPostsByTag();
  }, [tag, navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg shadow-sm pt-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          Посты с тегом #{tag}
        </h1>
        <p className="text-gray-600 ml-11">Найдено {posts.length} постов</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm">
          <p className="text-red-700">{error}</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white shadow-md rounded-lg border border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Посты не найдены</h2>
          <p className="text-gray-600 mb-6">
            По тегу <span className="font-medium">#{tag}</span> не найдено ни одного поста.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Вернуться на главную
          </button>
        </div>
      )}
    </div>
  );
};

export default TagSearch; 