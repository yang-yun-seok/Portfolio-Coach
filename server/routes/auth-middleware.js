function extractBearerToken(req) {
  const header = req.get('authorization') || req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function assertActiveAccount(access) {
  if (access?.active !== false) return;
  const error = new Error('비활성화된 계정입니다. 관리자에게 문의해 주세요.');
  error.statusCode = 403;
  throw error;
}

async function loadUserAccess(firebaseAdminService, uid) {
  try {
    return await firebaseAdminService.getUserAccess(uid);
  } catch {
    const error = new Error('계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    error.statusCode = 503;
    throw error;
  }
}

export function createAuthMiddleware({ firebaseAdminService }) {
  async function requireAuth(req, res, next) {
    if (!firebaseAdminService?.authRequired) {
      req.authUser = null;
      return next();
    }

    if (!firebaseAdminService.configReady) {
      return res.status(503).json({
        error: firebaseAdminService.initError || 'Firebase 인증 설정이 서버에 아직 적용되지 않았습니다.',
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    try {
      const decoded = await firebaseAdminService.verifyIdToken(token);
      const access = await loadUserAccess(firebaseAdminService, decoded.uid);
      assertActiveAccount(access);
      req.authUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        role: access.role,
      };
      return next();
    } catch (error) {
      return res.status(error.statusCode || 401).json({ error: error.message || '인증 검증에 실패했습니다.' });
    }
  }

  async function requireAdmin(req, res, next) {
    if (!firebaseAdminService?.canVerifyTokens) {
      return res.status(503).json({
        error: firebaseAdminService?.initError || 'Firebase 관리자 인증 설정이 서버에 아직 적용되지 않았습니다.',
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    try {
      const decoded = await firebaseAdminService.verifyIdToken(token, { checkRevoked: true });
      const access = await loadUserAccess(firebaseAdminService, decoded.uid);
      assertActiveAccount(access);
      req.authUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        role: access.role,
      };

      if (access.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
      }

      return next();
    } catch (error) {
      return res.status(error.statusCode || 401).json({ error: error.message || '인증 검증에 실패했습니다.' });
    }
  }

  return {
    requireAuth,
    requireAdmin,
  };
}
