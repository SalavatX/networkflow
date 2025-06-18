import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ApprovedRoute = () => {
  const { currentUser, isApproved, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (currentUser && !isApproved) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ожидание подтверждения</h2>
          <p className="text-gray-600 mb-6">
            Ваш аккаунт ожидает подтверждения администратором. Вы получите уведомление, когда ваша учетная запись будет активирована.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Обновить статус
          </button>
        </div>
      </div>
    );
  }

  return currentUser && isApproved ? <Outlet /> : <Navigate to="/login" />;
};

export default ApprovedRoute; 