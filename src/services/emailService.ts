
export const SERVICE_ID = 'service_579z8l9';
export const TEMPLATE_ID = 'template_6n091vp';
export const PUBLIC_KEY = 'Ni7go_W2Sf_FUk7Ov';

const FORM_SERVICES = [
  'https://formsubmit.co',
  'https://formsubmit.io',
  'https://form-data.com/api'
];

/**
 * Сервис для отправки email уведомлений
 */
export const emailService = {
  /**
   * Инициализация EmailJS
   */
  init() {
    console.log('Email сервис инициализирован');
  },

  /**
   * Отправка email через форму с target="_blank"
   */
  async sendEmailViaBlankForm(to: string, subject: string, message: string, fromName: string): Promise<boolean> {
    try {
      console.log('Пробуем отправить email через форму с target="_blank"...');
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${FORM_SERVICES[0]}/${to}`;
      form.target = '_blank';
      form.style.display = 'none';
      
      const addField = (name: string, value: string) => {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        form.appendChild(field);
      };
      
      addField('_subject', subject);
      addField('_captcha', 'false');
      addField('_template', 'table');
      addField('_replyto', 'noreply@yourcompany.com');
      addField('_honey', '');
      addField('_confirmation', 'false');
      addField('message', message);
      addField('name', fromName);
      addField('_next', window.location.href);
      
      document.body.appendChild(form);
      
      form.submit();
      console.log('Форма отправлена через FormSubmit в новом окне');
      
      setTimeout(() => {
        try {
          if (document.body.contains(form)) {
            document.body.removeChild(form);
          }
        } catch (error) {
          console.log('Ошибка при удалении формы:', error);
        }
      }, 1000);
      
        return true;
    } catch (error) {
      console.error('Ошибка при отправке email через форму с target="_blank":', error);
      return false;
    }
  },

  /**
   * Отправка email через форму с использованием iframe
   */
  async sendEmailViaIframe(to: string, subject: string, message: string, fromName: string): Promise<boolean> {
    try {
      console.log('Пробуем отправить email через iframe...');
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const iframeDocument = iframe.contentWindow?.document;
      if (!iframeDocument) {
        console.error('Не удалось создать iframe документ');
        return false;
      }
      
      const form = iframeDocument.createElement('form');
      form.method = 'POST';
      form.action = `${FORM_SERVICES[0]}/${to}`;
      
      const subjectField = iframeDocument.createElement('input');
      subjectField.type = 'hidden';
      subjectField.name = '_subject';
      subjectField.value = subject;
      form.appendChild(subjectField);
      
      const captchaField = iframeDocument.createElement('input');
      captchaField.type = 'hidden';
      captchaField.name = '_captcha';
      captchaField.value = 'false';
      form.appendChild(captchaField);
      
      const templateField = iframeDocument.createElement('input');
      templateField.type = 'hidden';
      templateField.name = '_template';
      templateField.value = 'table';
      form.appendChild(templateField);
      
      const replyToField = iframeDocument.createElement('input');
      replyToField.type = 'hidden';
      replyToField.name = '_replyto';
      replyToField.value = 'noreply@yourcompany.com';
      form.appendChild(replyToField);
      
      const honeypotField = iframeDocument.createElement('input');
      honeypotField.type = 'hidden';
      honeypotField.name = '_honey';
      honeypotField.value = '';
      form.appendChild(honeypotField);
      
      const confirmField = iframeDocument.createElement('input');
      confirmField.type = 'hidden';
      confirmField.name = '_confirmation';
      confirmField.value = 'false';
      form.appendChild(confirmField);
      
      const messageField = iframeDocument.createElement('input');
      messageField.type = 'hidden';
      messageField.name = 'message';
      messageField.value = message;
      form.appendChild(messageField);
      
      const nameField = iframeDocument.createElement('input');
      nameField.type = 'hidden';
      nameField.name = 'name';
      nameField.value = fromName;
      form.appendChild(nameField);
      
      const nextField = iframeDocument.createElement('input');
      nextField.type = 'hidden';
      nextField.name = '_next';
      nextField.value = window.location.href;
      form.appendChild(nextField);
      
      iframeDocument.body.appendChild(form);
      
      const formSubmitPromise = new Promise<boolean>((resolve) => {
        iframe.onload = () => {
          setTimeout(() => {
            try {
              if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
              }
            } catch (error) {
              console.log('Ошибка при удалении iframe:', error);
            }
          }, 1000);
          resolve(true);
        };
        
        setTimeout(() => {
          try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            }
          } catch (error) {
            console.log('Ошибка при удалении iframe:', error);
          }
          resolve(true);
        }, 5000);
      });
      
      form.submit();
      console.log('Форма отправлена через iframe');
      
      await formSubmitPromise;
      return true;
    } catch (error) {
      console.error('Ошибка при отправке email через iframe:', error);
      return false;
    }
  },

  /**
   * Отправка email через альтернативные сервисы
   */
  async sendEmailViaAlternativeServices(to: string, subject: string, message: string, fromName: string): Promise<boolean> {
    for (let i = 1; i < FORM_SERVICES.length; i++) {
      try {
        console.log(`Пробуем отправить email через альтернативный сервис ${FORM_SERVICES[i]}...`);
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${FORM_SERVICES[i]}/${to}`;
        form.target = '_blank';
        form.style.display = 'none';
        
        const addField = (name: string, value: string) => {
          const field = document.createElement('input');
          field.type = 'hidden';
          field.name = name;
          field.value = value;
          form.appendChild(field);
        };
        
        addField('_subject', subject);
        addField('message', message);
        addField('name', fromName);
        
        document.body.appendChild(form);
        
        form.submit();
        console.log(`Форма отправлена через альтернативный сервис ${FORM_SERVICES[i]}`);
        
        setTimeout(() => {
          try {
            if (document.body.contains(form)) {
              document.body.removeChild(form);
            }
          } catch (error) {
            console.log('Ошибка при удалении формы:', error);
          }
        }, 1000);
        
        return true;
      } catch (error) {
        console.error(`Ошибка при отправке email через альтернативный сервис ${FORM_SERVICES[i]}:`, error);
      }
    }
    
    return false;
  },

  /**
   * Отправка email
   * @param to Email получателя
   * @param subject Тема письма
   * @param message Содержимое письма
   * @param fromName Имя отправителя
   * @returns Promise с результатом отправки
   */
  async sendEmail(to: string, subject: string, message: string, fromName: string = 'Система'): Promise<boolean> {
    try {
      console.log('Отправка email на адрес:', to);
      
      try {
        const result = await this.sendEmailViaBlankForm(to, subject, message, fromName);
        if (result) {
        return true;
        }
      } catch (blankFormError) {
        console.error('Ошибка при отправке через форму с target="_blank":', blankFormError);
      }
        
        try {
        const iframeResult = await this.sendEmailViaIframe(to, subject, message, fromName);
        if (iframeResult) {
            return true;
        }
      } catch (iframeError) {
        console.error('Ошибка при отправке через iframe:', iframeError);
      }
      
      return await this.sendEmailViaAlternativeServices(to, subject, message, fromName);
    } catch (error: any) {
      console.error('Ошибка при отправке email:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      return false;
    }
  },

  /**
   * Тестовая функция для проверки работы отправки email
   * @param to Email получателя для тестирования
   */
  async testEmailConnection(to: string): Promise<void> {
    console.log('Начинаем тест соединения с сервисом отправки email...');
    
    try {
      const result = await this.sendEmail(
        to,
        'Тестовое сообщение',
        'Это тестовое сообщение для проверки работы системы отправки email.',
        'Система (тест)'
      );
      
      if (result) {
        console.log('✅ Тест успешно пройден! Email отправлен на адрес:', to);
      } else {
        console.error('❌ Тест не пройден. Email не был отправлен.');
      }
    } catch (error) {
      console.error('❌ Тест не пройден. Произошла ошибка:', error);
    }
  },

  /**
   * Отправка уведомления о новом сообщении
   * @param to Email получателя
   * @param fromName Имя отправителя
   * @returns Promise с результатом отправки
   */
  async sendMessageNotification(to: string, fromName: string): Promise<boolean> {
    const subject = 'Новое сообщение';
    const message = 'Вы получили новое сообщение. Войдите в систему, чтобы прочитать его.';
    return this.sendEmail(to, subject, message, fromName);
  },

  /**
   * Отправка уведомления о новом комментарии
   * @param to Email получателя
   * @param fromName Имя комментатора
   * @param postTitle Заголовок поста
   * @returns Promise с результатом отправки
   */
  async sendCommentNotification(to: string, fromName: string, postTitle: string): Promise<boolean> {
    const subject = 'Новый комментарий к вашему посту';
    const message = `Пользователь оставил комментарий к вашему посту "${postTitle}". Войдите в систему, чтобы прочитать его.`;
    return this.sendEmail(to, subject, message, fromName);
  },

  /**
   * Отправка уведомления о лайке
   * @param to Email получателя
   * @param fromName Имя пользователя, поставившего лайк
   * @param postTitle Заголовок поста
   * @returns Promise с результатом отправки
   */
  async sendLikeNotification(to: string, fromName: string, postTitle: string): Promise<boolean> {
    const subject = 'Новый лайк к вашему посту';
    const message = `Пользователю понравился ваш пост "${postTitle}".`;
    return this.sendEmail(to, subject, message, fromName);
  }
}; 