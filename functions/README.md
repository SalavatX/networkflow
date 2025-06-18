# Firebase Functions для социальной сети

Этот каталог содержит Cloud Functions для Firebase, которые используются в корпоративной социальной сети.

## Функциональные возможности

1. **sendEmail** - функция для отправки email-уведомлений пользователям.
2. **deleteUserAuth** - функция для удаления пользователей из Firebase Authentication.

## Настройка

### Предварительные требования

- Node.js 18 или выше
- Firebase CLI: `npm install -g firebase-tools`
- Учетная запись Firebase

### Шаги по настройке

1. Авторизуйтесь в Firebase CLI:
   ```
   firebase login
   ```

2. Инициализируйте Firebase в корневой директории проекта (если еще не инициализирован):
   ```
   firebase init
   ```

3. Выберите Functions и настройте проект.

4. Установите зависимости:
   ```
   cd functions
   npm install
   ```

5. Настройка отправки email:
   - Откройте файл `src/index.ts`
   - Замените учетные данные SMTP в объекте `transporter`:
     ```typescript
     const transporter = nodemailer.createTransport({
       service: 'gmail', // или другой SMTP-сервис
       auth: {
         user: 'your-real-email@gmail.com',
         pass: 'your-real-password-or-app-password',
       },
     });
     ```
   
   > **Важно**: Для Gmail рекомендуется использовать "пароль приложения", а не обычный пароль аккаунта.
   > Инструкции по созданию пароля приложения: https://support.google.com/accounts/answer/185833

   > **Для продакшена**: Рекомендуется хранить учетные данные в секретах Firebase:
   > ```
   > firebase functions:config:set email.user="your-email@gmail.com" email.password="your-password"
   > ```
   > И затем использовать их в коде:
   > ```typescript
   > const transporter = nodemailer.createTransport({
   >   service: 'gmail',
   >   auth: {
   >     user: functions.config().email.user,
   >     pass: functions.config().email.password,
   >   },
   > });
   > ```

## Развертывание

Для развертывания функций выполните:

```
cd functions
npm run deploy
```

## Локальное тестирование

Для локального тестирования выполните:

```
cd functions
npm run serve
```

## Предупреждения

1. Никогда не коммитьте реальные учетные данные SMTP в репозиторий.
2. В продакшене используйте секреты Firebase для хранения конфиденциальных данных.
3. Для Gmail существуют ограничения на количество отправляемых сообщений в день. Для продакшена рассмотрите использование специализированных сервисов отправки email, таких как SendGrid, Mailgun или Amazon SES. 