import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Настройки транспорта для отправки писем
// Используем секреты Firebase для безопасного хранения учетных данных
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    // Используем конфигурацию Firebase, если она доступна, иначе используем заглушки
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-password',
  },
});

/**
 * Функция для отправки email
 */
export const sendEmail = functions.https.onCall(async (data, context) => {
  try {
    // Проверка аутентификации
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Требуется аутентификация для отправки email'
      );
    }

    // Проверка роли администратора
    const userSnapshot = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    const userData = userSnapshot.data();
    const isAdmin = userData?.isAdmin === true;

    // Проверяем, что email отправляет администратор или это self-service email (пользователь отправляет сам себе)
    if (!isAdmin && data.email !== context.auth.token.email) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'У вас нет прав для отправки email другим пользователям'
      );
    }

    // Валидация данных
    if (!data.email || !data.subject || !data.message) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Требуются email, subject и message'
      );
    }

    // Отправка email
    const mailOptions = {
      from: '"Корпоративная социальная сеть" <noreply@yourcompany.com>',
      to: data.email,
      subject: data.subject,
      html: data.message,
    };

    await transporter.sendMail(mailOptions);

    return { success: true, message: 'Email отправлен успешно' };
  } catch (error) {
    console.error('Ошибка при отправке email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Произошла ошибка при отправке email',
      error
    );
  }
});

/**
 * Функция для удаления пользователя из Firebase Auth
 */
export const deleteUserAuth = functions.https.onCall(async (data, context) => {
  try {
    // Проверка аутентификации и роли администратора
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Требуется аутентификация'
      );
    }

    const userSnapshot = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    const userData = userSnapshot.data();
    if (!userData || userData.isAdmin !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Требуются права администратора'
      );
    }

    // Валидация userId
    if (!data.userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Требуется userId'
      );
    }

    // Получаем пользователя из Firestore
    const targetUserSnapshot = await admin.firestore()
      .collection('users')
      .doc(data.userId)
      .get();

    if (!targetUserSnapshot.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Пользователь не найден'
      );
    }

    const targetUserData = targetUserSnapshot.data();
    if (!targetUserData || !targetUserData.uid) {
      throw new functions.https.HttpsError(
        'not-found',
        'Данные пользователя некорректны'
      );
    }

    // Удаляем пользователя из Firebase Auth
    await admin.auth().deleteUser(targetUserData.uid);

    return { success: true, message: 'Пользователь успешно удален' };
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Произошла ошибка при удалении пользователя',
      error
    );
  }
}); 