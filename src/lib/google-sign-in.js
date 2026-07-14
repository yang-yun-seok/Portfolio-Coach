export const GOOGLE_SIGN_IN_MODES = Object.freeze({
  POPUP: 'popup',
  REDIRECT: 'redirect',
});

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/web-storage-unsupported',
]);

export function shouldFallbackToRedirect(error) {
  return POPUP_FALLBACK_CODES.has(error?.code);
}

export async function startGoogleSignIn({
  auth,
  mode = GOOGLE_SIGN_IN_MODES.POPUP,
  provider,
  setPersistenceImpl,
  popupImpl,
  redirectImpl,
}) {
  await setPersistenceImpl(auth);

  if (mode === GOOGLE_SIGN_IN_MODES.REDIRECT) {
    await redirectImpl(auth, provider);
    return { mode: GOOGLE_SIGN_IN_MODES.REDIRECT };
  }

  try {
    await popupImpl(auth, provider);
    return { mode: GOOGLE_SIGN_IN_MODES.POPUP };
  } catch (error) {
    if (!shouldFallbackToRedirect(error)) throw error;
    await redirectImpl(auth, provider);
    return { mode: GOOGLE_SIGN_IN_MODES.REDIRECT };
  }
}
