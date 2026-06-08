function extractBearerToken(req) {
  const header = req.get('authorization') || req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
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
      const role = await firebaseAdminService.getUserRole(decoded.uid);
      req.authUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        role,
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: error.message || '인증 검증에 실패했습니다.' });
    }
  }

  async function requireAdmin(req, res, next) {
    await requireAuth(req, res, async () => {
      if (req.authUser?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
      }
      return next();
    });
  }

  return {
    requireAuth,
    requireAdmin,
  };
}
