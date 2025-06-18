import { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { PhotoIcon, VideoCameraIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES } from '../../services/fileService';

const CreatePost = () => {
  const { currentUser, userData } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<{url: string, type: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
    if (e.target.files) {
      setExpanded(true);
      
      const filesArray = Array.from(e.target.files);
      
      const validFiles = filesArray.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          setError(`Файл ${file.name} слишком большой. Максимальный размер: 10MB`);
          return false;
        }
        
        const validTypes = fileType === 'image' 
          ? SUPPORTED_IMAGE_TYPES
          : SUPPORTED_VIDEO_TYPES;
          
        if (!validTypes.includes(file.type)) {
          const formats = fileType === 'image' 
            ? 'JPEG, PNG, GIF, WEBP, SVG'
            : 'MP4, WEBM, OGG, MOV';
          setError(`Файл ${file.name} имеет неподдерживаемый формат. Поддерживаемые форматы: ${formats}`);
          return false;
        }
        
        return true;
      });
      
      const newFiles = [...files, ...validFiles].slice(0, 4);
      setFiles(newFiles);
      
      filePreviewUrls.forEach(item => URL.revokeObjectURL(item.url));
      
      const newFilePreviewUrls = newFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type
      }));
      setFilePreviewUrls(newFilePreviewUrls);
      
      if (validFiles.length > 0) {
        setError(null);
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);

    const newFilePreviewUrls = [...filePreviewUrls];
    URL.revokeObjectURL(newFilePreviewUrls[index].url);
    newFilePreviewUrls.splice(index, 1);
    setFilePreviewUrls(newFilePreviewUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && files.length === 0) return;
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fileUrls: string[] = [];
      const fileTypes: string[] = [];
      
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          try {
            const timestamp = Date.now();
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const uniqueFileName = `${timestamp}_${cleanFileName}`;
            const storageRef = storage.ref(`posts/${uniqueFileName}`);
            const uploadTask = await storageRef.put(file);
            return {
              url: await uploadTask.ref.getDownloadURL(),
              type: file.type
            };
          } catch (error) {
            console.error('Ошибка при загрузке файла:', error);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(uploadPromises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            fileUrls.push(result.value.url);
            fileTypes.push(result.value.type);
          }
        });
        
        if (fileUrls.length < files.length) {
          setError(`Загружено ${fileUrls.length} из ${files.length} файлов. Остальные не удалось загрузить.`);
        }
      }
      
      if (content.trim() || fileUrls.length > 0) {
        await addDoc(collection(db, 'posts'), {
          content,
          fileUrls,
          fileTypes,
          authorId: currentUser.uid,
          authorName: userData?.displayName || 'Пользователь',
          authorPhotoURL: userData?.photoURL || '',
          createdAt: serverTimestamp(),
          likes: [],
          commentsCount: 0
        });
        
        setContent('');
        setFiles([]);
        filePreviewUrls.forEach(item => URL.revokeObjectURL(item.url));
        setFilePreviewUrls([]);
        setExpanded(false);
      }
      
    } catch (error) {
      console.error('Ошибка при создании поста:', error);
      setError('Произошла ошибка при создании поста. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt="Profile" 
                className="h-9 w-9 rounded-full"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-bold">
                  {userData?.displayName?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div 
              className={`relative border border-gray-300 rounded-lg transition-all ${expanded ? 'rounded-b-none border-b-0' : 'hover:bg-gray-50'}`}
              onClick={() => !expanded && setExpanded(true)}
            >
              <textarea
                rows={expanded ? 3 : 1}
                name="content"
                id="content"
                className={`block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg p-2 ${expanded ? 'rounded-b-none' : ''}`}
                placeholder="Что у вас нового?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => !expanded && setExpanded(true)}
              />
              
              {!expanded && (
                <div className="absolute top-0 right-0 flex h-full px-2">
                  <button
                    type="submit"
                    disabled={loading || (!content.trim() && files.length === 0)}
                    className="my-auto p-1.5 rounded-full text-indigo-500 hover:bg-indigo-50"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            
            {expanded && (
              <>
                {filePreviewUrls.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 border-x border-gray-300">
                    {filePreviewUrls.map((file, index) => (
                      <div key={index} className="relative">
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={file.url} 
                            alt={`Preview ${index}`} 
                            className="h-32 w-full object-cover"
                          />
                        ) : file.type.startsWith('video/') ? (
                          <div className="h-32 w-full bg-gray-100 relative">
                            <video 
                              src={file.url} 
                              className="h-full w-full object-contain" 
                              controls
                            />
                            <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-bl">
                              Видео
                            </div>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-gray-800 bg-opacity-50 rounded-full p-1 text-white"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {error && (
                  <div className="p-2 text-sm text-red-600 border-x border-gray-300">
                    {error}
                  </div>
                )}
                
                <div className="p-2 flex flex-row items-center justify-between border border-gray-300 rounded-b-lg border-t-0">
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                      onClick={() => fileInputRef.current?.click()}
                      title="Добавить фото"
                    >
                      <PhotoIcon className="h-5 w-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e, 'image')}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                      onClick={() => videoInputRef.current?.click()}
                      title="Добавить видео"
                    >
                      <VideoCameraIcon className="h-5 w-5" />
                    </button>
                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={(e) => handleFileChange(e, 'video')}
                      accept="video/*"
                      multiple
                      className="hidden"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={loading || (!content.trim() && files.length === 0)}
                      className="px-4 py-1.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? 'Публикация...' : 'Опубликовать'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePost; 