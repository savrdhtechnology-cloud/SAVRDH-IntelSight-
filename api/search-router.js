import deepSearch from './deep-search.js';
import companySearch from './company-search.js';
import mobileSearch from './mobile-search.js';

function looksLikeCompany(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  return /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\.?\s+limited|limited|ltd\.?|llp|incorporated|inc\.?|corporation|corp\.?|company|co\.?|technologies|technology|financials?|capital|industries|enterprises|solutions|foods|group)\b/i.test(raw);
}

function looksLikeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91')) || (digits.length === 11 && digits.startsWith('0'));
}

export default async function handler(req, res) {
  const query = req.body?.query;
  const requestedType = req.body?.type;

  if (requestedType === 'company' || looksLikeCompany(query)) {
    req.body = { ...(req.body || {}), type: 'company' };
    return companySearch(req, res);
  }

  if (requestedType === 'mobile' || looksLikeMobile(query)) {
    req.body = { ...(req.body || {}), type: 'mobile' };
    return mobileSearch(req, res);
  }

  return deepSearch(req, res);
}
