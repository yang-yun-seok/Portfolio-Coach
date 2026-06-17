import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
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
const GOOGLE_PROVIDER_ID = 'google.com';
const MAX_STUDENT_NAME_LENGTH = 40;

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function isGoogleSignedInUser(user) {
  return user?.providerData?.some((provider) => provider.providerId === GOOGLE_PROVIDER_ID);
}

function getReadableAuthError(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
      return 'Google 로그인이 취소되었습니다.';
    case 'auth/account-exists-with-different-credential':
      return '이미 다른 로그인 방식으로 가입된 이메일입니다. Firebase Authentication에서 Google 제공업체 연결 상태를 확인해 주세요.';
    case 'auth/unauthorized-domain':
      return '현재 도메인이 Firebase 승인 도메인에 등록되어 있지 않습니다.';
    case 'auth/operation-not-allowed':
      return 'Firebase Authentication에서 Google 로그인 제공업체가 활성화되어 있지 않습니다.';
    default:
      return error?.message || 'Google 로그인에 실패했습니다.';
  }
}

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

      if (!isGoogleSignedInUser(nextUser)) {
        await signOut(firebaseAuth);
        if (!active) return;
        setAuthUser(null);
        setUserProfile(null);
        setAuthError('Google 계정으로 다시 로그인해 주세요.');
        setAuthLoading(false);
        return;
      }

      try {
        const userRef = doc(firebaseDb, 'users', nextUser.uid);
        const snapshot = await getDoc(userRef);
        const baseProfile = {
          email: nextUser.email || '',
          displayName: nextUser.displayName || '',
          photoURL: nextUser.photoURL || '',
          role: DEFAULT_ROLE,
          trackDefault: '기획',
          active: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          authProvider: GOOGLE_PROVIDER_ID,
        };

        const nextProfile = snapshot.exists()
          ? { ...baseProfile, ...snapshot.data(), lastLoginAt: new Date().toISOString(), authProvider: GOOGLE_PROVIDER_ID }
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

  const signIn = useCallback(async () => {
    if (!firebaseAuth) {
      throw new Error('Firebase 인증이 활성화되어 있지 않습니다.');
    }

    setAuthError('');
    const provider = createGoogleProvider();

    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      await signInWithPopup(firebaseAuth, provider);
    } catch (error) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(firebaseAuth, provider);
        return;
      }
      throw new Error(getReadableAuthError(error));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
  }, []);

  const updateUserDisplayName = useCallback(async (name) => {
    if (!firebaseAuth?.currentUser || !firebaseDb) {
      throw new Error('로그인 정보가 없습니다.');
    }

    const trimmedName = String(name || '').trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
      throw new Error('이름을 입력해 주세요.');
    }
    if (trimmedName.length > MAX_STUDENT_NAME_LENGTH) {
      throw new Error(`이름은 ${MAX_STUDENT_NAME_LENGTH}자 이하로 입력해 주세요.`);
    }

    const currentUser = firebaseAuth.currentUser;
    const updatedAt = new Date().toISOString();
    const nextProfilePatch = {
      displayName: trimmedName,
      studentName: trimmedName,
      email: currentUser.email || '',
      photoURL: currentUser.photoURL || '',
      authProvider: GOOGLE_PROVIDER_ID,
      active: true,
      nameUpdatedAt: updatedAt,
      lastLoginAt: updatedAt,
    };

    await updateProfile(currentUser, { displayName: trimmedName });
    await setDoc(doc(firebaseDb, 'users', currentUser.uid), nextProfilePatch, { merge: true });
    setAuthUser(currentUser);
    setUserProfile((currentProfile) => ({
      ...(currentProfile || {}),
      ...nextProfilePatch,
    }));

    return nextProfilePatch;
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
    updateUserDisplayName,
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
    updateUserDisplayName,
    getAccessToken,
  ]);
}
