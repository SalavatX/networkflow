import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Link } from 'react-router-dom';
import { emailService } from '../../services/emailService';
import { processAuthError } from '../../utils/authErrors';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      
      try {
        await emailService.sendEmail(
          email,
          'Сброс пароля',
          `Вы запросили сброс пароля для вашей учетной записи. 
          Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.
          
          Для сброса пароля перейдите по ссылке, которую вы получите от Firebase, или запросите сброс пароля повторно.`,
          'Корпоративная социальная сеть'
        );
      } catch (emailError) {
        console.error('Ошибка при отправке дополнительного уведомления:', emailError);
      }
      
      setMessage('Инструкции по сбросу пароля отправлены на ваш email.');
    } catch (err: any) {
      setError(processAuthError(err));
      console.error('Ошибка сброса пароля:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex w-full max-w-6xl shadow-2xl rounded-xl overflow-hidden bg-white relative z-10">
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 flex-col justify-between text-white">
          <div>
            <h2 className="text-3xl font-bold mb-6">Восстановление доступа</h2>
            <p className="text-lg mb-8">
              Введите ваш корпоративный email, и мы отправим вам инструкции по сбросу пароля.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Безопасное восстановление доступа
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Простой процесс сброса пароля
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Мгновенное получение инструкций
              </li>
            </ul>
          </div>
        </div>
        
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Забыли пароль?
            </h2>
            <p className="text-gray-600">
              Введите ваш email для получения инструкций по сбросу пароля
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}
            
            {message && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{message}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Введите ваш корпоративный email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-gradient w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? 'Отправка...' : 'Отправить инструкции'}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Вернуться к входу
              </Link>
            </div>
          </form>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>© 2025 Корпоративная социальная сеть. Все права защищены.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 