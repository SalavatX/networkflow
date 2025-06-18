import { useState } from 'react';
import { filterPosts } from '../../services/postService';
import { Post } from '../../services/postService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../contexts/AuthContext';

interface PostFilterProps {
  onFilter: (posts: Post[]) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

const PostFilter = ({ onFilter, onLoading, onError }: PostFilterProps) => {
  const { currentUser } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date | undefined | null>(null);
  const [dateTo, setDateTo] = useState<Date | undefined | null>(null);
  const [byAuthor, setByAuthor] = useState<'all' | 'mine' | 'following'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [withAttachments, setWithAttachments] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    onLoading(true);
    
    try {
      const filters: any = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        popular: sortBy === 'popular',
        withAttachments: withAttachments,
        limit: 50
      };
      
      if (byAuthor === 'mine' && currentUser) {
        filters.authorId = currentUser.uid;
      }
      
      if (byAuthor === 'following') {
        filters.followingOnly = true;
      }
      
      const filteredPosts = await filterPosts(filters);
      onFilter(filteredPosts);
      onError('');
    } catch (error) {
      console.error('Ошибка при фильтрации постов:', error);
      onError('Не удалось применить фильтры. Пожалуйста, попробуйте еще раз.');
    } finally {
      onLoading(false);
    }
  };

  const resetFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setByAuthor('all');
    setSortBy('latest');
    setWithAttachments(false);
    
    handleSubmit(new Event('submit') as any);
  };

  return (
    <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden border border-gray-100">
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer bg-gradient-to-r from-white to-indigo-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Фильтры и сортировка
        </h2>
        <button className="text-indigo-500 hover:text-indigo-700 focus:outline-none">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-100">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Период публикации
                </label>
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <DatePicker
                      selected={dateFrom}
                      onChange={(date) => setDateFrom(date)}
                      selectsStart
                      startDate={dateFrom}
                      endDate={dateTo}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholderText="От"
                      dateFormat="dd.MM.yyyy"
                    />
                  </div>
                  <div className="w-1/2">
                    <DatePicker
                      selected={dateTo}
                      onChange={(date) => setDateTo(date)}
                      selectsEnd
                      startDate={dateFrom}
                      endDate={dateTo}
                      minDate={dateFrom || undefined}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholderText="До"
                      dateFormat="dd.MM.yyyy"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Автор
                </label>
                <select
                  value={byAuthor}
                  onChange={(e) => setByAuthor(e.target.value as 'all' | 'mine' | 'following')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">Все авторы</option>
                  <option value="mine">Только мои посты</option>
                  <option value="following">От тех, на кого я подписан</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="latest">Сначала новые</option>
                  <option value="popular">Сначала популярные</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg flex items-center">
                <input
                  id="with-attachments"
                  type="checkbox"
                  checked={withAttachments}
                  onChange={(e) => setWithAttachments(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="with-attachments" className="ml-2 block text-sm text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Только с вложениями
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Сбросить
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Применить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostFilter; 