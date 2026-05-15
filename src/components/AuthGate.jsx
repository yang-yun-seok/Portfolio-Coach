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
        <p>세션을 복구하는 중입니다. 잠시만 기다려 주세요.</p>
        <div className="coach-auth-status">
          <Loader2 size={18} className="animate-spin" />
          인증 정보 확인 중
        </div>
      </section>
    </main>
  );
}

function AuthErrorScreen({ message }) {
  return (
    <main className="coach-auth-shell">
      <section className="coach-auth-card">
        <div className="coach-auth-logo is-warning">
          <AlertCircle size={26} />
        </div>
        <h1>로그인 구성이 필요합니다</h1>
        <p>{message}</p>
        <div className="coach-auth-note">
          <strong>필요한 값</strong>
          <span>
            VITE_FIREBASE_AUTH_ENABLED, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
            VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_APP_ID
          </span>
        </div>
      </section>
    </main>
  );
}

function LoginScreen({ onSubmit, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLocalError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setLocalError('');
    try {
      await onSubmit(email, password);
    } catch (submitError) {
      setLocalError(submitError.message || '로그인에 실패했습니다.');
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
        <h1>로그인 후 이용할 수 있습니다</h1>
        <p>공개 회원가입은 열지 않습니다. 계정이 없다면 관리자에게 발급을 요청해야 합니다.</p>

        <form className="coach-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </label>

          {(localError || error) ? (
            <div className="coach-auth-error">
              <AlertCircle size={15} />
              <span>{localError || error}</span>
            </div>
          ) : null}

          <button type="submit" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            로그인
          </button>
        </form>
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
    return <AuthErrorScreen message={authError || 'Firebase 클라이언트 설정이 완전하지 않습니다.'} />;
  }
  if (authLoading) return <AuthLoadingScreen />;
  if (!authUser) return <LoginScreen onSubmit={onSignIn} error={authError} />;
  return children;
}
