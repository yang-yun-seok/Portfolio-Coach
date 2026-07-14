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
  firebaseAuth,
  firebaseConfigIssues,
  isFirebaseAuthEnabled,
  isFirebaseClientReady,
  loadFirebaseFirestore,
} from '../lib/firebase-client';
import { GOOGLE_SIGN_IN_MODES, startGoogleSignIn } from '../lib/google-sign-in';

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
      return '이미 다른 로그인 방식으로 가입된 이메일입니다. 관리자에게 문의해 주세요.';
    case 'auth/unauthorized-domain':
      return '현재 주소에서는 로그인할 수 없습니다. 관리자에게 문의해 주세요.';
    case 'auth/operation-not-allowed':
      return 'Google 로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.';
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

    if (!isFirebaseClientReady || !firebaseAuth) {
      setAuthLoading(false);
      setAuthError('로그인 설정이 완전하지 않습니다. 관리자에게 문의해 주세요.');
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
        const firestore = await loadFirebaseFirestore();
        if (!firestore) throw new Error('Firebase 프로필 저장소를 준비하지 못했습니다.');
        if (!active) return;
        const userRef = firestore.doc(firestore.db, 'users', nextUser.uid);
        const snapshot = await firestore.getDoc(userRef);
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

        if (nextProfile.active === false) {
          await signOut(firebaseAuth);
          if (!active) return;
          setAuthUser(null);
          setUserProfile(null);
          setAuthError('비활성화된 계정입니다. 관리자에게 문의해 주세요.');
          return;
        }

        await firestore.setDoc(userRef, nextProfile, { merge: true });
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

  const signIn = useCallback(async ({ mode = GOOGLE_SIGN_IN_MODES.POPUP } = {}) => {
    if (!firebaseAuth) {
      throw new Error('로그인 기능이 아직 활성화되어 있지 않습니다.');
    }

    setAuthError('');
    const provider = createGoogleProvider();

    try {
      await startGoogleSignIn({
        auth: firebaseAuth,
        mode,
        provider,
        setPersistenceImpl: (auth) => setPersistence(auth, browserLocalPersistence),
        popupImpl: signInWithPopup,
        redirectImpl: signInWithRedirect,
      });
    } catch (error) {
      throw new Error(getReadableAuthError(error));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
  }, []);

  const updateUserDisplayName = useCallback(async (name) => {
    if (!firebaseAuth?.currentUser) {
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
    const firestore = await loadFirebaseFirestore();
    if (!firestore) throw new Error('Firebase 프로필 저장소를 준비하지 못했습니다.');
    const updatedAt = new Date().toISOString();
    const nextProfilePatch = {
      displayName: trimmedName,
      studentName: trimmedName,
      email: currentUser.email || '',
      photoURL: currentUser.photoURL || '',
      authProvider: GOOGLE_PROVIDER_ID,
      nameUpdatedAt: updatedAt,
      lastLoginAt: updatedAt,
    };

    await updateProfile(currentUser, { displayName: trimmedName });
    await firestore.setDoc(
      firestore.doc(firestore.db, 'users', currentUser.uid),
      nextProfilePatch,
      { merge: true },
    );
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
