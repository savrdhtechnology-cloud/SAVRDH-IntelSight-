import companySearch from './company-search.js';
import unifiedSearch from './unified-search.js';

function looksLikeCompany(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\.?\s+limited|limited|ltd\.?|llp|incorporated|inc\.?|corporation|corp\.?|company|co\.?|technologies|technology|financials?|capital|industries|enterprises|solutions|foods|group)\b/i.test(raw);
}

export default async function handler(req, res) {
  const query = req.body?.query;
  const requestedType = req.body?.type;

  if (requestedType === 'company' || looksLikeCompany(query)) {
    req.body = { ...(req.body || {}), type: 'company' };
    return companySearch(req, res);
  }

  return unifiedSearch(req, res);
}
