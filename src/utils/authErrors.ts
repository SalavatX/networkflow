type FirebaseAuthErrorCode = 
  | 'auth/invalid-credential'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/weak-password'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/internal-error'
  | 'auth/requires-recent-login'
  | 'auth/user-disabled'
  | 'auth/operation-not-allowed'
  | string;

export const getAuthErrorMessage = (errorCode: FirebaseAuthErrorCode): string => {
  switch (errorCode) {
    case 'auth/invalid-credential':
      return 'Неверный email или пароль. Пожалуйста, проверьте введенные данные.';
    case 'auth/user-not-found':
      return 'Пользователь с таким email не найден.';
    case 'auth/wrong-password':
      return 'Неверный пароль. Пожалуйста, проверьте правильность ввода.';
    case 'auth/email-already-in-use':
      return 'Этот email уже используется другим аккаунтом.';
    case 'auth/invalid-email':
      return 'Введите корректный адрес электронной почты.';
    case 'auth/weak-password':
      return 'Пароль слишком слабый. Используйте не менее 6 символов.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток входа. Пожалуйста, попробуйте позже.';
    case 'auth/network-request-failed':
      return 'Проблема с подключением к сети. Проверьте ваше интернет-соединение.';
    case 'auth/requires-recent-login':
      return 'Для этой операции требуется повторный вход в систему.';
    case 'auth/user-disabled':
      return 'Этот аккаунт был отключен. Пожалуйста, обратитесь к администратору.';
    case 'auth/operation-not-allowed':
      return 'Эта операция не разрешена. Пожалуйста, обратитесь к администратору.';
    case 'auth/internal-error':
      return 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.';
    default:
      return 'Произошла ошибка. Пожалуйста, попробуйте снова.';
  }
};


export const getErrorCodeFromMessage = (errorMessage: string): FirebaseAuthErrorCode => {
  const matches = errorMessage.match(/\((.*?)\)/);
  if (matches && matches[1]) {
    return matches[1] as FirebaseAuthErrorCode;
  }
  return 'auth/internal-error';
};

export const processAuthError = (error: any): string => {
  let errorMessage = '';
  
  if (error.code) {
    errorMessage = getAuthErrorMessage(error.code);
  } else if (error.message) {
    const errorCode = getErrorCodeFromMessage(error.message);
    errorMessage = getAuthErrorMessage(errorCode);
  } else {
    errorMessage = 'Произошла неизвестная ошибка. Пожалуйста, попробуйте снова.';
  }
  
  return errorMessage;
}; 