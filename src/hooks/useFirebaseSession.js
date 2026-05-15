import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  firebaseAuth,
  firebaseConfigIssues,
  firebaseDb,
  isFirebaseAuthEnabled,
  isFirebaseClientReady,
} from '../lib/firebase-client';

const DEFAULT_ROLE = 'user';

export function useFirebaseSession() {
  const [authLoading, setAuthLoading] = useState(isFirebaseAuthEnabled);
  const [authUser, setAuthUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isFirebaseAuthEnabled) {
      setAuthLoading(false);
      return undefined;
    }

    if (!isFirebaseClientReady || !firebaseAuth || !firebaseDb) {
      setAuthLoading(false);
      setAuthError(`Firebase 설정이 완전하지 않습니다. ${firebaseConfigIssues.join(', ')}`);
      return undefined;
    }

    let active = true;
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      if (!active) return;

      setAuthUser(nextUser);
      setAuthError('');

      if (!nextUser) {
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }

      try {
        const userRef = doc(firebaseDb, 'users', nextUser.uid);
        const snapshot = await getDoc(userRef);
        const baseProfile = {
          email: nextUser.email || '',
          displayName: nextUser.displayName || '',
          role: DEFAULT_ROLE,
          trackDefault: '기획',
          active: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        const nextProfile = snapshot.exists()
          ? { ...baseProfile, ...snapshot.data(), lastLoginAt: new Date().toISOString() }
          : baseProfile;

        await setDoc(userRef, nextProfile, { merge: true });
        if (!active) return;
        setUserProfile(nextProfile);
      } catch (error) {
        if (!active) return;
        setAuthError(error.message || '사용자 정보를 불러오지 못했습니다.');
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!firebaseAuth) {
      throw new Error('Firebase 인증이 활성화되지 않았습니다.');
    }
    await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  }, []);

  const signOutUser = useCallback(async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
  }, []);

  const getAccessToken = useCallback(async () => {
    if (!authUser) return '';
    return authUser.getIdToken();
  }, [authUser]);

  return useMemo(() => ({
    authEnabled: isFirebaseAuthEnabled,
    authLoading,
    authUser,
    authError,
    userProfile,
    role: userProfile?.role || DEFAULT_ROLE,
    isAdmin: userProfile?.role === 'admin',
    signIn,
    signOutUser,
    getAccessToken,
    configReady: isFirebaseClientReady,
    configIssues: firebaseConfigIssues,
  }), [
    authLoading,
    authUser,
    authError,
    userProfile,
    signIn,
    signOutUser,
    getAccessToken,
  ]);
}
