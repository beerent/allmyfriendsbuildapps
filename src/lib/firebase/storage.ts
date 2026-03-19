import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './client';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImage(file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const fileRef = ref(storage, `ad-images/${uuidv4()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
