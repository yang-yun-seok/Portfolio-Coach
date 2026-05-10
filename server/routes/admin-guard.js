export function isAdminFeatureEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_ADMIN_CRAWL === 'true';
}

export function isAuthorizedAdminRequest(req) {
  if (!isAdminFeatureEnabled()) return false;

  const expectedToken = process.env.ADMIN_CRAWL_TOKEN;
  if (!expectedToken) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedToken = req.get('x-admin-token') || req.query.adminToken;
  return providedToken === expectedToken;
}

export function enforceAdminCrawlAccess(req, res) {
  if (!isAdminFeatureEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }

  if (!isAuthorizedAdminRequest(req)) {
    res.status(403).json({ error: 'Admin authorization required.' });
    return false;
  }

  return true;
}
