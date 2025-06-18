import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BlockedUserPage from './BlockedUserPage';

const BlockedRoute = () => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (userData?.blocked) {
    return (
      <BlockedUserPage 
        blockedReason={userData.blockedReason || 'Нарушение правил сообщества'}
        blockedUntil={userData.blockedUntil ? new Date(userData.blockedUntil) : null}
        blockedAt={userData.blockedAt ? new Date(userData.blockedAt) : null}
        adminName={userData.adminName || 'Администратор'}
      />
    );
  }

  return <Outlet />;
};

export default BlockedRoute; 