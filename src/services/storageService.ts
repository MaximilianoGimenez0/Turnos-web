import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from 'firebase/storage';
import app from './firebaseConfig';
import { TENANT_ID_REGEX } from '../config/tenantConstants';

export type StorageImageFolder = 'profile' | 'portfolio' | 'logo' | 'hero';

export const MAX_STORAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const FOLDER_MAX_DIMENSION: Record<StorageImageFolder, number> = {
  logo: 512,
  profile: 900,
  hero: 1600,
  portfolio: 1080,
};

const WEBP_QUALITY = 0.82;

let storageInstance: FirebaseStorage | null = null;
let storageEmulatorConnected = false;

export const getStorageInstance = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }
  if (
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' &&
    !storageEmulatorConnected
  ) {
    storageEmulatorConnected = true;
    try {
      connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
    } catch {
      // Ignore if already connected in integration test runner
    }
  }
  return storageInstance;
};

const assertValidTenantId = (tenantId: string): string => {
  const clean = String(tenantId ?? '').trim();
  if (!TENANT_ID_REGEX.test(clean)) {
    throw new Error('Se requiere un tenantId válido para operar sobre Storage.');
  }
  return clean;
};

export const buildTenantStoragePrefix = (tenantId: string): string =>
  `tenants/${assertValidTenantId(tenantId)}/`;

export const buildTenantStoragePath = (
  tenantId: string,
  pathFolder: StorageImageFolder,
  fileName: string
): string => {
  const validTenantId = assertValidTenantId(tenantId);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${Date.now()}_${sanitizedName}`;
  return `tenants/${validTenantId}/${pathFolder}/${uniqueFileName}`;
};

export const isTenantStoragePath = (tenantId: string, fullPath: string): boolean => {
  const cleanTenantId = String(tenantId ?? '').trim();
  if (!TENANT_ID_REGEX.test(cleanTenantId)) return false;
  const normalizedPath = String(fullPath ?? '').replace(/^\/+/, '');
  return normalizedPath.startsWith(`tenants/${cleanTenantId}/`);
};

const replaceExtensionWithWebp = (fileName: string): string => {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  return `${withoutExt || 'image'}.webp`;
};

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

/**
 * Resizes and encodes raster images to WebP in the browser using native Canvas API (0 external deps).
 * Preserves SVG files untouched and gracefully falls back to the original file if Canvas/WebP is unavailable
 * or if the encoded output is not smaller than the original.
 */
export const compressImageForUpload = async (
  file: File,
  pathFolder: StorageImageFolder
): Promise<File> => {
  if (!file) return file;

  const isSvg =
    file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (isSvg || typeof document === 'undefined') {
    return file;
  }

  const maxDimension = FOLDER_MAX_DIMENSION[pathFolder] ?? 1080;

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource: CanvasImageSource | null = null;
    let closeBitmap: (() => void) | null = null;

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      drawSource = bitmap;
      closeBitmap = () => bitmap.close();
    } else if (typeof Image !== 'undefined' && typeof URL !== 'undefined') {
      const img = await loadImageElement(file);
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      drawSource = img;
    }

    if (!drawSource || sourceWidth <= 0 || sourceHeight <= 0) {
      closeBitmap?.();
      return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      closeBitmap?.();
      return file;
    }

    ctx.drawImage(drawSource, 0, 0, targetWidth, targetHeight);
    closeBitmap?.();

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', WEBP_QUALITY);
    });

    if (
      !compressedBlob ||
      compressedBlob.type !== 'image/webp' ||
      (scale === 1 && compressedBlob.size >= file.size)
    ) {
      return file;
    }

    return new File([compressedBlob], replaceExtensionWithWebp(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  }
};

export const uploadImageToStorage = async (
  tenantId: string,
  file: File,
  pathFolder: StorageImageFolder
): Promise<string> => {
  const validTenantId = assertValidTenantId(tenantId);

  if (!file) {
    throw new Error('No se seleccionó ningún archivo para subir.');
  }

  const preparedFile = await compressImageForUpload(file, pathFolder);

  if (preparedFile.size > MAX_STORAGE_UPLOAD_BYTES) {
    throw new Error(
      'La imagen supera el límite permitido de 5 MB incluso tras optimizarla. Probá con un archivo más liviano.'
    );
  }

  const objectPath = buildTenantStoragePath(validTenantId, pathFolder, preparedFile.name);
  const storageRef = ref(getStorageInstance(), objectPath);

  const metadata = {
    contentType: preparedFile.type || 'image/jpeg',
    cacheControl: 'public,max-age=31536000,immutable',
  };

  const snapshot = await uploadBytes(storageRef, preparedFile, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return downloadUrl;
};

const isManagedFirebaseStorageUrl = (imageUrl: string): boolean => {
  if (!imageUrl) return false;
  return (
    imageUrl.includes('firebasestorage.googleapis.com') ||
    imageUrl.includes('.firebasestorage.app') ||
    imageUrl.includes('localhost:9199') ||
    imageUrl.includes('127.0.0.1:9199')
  );
};

export const deleteImageFromStorage = async (
  tenantId: string,
  imageUrl: string
): Promise<void> => {
  const cleanTenantId = String(tenantId ?? '').trim();
  if (!TENANT_ID_REGEX.test(cleanTenantId)) {
    console.warn('[Storage] Eliminación abortada: tenantId inválido.');
    return;
  }

  if (!isManagedFirebaseStorageUrl(imageUrl)) {
    return;
  }

  try {
    const imageRef = ref(getStorageInstance(), imageUrl);
    if (!isTenantStoragePath(cleanTenantId, imageRef.fullPath)) {
      console.warn(
        `[Storage] Eliminación bloqueada: el archivo "${imageRef.fullPath}" no pertenece al tenant "${cleanTenantId}".`
      );
      return;
    }
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('[Storage] No se pudo eliminar la imagen anterior:', error);
  }
};
