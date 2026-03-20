import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './client';

export async function uploadImage(file: File): Promise<string> {
  const fileRef = ref(storage, `ad-images/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
