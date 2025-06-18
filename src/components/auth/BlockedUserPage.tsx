import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

interface BlockedUserPageProps {
  blockedReason?: string;
  blockedUntil?: Date | null;
  blockedAt?: Date | null;
  adminName?: string;
}

const BlockedUserPage = ({ 
  blockedReason = 'Нарушение правил сообщества', 
  blockedUntil = null, 
  blockedAt = null,
  adminName = 'Администратор'
}: BlockedUserPageProps) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  
  useEffect(() => {
    const updateTimeLeft = () => {
      if (blockedUntil) {
        const now = new Date();
        if (now > blockedUntil) {
          setTimeLeft('Срок блокировки истек. Обновите страницу.');
          return;
        }
        
        try {
          const timeLeftStr = formatDistanceToNow(blockedUntil, { locale: ru });
          setTimeLeft(timeLeftStr);
        } catch (error) {
          console.error('Ошибка при форматировании времени:', error);
          setTimeLeft('неизвестно');
        }
      } else {
        setTimeLeft(null);
      }
    };
    
    updateTimeLeft();
    const intervalId = setInterval(updateTimeLeft, 60000);
    
    return () => clearInterval(intervalId);
  }, [blockedUntil]);
  
  const formatBlockedDate = (date: Date | null) => {
    if (!date) return 'неизвестно';
    
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return 'неизвестно';
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-red-600 px-6 py-8 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-white flex items-center justify-center mb-4">
            <LockClosedIcon className="h-10 w-10 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white">Ваш аккаунт заблокирован</h1>
        </div>
        
        <div className="px-6 py-8">
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Причина блокировки:</h2>
            <p className="text-red-700">{blockedReason}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Заблокирован администратором:</h3>
              <p className="text-gray-900">{adminName}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Дата блокировки:</h3>
              <p className="text-gray-900">{blockedAt ? formatBlockedDate(blockedAt) : 'неизвестно'}</p>
            </div>
            
            {blockedUntil ? (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Срок блокировки:</h3>
                <p className="text-gray-900">
                  {timeLeft ? `Осталось ${timeLeft}` : 'Постоянная блокировка'}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Срок блокировки:</h3>
                <p className="text-gray-900">Постоянная блокировка</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Что это значит?</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-red-500 mr-2">✕</span>
                <span>Вы не можете публиковать новые посты</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-red-500 mr-2">✕</span>
                <span>Вы не можете оставлять комментарии</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-red-500 mr-2">✕</span>
                <span>Вы не можете отправлять сообщения другим пользователям</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-red-500 mr-2">✕</span>
                <span>Вы не можете взаимодействовать с контентом других пользователей</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Что делать дальше?</h3>
            <p className="text-gray-600 mb-6">
              Если вы считаете, что блокировка произошла по ошибке, вы можете обратиться в службу поддержки.
              Если блокировка временная, ваш аккаунт будет автоматически разблокирован по истечении срока.
            </p>
            
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Выйти из системы
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedUserPage; 