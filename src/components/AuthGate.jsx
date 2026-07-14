import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, LogIn } from 'lucide-react';
import { GOOGLE_SIGN_IN_MODES } from '../lib/google-sign-in';

const LOGIN_RECOVERY_DELAY_MS = 4000;

function AuthLoadingScreen() {
  return (
    <main className="coach-auth-shell">
      <section className="coach-auth-card">
        <div className="coach-auth-logo">
          <LockKeyhole size={26} />
        </div>
        <h1>로그인 상태를 확인하고 있습니다</h1>
        <p>Google 계정 세션을 확인하는 중입니다. 잠시만 기다려 주세요.</p>
        <div className="coach-auth-status">
          <Loader2 size={18} className="animate-spin" />
          인증 정보 확인 중
        </div>
      </section>
    </main>
  );
}

function AuthErrorScreen() {
  return (
    <main className="coach-auth-shell">
      <section className="coach-auth-card">
        <div className="coach-auth-logo is-warning">
          <AlertCircle size={26} />
        </div>
        <h1>로그인 설정 확인이 필요합니다</h1>
        <p>현재 로그인 기능을 사용할 수 없습니다. 관리자에게 문의해 주세요.</p>
        <div className="coach-auth-note">
          <strong>안내</strong>
          <span>수업 담당자가 설정을 확인한 뒤 다시 이용할 수 있습니다.</span>
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ onSignIn, error, recoveryDelayMs = LOGIN_RECOVERY_DELAY_MS }) {
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [localError, setLocalError] = useState('');
  const recoveryTimerRef = useRef(null);
  const redirectRequestedRef = useRef(false);

  const clearRecoveryTimer = () => {
    if (!recoveryTimerRef.current) return;
    window.clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = null;
  };

  useEffect(() => () => {
    if (recoveryTimerRef.current) window.clearTimeout(recoveryTimerRef.current);
  }, []);

  const handleGoogleSignIn = async () => {
    if (submitting || redirecting) return;
    redirectRequestedRef.current = false;
    setSubmitting(true);
    setShowRecovery(false);
    setLocalError('');
    clearRecoveryTimer();
    recoveryTimerRef.current = window.setTimeout(() => {
      setShowRecovery(true);
    }, recoveryDelayMs);

    try {
      await onSignIn({ mode: GOOGLE_SIGN_IN_MODES.POPUP });
    } catch (submitError) {
      if (!redirectRequestedRef.current) {
        setLocalError(submitError.message || 'Google 로그인에 실패했습니다.');
      }
    } finally {
      clearRecoveryTimer();
      if (!redirectRequestedRef.current) {
        setSubmitting(false);
        setShowRecovery(false);
      }
    }
  };

  const handleRedirectSignIn = async () => {
    if (redirecting) return;
    redirectRequestedRef.current = true;
    clearRecoveryTimer();
    setRedirecting(true);
    setLocalError('');

    try {
      await onSignIn({ mode: GOOGLE_SIGN_IN_MODES.REDIRECT });
    } catch (redirectError) {
      redirectRequestedRef.current = false;
      setSubmitting(false);
      setShowRecovery(false);
      setLocalError(redirectError.message || 'Google 로그인 페이지로 이동하지 못했습니다.');
      setRedirecting(false);
    }
  };

  return (
    <main className="coach-auth-shell">
      <section className="coach-auth-card">
        <div className="coach-auth-logo">
          <LogIn size={26} />
        </div>
        <h1>Google 로그인 후 이용할 수 있습니다</h1>
        <p>
          수업용 계정을 확인한 뒤 포트폴리오 코치를 이용할 수 있습니다.
        </p>

        {(localError || error) ? (
          <div className="coach-auth-error">
            <AlertCircle size={15} />
            <span>{localError || error}</span>
          </div>
        ) : null}

        <div className="coach-auth-form">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting || redirecting}
            aria-describedby={showRecovery ? 'google-login-recovery' : undefined}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {submitting ? '로그인 창 확인 중' : 'Google로 로그인'}
          </button>

          {showRecovery ? (
            <div id="google-login-recovery" className="coach-auth-recovery" role="status" aria-live="polite">
              <p>로그인 창이 보이지 않으면 현재 페이지에서 안전하게 계속할 수 있습니다.</p>
              <button
                type="button"
                className="coach-auth-redirect-button"
                disabled={redirecting}
                onClick={handleRedirectSignIn}
              >
                {redirecting ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
                {redirecting ? '로그인 페이지로 이동 중' : '현재 페이지에서 로그인 계속'}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function AuthGate({
  authEnabled,
  authLoading,
  authUser,
  configReady,
  authError,
  onSignIn,
  children,
}) {
  const localSmokeMode = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const allowedHosts = new Set(['127.0.0.1', 'localhost']);
    const search = new URLSearchParams(window.location.search);
    if (!allowedHosts.has(window.location.hostname)) return '';
    return search.get('smoke') || '';
  }, []);

  if (localSmokeMode === '1') return children;
  if (localSmokeMode === 'auth') {
    return (
      <LoginScreen
        error=""
        onSignIn={() => new Promise(() => {})}
        recoveryDelayMs={100}
      />
    );
  }
  if (!authEnabled) return children;
  if (!configReady) {
    return <AuthErrorScreen />;
  }
  if (authLoading) return <AuthLoadingScreen />;
  if (!authUser) return <LoginScreen onSignIn={onSignIn} error={authError} />;
  return children;
}
