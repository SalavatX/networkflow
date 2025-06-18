import { useState, useEffect } from 'react';
import PostFilter from './PostFilter';
import PostItem from './PostItem';
import { getPosts, Post } from '../../services/postService';

const FilteredPosts = () => {
  const [, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        setLoading(true);
        const { posts } = await getPosts();
        setPosts(posts);
        setFilteredPosts(posts);
      } catch (error) {
        console.error('Ошибка при загрузке постов:', error);
        setError('Не удалось загрузить посты. Пожалуйста, попробуйте еще раз.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosts();
  }, []);

  const handleFilter = (filteredPosts: Post[]) => {
    setFilteredPosts(filteredPosts);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Лента постов
        </h1>
        <p className="text-gray-600 ml-11">Используйте фильтры для поиска интересных постов</p>
      </div>
      
      <PostFilter 
        onFilter={handleFilter} 
        onLoading={setLoading} 
        onError={handleError} 
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="space-y-6">
          {filteredPosts.map(post => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Посты не найдены</h2>
          <p className="text-gray-600 mb-6">
            По заданным критериям не найдено ни одного поста.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

export default FilteredPosts; 