import { storage } from '../firebase/config';

/**
 * Максимальный размер файла в байтах (10 МБ)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Поддерживаемые типы файлов
 */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'application/zip',
  'application/x-rar-compressed'
];

/**
 * Интерфейс для результата загрузки файла
 */
export interface FileUploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isImage: boolean;
  isVideo: boolean;
}

/**
 * Проверяет, является ли файл изображением
 */
export const isImage = (fileType: string): boolean => {
  return SUPPORTED_IMAGE_TYPES.includes(fileType);
};

/**
 * Проверяет, является ли файл видео
 */
export const isVideo = (fileType: string): boolean => {
  return SUPPORTED_VIDEO_TYPES.includes(fileType);
};

/**
 * Проверяет, поддерживается ли тип файла
 */
export const isSupportedFileType = (fileType: string): boolean => {
  return SUPPORTED_FILE_TYPES.includes(fileType);
};

/**
 * Генерирует уникальное имя файла
 */
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const cleanFileName = originalName.replace(/[^a-zA-Z0-9.]/g, '_');
  return `${timestamp}_${randomString}_${cleanFileName}`;
};

/**
 * Загружает файл в хранилище
 */
export const uploadFile = async (file: File, folder: string): Promise<FileUploadResult> => {
  // Проверка размера файла
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
  }
  
  // Проверка типа файла
  if (!isSupportedFileType(file.type)) {
    throw new Error('Неподдерживаемый тип файла');
  }
  
  try {
    // Создаем ссылку на файл в хранилище
    const storageRef = storage.ref(`${folder}`);
    
    // Загружаем файл
    const uploadTask = await storageRef.put(file);
    
    // Получаем URL для доступа к файлу
    const url = await uploadTask.ref.getDownloadURL();
    
    return {
      url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      isImage: isImage(file.type),
      isVideo: isVideo(file.type)
    };
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    throw error;
  }
};

/**
 * Получает расширение файла из MIME-типа
 */
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar'
  };
  
  return mimeToExtension[mimeType] || '';
};

/**
 * Получает иконку для файла в зависимости от его типа
 */
export const getFileIcon = (fileType: string): string => {
  if (isImage(fileType)) {
    return 'image';
  }
  
  if (isVideo(fileType)) {
    return 'video';
  }
  
  const fileExtension = getFileExtensionFromMimeType(fileType);
  
  switch (fileExtension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
    case 'ppt':
    case 'pptx':
      return 'powerpoint';
    case 'zip':
    case 'rar':
      return 'archive';
    case 'txt':
      return 'text';
    default:
      return 'file';
  }
};

export default {
  uploadFile,
  isImage,
  isVideo,
  isSupportedFileType,
  generateUniqueFileName,
  getFileExtensionFromMimeType,
  getFileIcon,
  MAX_FILE_SIZE,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_FILE_TYPES
}; 