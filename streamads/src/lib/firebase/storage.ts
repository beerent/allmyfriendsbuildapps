import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './client';

export async function uploadImage(file: File): Promise<string> {
  const fileRef = ref(getFirebaseStorage(), `ad-images/${crypto.randomUUID()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
