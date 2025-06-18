import { useState } from 'react';
import { emailService } from '../../services/emailService';

const EmailTest = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showActivationInfo, setShowActivationInfo] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const addLog = (text: string) => {
    setLogs(prev => [...prev, text]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Пожалуйста, введите email');
      return;
    }

    try {
      setStatus('sending');
      setMessage('Отправка тестового email...');
      setLogs([]);
      setPopupBlocked(false);
      
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        addLog(`LOG: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        addLog(`ERROR: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`);
      };
      
      const popupTest = window.open('about:blank', '_blank');
      if (!popupTest) {
        setPopupBlocked(true);
        addLog('ВНИМАНИЕ: Всплывающие окна заблокированы браузером. Это может помешать отправке email.');
      } else {
        popupTest.close();
      }
      
      const result = await emailService.sendEmail(
        email,
        'Тестовое сообщение из корпоративной сети',
        'Это тестовое сообщение для проверки работы системы отправки email.',
        'Система (тест)'
      );
      
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      if (result) {
        setStatus('success');
        setMessage(`Email успешно отправлен на адрес ${email}. Проверьте входящие сообщения.`);
        setShowActivationInfo(true);
      } else {
        setStatus('error');
        setMessage(`Не удалось отправить email на адрес ${email}. Проверьте логи для подробностей.`);
        setShowTroubleshooting(true);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Ошибка при отправке email: ${error instanceof Error ? error.message : String(error)}`);
      setShowTroubleshooting(true);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Тестирование отправки Email</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email для тестирования
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Введите email для отправки тестового сообщения"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {status === 'sending' ? 'Отправка...' : 'Отправить тестовый email'}
          </button>
        </form>
        
        {popupBlocked && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
            <strong>Внимание!</strong> Ваш браузер блокирует всплывающие окна. 
            Разрешите всплывающие окна для этого сайта, чтобы отправка email работала корректно.
          </div>
        )}
        
        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            status === 'success' ? 'bg-green-100 text-green-800' : 
            status === 'error' ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
        
        {showActivationInfo && (
          <div className="mt-4 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
            <h3 className="font-semibold text-yellow-800">Важно: Активация FormSubmit</h3>
            <p className="mt-2 text-sm text-yellow-700">
              При первом использовании FormSubmit для нового email-адреса, система отправит письмо с запросом на активацию.
              Вам необходимо:
            </p>
            <ol className="mt-2 list-decimal list-inside text-sm text-yellow-700 space-y-1">
              <li>Проверить входящие сообщения на адресе {email}</li>
              <li>Найти письмо от FormSubmit с темой "Confirm your email"</li>
              <li>Нажать на кнопку активации в этом письме</li>
              <li>После активации все последующие письма будут доставляться автоматически</li>
            </ol>
            <p className="mt-2 text-sm text-yellow-700">
              Если письмо с активацией не пришло, проверьте папку "Спам" или попробуйте другой email-адрес.
            </p>
          </div>
        )}

        {showTroubleshooting && (
          <div className="mt-4 p-3 border border-orange-300 bg-orange-50 rounded-md">
            <h3 className="font-semibold text-orange-800">Устранение проблем с отправкой email</h3>
            <p className="mt-2 text-sm text-orange-700">
              Если у вас возникли проблемы с отправкой email, попробуйте следующие решения:
            </p>
            <ol className="mt-2 list-decimal list-inside text-sm text-orange-700 space-y-1">
              <li>Разрешите всплывающие окна для этого сайта в настройках браузера</li>
              <li>Проверьте доступность сервисов FormSubmit в вашем регионе (formsubmit.co, formsubmit.io)</li>
              <li>Попробуйте использовать VPN, если сервисы недоступны в вашем регионе</li>
              <li>Используйте другой браузер (Chrome, Firefox, Edge)</li>
              <li>Попробуйте другой email-адрес (Gmail, Outlook, Yandex)</li>
            </ol>
            <p className="mt-2 text-sm text-orange-700">
              Система автоматически пробует несколько методов отправки и альтернативных сервисов.
              Если ни один из них не работает, возможно, в вашем регионе действуют ограничения на доступ к этим сервисам.
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Логи отправки</h2>
        <div className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-auto max-h-64">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className={`text-xs font-mono ${log.startsWith('ERROR') ? 'text-red-400' : log.startsWith('ВНИМАНИЕ') ? 'text-yellow-400' : 'text-green-400'}`}>
                {log}
              </div>
            ))
          ) : (
            <div className="text-xs font-mono text-gray-400">Логи появятся после отправки email...</div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Информация о системе отправки email</h2>
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">
            Система использует сервис FormSubmit для отправки email. 
            FormSubmit - это бесплатный сервис, который позволяет отправлять email без настройки серверной части.
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Как это работает:</strong>
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-2">
            <li>При первом использовании FormSubmit для нового email-адреса требуется активация</li>
            <li>После активации все последующие письма будут доставляться автоматически</li>
            <li>Сервис имеет ограничения на количество отправляемых писем (до 50 в день)</li>
          </ol>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Возможные проблемы:</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-2">
            <li>Блокировка всплывающих окон браузером (разрешите для этого сайта)</li>
            <li>Сетевые ограничения или брандмауэр (проверьте доступ к formsubmit.co)</li>
            <li>Письма могут попадать в папку "Спам" (проверьте и отметьте как "не спам")</li>
            <li>Региональные ограничения (попробуйте использовать VPN)</li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2">Альтернативные способы отправки email</h2>
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">
            Если FormSubmit не работает в вашем регионе, вы можете использовать следующие альтернативы:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-2">
            <li>Настройка собственного SMTP-сервера (требует технических знаний)</li>
            <li>Использование других сервисов, таких как Form-Data или Getform</li>
            <li>Настройка уведомлений через Telegram-бот вместо email</li>
            <li>Использование встроенных уведомлений браузера (Push-уведомления)</li>
          </ol>
          <p className="text-sm text-gray-700">
            Для реализации любой из этих альтернатив потребуется внесение изменений в код приложения.
            Обратитесь к разработчику для получения дополнительной информации.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailTest; 