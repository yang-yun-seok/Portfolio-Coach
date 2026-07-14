import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_SIGN_IN_MODES,
  shouldFallbackToRedirect,
  startGoogleSignIn,
} from '../src/lib/google-sign-in.js';

const auth = { id: 'auth' };
const provider = { id: 'provider' };

function createDependencies({ popupError } = {}) {
  const calls = [];
  return {
    calls,
    options: {
      auth,
      provider,
      setPersistenceImpl: async (receivedAuth) => {
        calls.push(['persistence', receivedAuth]);
      },
      popupImpl: async (receivedAuth, receivedProvider) => {
        calls.push(['popup', receivedAuth, receivedProvider]);
        if (popupError) throw popupError;
      },
      redirectImpl: async (receivedAuth, receivedProvider) => {
        calls.push(['redirect', receivedAuth, receivedProvider]);
      },
    },
  };
}

test('starts redirect sign-in without opening a popup', async () => {
  const { calls, options } = createDependencies();

  const result = await startGoogleSignIn({
    ...options,
    mode: GOOGLE_SIGN_IN_MODES.REDIRECT,
  });

  assert.deepEqual(result, { mode: GOOGLE_SIGN_IN_MODES.REDIRECT });
  assert.deepEqual(calls, [
    ['persistence', auth],
    ['redirect', auth, provider],
  ]);
});

test('keeps a successful popup sign-in on the popup path', async () => {
  const { calls, options } = createDependencies();

  const result = await startGoogleSignIn(options);

  assert.deepEqual(result, { mode: GOOGLE_SIGN_IN_MODES.POPUP });
  assert.deepEqual(calls, [
    ['persistence', auth],
    ['popup', auth, provider],
  ]);
});

for (const code of ['auth/popup-blocked', 'auth/web-storage-unsupported']) {
  test(`falls back to redirect for ${code}`, async () => {
    const { calls, options } = createDependencies({ popupError: { code } });

    const result = await startGoogleSignIn(options);

    assert.equal(shouldFallbackToRedirect({ code }), true);
    assert.deepEqual(result, { mode: GOOGLE_SIGN_IN_MODES.REDIRECT });
    assert.deepEqual(calls, [
      ['persistence', auth],
      ['popup', auth, provider],
      ['redirect', auth, provider],
    ]);
  });
}

test('does not redirect after the user closes the popup', async () => {
  const popupError = { code: 'auth/popup-closed-by-user' };
  const { calls, options } = createDependencies({ popupError });

  await assert.rejects(startGoogleSignIn(options), (error) => error === popupError);

  assert.equal(shouldFallbackToRedirect(popupError), false);
  assert.deepEqual(calls, [
    ['persistence', auth],
    ['popup', auth, provider],
  ]);
});
