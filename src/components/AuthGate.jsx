import React, { useMemo, useState } from 'react';
import { AlertCircle, Loader2, LockKeyhole, LogIn } from 'lucide-react';

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

function LoginScreen({ onSignIn, error }) {
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setLocalError('');
    try {
      await onSignIn();
    } catch (submitError) {
      setLocalError(submitError.message || 'Google 로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
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
            disabled={submitting}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            Google로 로그인
          </button>
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
  const isLocalSmokeBypass = useMemo(() => {
    if (!authEnabled || typeof window === 'undefined') return false;
    const allowedHosts = new Set(['127.0.0.1', 'localhost']);
    const search = new URLSearchParams(window.location.search);
    return allowedHosts.has(window.location.hostname) && search.get('smoke') === '1';
  }, [authEnabled]);

  if (isLocalSmokeBypass) return children;
  if (!authEnabled) return children;
  if (!configReady) {
    return <AuthErrorScreen />;
  }
  if (authLoading) return <AuthLoadingScreen />;
  if (!authUser) return <LoginScreen onSignIn={onSignIn} error={authError} />;
  return children;
}
