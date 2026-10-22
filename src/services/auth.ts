import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebaseConfig';
import type { AuthUser } from '../types';

export const mapFirebaseUser = (user: FirebaseUser | null): AuthUser | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Administrador',
  };
};

export const loginWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const mappedUser = mapFirebaseUser(userCredential.user);
  if (!mappedUser) {
    throw new Error('No se pudo recuperar la información del usuario.');
  }
  return mappedUser;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const onAuthChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(mapFirebaseUser(user));
  });
};
