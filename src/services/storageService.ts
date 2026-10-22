import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

export const uploadImageToStorage = async (
  file: File,
  pathFolder: 'profile' | 'portfolio' | 'logo'
): Promise<string> => {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo para subir.');
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, `${pathFolder}/${uniqueFileName}`);

  const metadata = {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public,max-age=31536000',
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return downloadUrl;
};

export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    return;
  }

  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('[Storage] No se pudo eliminar la imagen anterior:', error);
  }
};
