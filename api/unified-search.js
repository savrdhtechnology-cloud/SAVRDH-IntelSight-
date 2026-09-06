const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const STRICT_TYPES = new Set(['email', 'mobile']);
const ALLOWED_TYPES = new Set(['email', 'mobile', 'username', 'domain']);

const SOCIAL_GROUPS = [
  { name: 'Meta Social', domains: ['facebook.com', 'instagram.com', 'threads.net'] },
  { name: 'LinkedIn', domains: ['linkedin.com'] },
  { name: 'X & Reddit', domains: ['x.com', 'twitter.com', 'reddit.com'] },
  { name: 'Developer Social', domains: ['github.com', 'gitlab.com', 'medium.com', 'dev.to', 'npmjs.com'] },
  { name: 'Video Social', domains: ['youtube.com', 'tiktok.com'] },
  { name: 'Discovery Social', domains: ['pinterest.com', 'quora.com'] },
  { name: 'Public Telegram', domains: ['t.me', 'telegram.me'] },
  { name: 'Professional Profiles', domains: ['stackoverflow.com', 'stackexchange.com', 'kaggle.com', 'behance.net', 'dribbble.com', 'about.me'] },
];

const BUSINESS_DOMAINS = [
  'justdial.com', 'indiamart.com', 'tradeindia.com', 'sulekha.com',
  'exportersindia.com', 'dial4trade.com', 'clickindia.com', 'quikr.com',
];

const HOST_LABELS = {
  'facebook.com': 'Facebook', 'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram', 'www.instagram.com': 'Instagram',
  'threads.net': 'Threads', 'www.threads.net': 'Threads',
  'linkedin.com': 'LinkedIn', 'www.linkedin.com': 'LinkedIn',
  'x.com': 'X', 'www.x.com': 'X',
  'twitter.com': 'X / Twitter', 'www.twitter.com': 'X / Twitter',
  'reddit.com': 'Reddit', 'www.reddit.com': 'Reddit',
  'github.com': 'GitHub', 'www.github.com': 'GitHub',
  'gitlab.com': 'GitLab', 'www.gitlab.com': 'GitLab',
  'medium.com': 'Medium', 'www.medium.com': 'Medium',
  'dev.to': 'DEV Community', 'www.dev.to': 'DEV Community',
  'npmjs.com': 'npm', 'www.npmjs.com': 'npm',
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube',
  'tiktok.com': 'TikTok', 'www.tiktok.com': 'TikTok',
  'pinterest.com': 'Pinterest', 'www.pinterest.com': 'Pinterest',
  'quora.com': 'Quora', 'www.quora.com': 'Quora',
  't.me': 'Telegram Public', 'telegram.me': 'Telegram Public',
  'stackoverflow.com': 'Stack Overflow', 'www.stackoverflow.com': 'Stack Overflow',
  'stackexchange.com': 'Stack Exchange', 'www.stackexchange.com': 'Stack Exchange',
  'kaggle.com': 'Kaggle', 'www.kaggle.com': 'Kaggle',
  'behance.net': 'Behance', 'www.behance.net': 'Behance',
  'dribbble.com': 'Dribbble', 'www.dribbble.com': 'Dribbble',
  'about.me': 'About.me', 'www.about.me': 'About.me',
  'justdial.com': 'Justdial', 'www.justdial.com': 'Justdial',
  'indiamart.com': 'IndiaMART', 'www.indiamart.com': 'IndiaMART',
  'tradeindia.com': 'TradeIndia', 'www.tradeindia.com': 'TradeIndia',
  'sulekha.com': 'Sulekha', 'www.sulekha.com': 'Sulekha',
  'exportersindia.com': 'ExportersIndia', 'www.exportersindia.com': 'ExportersIndia',
  'dial4trade.com': 'Dial4Trade', 'www.dial4trade.com': 'Dial4Trade',
  'clickindia.com': 'ClickIndia', 'www.clickindia.com': 'ClickIndia',
  'quikr.com': 'Quikr', 'www.quikr.com': 'Quikr',
};

const BUSINESS_HOSTS = new Set(BUSINESS_DOMAINS.flatMap((domain) => [domain, `www.${domain}`]));
const ALL_SOCIAL_DOMAINS = [...new Set(SOCIAL_GROUPS.flatMap((group) => group.domains))];

const sendJson = (res, status, payload) => {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const isoNow = () => new Date().toISOString();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const safeText = (value, max = 6000) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);
const sourceId = (prefix, value) => `${prefix}-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 90)}`;

function inferType(value) {
  const raw = String(value || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'email';
  if (/^\+?[\d\s().-]{7,20}$/.test(raw)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'domain';
  return 'username';
}

function normalize(value, type) {
  const raw = String(value || '').trim().slice(0, 180);
  if (type === 'email') return raw.toLowerCase();
  if (type === 'mobile') {
    const digits = digitsOnly(raw);
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
  }
  if (type === 'domain') return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  return raw.replace(/^@/, '');
}

function decodePublicText(value) {
  let text = String(value || '');
  text = text
    .replace(/&#64;|&#x40;|&commat;/gi, '@')
    .replace(/&#46;|&#x2e;/gi, '.')
    .replace(/&period;/gi, '.');
  try { text = decodeURIComponent(text); } catch { /* keep original */ }
  return text;
}

function normalizedEmailText(value) {
  return decodePublicText(value)
    .toLowerCase()
    .replace(/\s*[\[(\{]\s*at\s*[\])\}]\s*/gi, '@')
    .replace(/\s*[\[(\{]\s*dot\s*[\])\}]\s*/gi, '.')
    .replace(/\s*@\s*/g, '@')
    .replace(/\s*\.\s*/g, '.');
}

function emailObservation(text, email) {
  const decoded = decodePublicText(text).toLowerCase();
  if (decoded.includes(email.toLowerCase())) return { exact: true, basis: 'Exact public email text' };
  const canonical = normalizedEmailText(text);
  if (canonical.includes(email.toLowerCase())) return { exact: true, basis: 'Exact email after public text normalization' };
  return { exact: false, basis: null };
}

function phoneCore(value) {
  const digits = digitsOnly(value);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits.length === 10 ? digits : '';
}

function phoneCandidates(text) {
  const decoded = decodePublicText(text);
  const matches = decoded.match(/(?:\+?\d[\d\s().-]{7,18}\d)/g) || [];
  return matches.map((candidate) => digitsOnly(candidate)).filter((digits) => digits.length >= 10 && digits.length <= 13);
}

function mobileObservation(text, mobile) {
  const wanted = phoneCore(mobile);
  if (wanted.length !== 10) return { exact: false, basis: null };
  for (const candidate of phoneCandidates(text)) {
    const core = phoneCore(candidate);
    if (core && core === wanted) {
      return { exact: true, basis: candidate === wanted ? 'Exact 10-digit mobile number' : 'Exact normalized Indian mobile number' };
    }
  }
  return { exact: false, basis: null };
}

function identifierObservation(text, identifier, type) {
  if (type === 'email') return emailObservation(text, identifier);
  if (type === 'mobile') return mobileObservation(text, identifier);
  const haystack = decodePublicText(text).toLowerCase();
  const exact = haystack.includes(String(identifier).toLowerCase());
  return { exact, basis: exact ? `Exact ${type} identifier` : null };
}

function hostInfo(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const normalized = host.replace(/^www\./, '');
    return {
      host,
      label: HOST_LABELS[host] || HOST_LABELS[normalized] || 'Indexed Public Web',
      business: BUSINESS_HOSTS.has(host) || BUSINESS_HOSTS.has(normalized),
      social: Boolean(HOST_LABELS[host] || HOST_LABELS[normalized]) && !BUSINESS_HOSTS.has(host) && !BUSINESS_HOSTS.has(normalized),
    };
  } catch {
    return { host: '', label: 'Indexed Public Web', business: false, social: false };
  }
}

function queryVariants(identifier, type) {
  if (type === 'email') {
    const [local, domain] = identifier.split('@');
    return [
      `"${identifier}"`,
      `"${local}" "${domain}"`,
      `"${local}" "@${domain}"`,
      `"${identifier}" contact`,
      `"${identifier}" profile`,
    ];
  }

  if (type === 'mobile') {
    const core = phoneCore(identifier);
    if (!core) return [];
    return [
      `"${core}"`,
      `"+91 ${core.slice(0, 5)} ${core.slice(5)}"`,
      `"${core.slice(0, 5)} ${core.slice(5)}"`,
      `"${core.slice(0, 5)}-${core.slice(5)}"`,
      `"91${core}" WhatsApp`,
      `"${core}" contact`,
    ];
  }

  if (type === 'domain') return [`"${identifier}"`, identifier];
  return [`"${identifier}"`, identifier, `"@${identifier}"`];
}

async function tavilySearch(query, includeDomains = null) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const body = {
    query: String(query).slice(0, 390),
    search_depth: 'advanced',
    topic: 'general',
    max_results: 12,
    chunks_per_source: 3,
    include_answer: false,
    include_raw_content: true,
  };
  if (Array.isArray(includeDomains) && includeDomains.length) body.include_domains = includeDomains;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(`Tavily search ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function tavilyExtract(urls) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !urls.length) return [];
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ urls: urls.slice(0, 12), extract_depth: 'advanced', include_images: false }),
    signal: AbortSignal.timeout(18000),
  }).catch(() => null);
  if (!response?.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

function dedupeCandidates(items) {
  const map = new Map();
  for (const item of items) {
    const url = String(item?.url || '').trim();
    if (!url) continue;
    const key = url.toLowerCase().replace(/\/$/, '');
    const existing = map.get(key);
    if (!existing || Number(item?.score || 0) > Number(existing?.score || 0)) map.set(key, item);
  }
  return [...map.values()];
}

function dedupeEvidence(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url || item.title || '').toLowerCase().replace(/\/$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidateToEvidence(candidate, identifier, type, scanGroup, extractedRaw = '') {
  const url = String(candidate?.url || '').trim();
  if (!url) return null;
  const title = safeText(candidate?.title, 280) || 'Public web result';
  const content = safeText(candidate?.content, 1800);
  const raw = safeText(candidate?.raw_content, 7000);
  const extracted = safeText(extractedRaw, 7000);
  const combined = `${url}\n${title}\n${content}\n${raw}\n${extracted}`;
  const observed = identifierObservation(combined, identifier, type);
  if (!observed.exact) return null;

  const info = hostInfo(url);
  const category = info.business ? 'business' : info.social ? 'profile' : type === 'domain' ? 'domain' : 'web';
  const excerpt = content || raw.slice(0, 800) || extracted.slice(0, 800) || `Verified public result for ${identifier}.`;
  const strict = STRICT_TYPES.has(type);

  return {
    id: sourceId('verified', url),
    source: info.label,
    title,
    url,
    category,
    confidence: strict ? 99 : Math.max(86, Math.min(98, Math.round(Number(candidate?.score || 0.88) * 100))),
    observedAt: isoNow(),
    summary: `${excerpt} • ${observed.basis} confirmed in returned or extracted public content.`,
    matchType: 'exact',
    matchBasis: observed.basis,
    scanGroup,
    verification: 'verified_identifier',
  };
}

async function runSearchJobs(jobs) {
  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  const candidates = [];
  const groupsAttempted = [];
  settled.forEach((result, index) => {
    groupsAttempted.push(jobs[index].group);
    if (result.status !== 'fulfilled') return;
    for (const item of result.value) candidates.push({ ...item, _scanGroup: jobs[index].group });
  });
  return { candidates, groupsAttempted };
}

async function deepTavilyScan(identifier, type) {
  if (!process.env.TAVILY_API_KEY) {
    return { evidence: [], meta: { queriesIssued: 0, groupsAttempted: [], candidateUrlsReviewed: 0, extractionsAttempted: 0 } };
  }

  const variants = queryVariants(identifier, type);
  const stageOneJobs = [];
  for (const query of variants.slice(0, 3)) stageOneJobs.push({ group: 'General Web', promise: tavilySearch(query) });
  if (type === 'email' || type === 'mobile' || type === 'username') {
    stageOneJobs.push({ group: 'Combined Public Social', promise: tavilySearch(variants[0], ALL_SOCIAL_DOMAINS) });
  }
  if (type === 'mobile' || type === 'email') {
    stageOneJobs.push({ group: 'Business Directories', promise: tavilySearch(variants[0], BUSINESS_DOMAINS) });
  }

  const stageOne = await runSearchJobs(stageOneJobs);
  let allCandidates = stageOne.candidates;
  let groupsAttempted = stageOne.groupsAttempted;
  let queriesIssued = stageOneJobs.length;

  const directStageOne = dedupeCandidates(allCandidates)
    .map((candidate) => candidateToEvidence(candidate, identifier, type, candidate._scanGroup || 'Public Web'))
    .filter(Boolean);

  const shouldFanOut = directStageOne.length < 2 && (type === 'email' || type === 'mobile' || type === 'username');
  if (shouldFanOut) {
    const stageTwoJobs = SOCIAL_GROUPS.map((group) => ({
      group: group.name,
      promise: tavilySearch(variants[0], group.domains),
    }));
    const stageTwo = await runSearchJobs(stageTwoJobs);
    allCandidates = allCandidates.concat(stageTwo.candidates);
    groupsAttempted = groupsAttempted.concat(stageTwo.groupsAttempted);
    queriesIssued += stageTwoJobs.length;
  }

  const uniqueCandidates = dedupeCandidates(allCandidates);
  const evidence = [];
  const extractionQueue = [];

  for (const candidate of uniqueCandidates) {
    const direct = candidateToEvidence(candidate, identifier, type, candidate._scanGroup || 'Public Web');
    if (direct) evidence.push(direct);
    else if (candidate?.url) extractionQueue.push(candidate);
  }

  const targets = extractionQueue.slice(0, 12);
  if (targets.length) {
    const extracted = await tavilyExtract(targets.map((item) => item.url));
    const byUrl = new Map(extracted.map((item) => [String(item?.url || '').toLowerCase().replace(/\/$/, ''), item?.raw_content || '']));
    for (const candidate of targets) {
      const key = String(candidate.url).toLowerCase().replace(/\/$/, '');
      const verified = candidateToEvidence(candidate, identifier, type, candidate._scanGroup || 'Extracted Public Web', byUrl.get(key) || '');
      if (verified) evidence.push(verified);
    }
  }

  return {
    evidence: dedupeEvidence(evidence),
    meta: {
      queriesIssued,
      groupsAttempted: [...new Set(groupsAttempted)],
      candidateUrlsReviewed: uniqueCandidates.length,
      extractionsAttempted: targets.length,
    },
  };
}

async function githubEmailCommits(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  const url = new URL('https://api.github.com/search/commits');
  url.searchParams.set('q', `author-email:${email}`);
  url.searchParams.set('per_page', '10');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(9000),
  }).catch(() => null);
  if (!response?.ok) return [];
  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item, index) => ({
    id: sourceId('github-email', `${index}-${item.html_url}`),
    source: 'GitHub Public Commits',
    title: 'Exact email observed in public Git commit metadata',
    url: item.html_url,
    category: 'profile',
    confidence: 99,
    observedAt: item?.commit?.author?.date || isoNow(),
    summary: `Exact author-email match in ${item?.repository?.full_name || 'a public repository'}${item?.commit?.author?.name ? ` • Public author name: ${item.commit.author.name}` : ''}.`,
    matchType: 'exact',
    matchBasis: 'Exact Git author email metadata',
    scanGroup: 'GitHub Public API',
    verification: 'verified_identifier',
    identityHint: item?.commit?.author?.name || item?.author?.login || null,
  }));
}

async function githubUsername(username) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return [];
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SAVRDH-IntelSight/1.0', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response?.ok) return [];
  const data = await response.json();
  return [{
    id: sourceId('github-user', data.login),
    source: 'GitHub Public Profile',
    title: `Exact public GitHub username: ${data.login}`,
    url: data.html_url,
    category: 'profile',
    confidence: 94,
    observedAt: isoNow(),
    summary: `Exact username profile exists${data.name ? ` • Public name: ${data.name}` : ''}${data.company ? ` • Company: ${data.company}` : ''}. Username equality does not by itself prove the same legal identity across platforms.`,
    matchType: 'exact',
    matchBasis: 'Exact public username',
    scanGroup: 'GitHub Public API',
    verification: 'verified_identifier',
    identityHint: data.name || data.login,
  }];
}

async function domainRdap(domain) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return [];
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'SAVRDH-IntelSight/1.0' }, signal: AbortSignal.timeout(9000) }).catch(() => null);
  if (!response?.ok) return [];
  const data = await response.json();
  const events = Array.isArray(data?.events) ? data.events : [];
  const registration = events.find((event) => event.eventAction === 'registration')?.eventDate;
  const expiration = events.find((event) => event.eventAction === 'expiration')?.eventDate;
  return [{
    id: sourceId('rdap', domain),
    source: 'RDAP Registry',
    title: `Registry record for ${data.ldhName || domain}`,
    url,
    category: 'domain',
    confidence: 99,
    observedAt: isoNow(),
    summary: `Exact public domain registry record${registration ? ` • Registered: ${registration}` : ''}${expiration ? ` • Expires: ${expiration}` : ''}.`,
    matchType: 'exact',
    matchBasis: 'Exact domain registry record',
    scanGroup: 'RDAP',
    verification: 'verified_identifier',
    identityHint: data.ldhName || domain,
  }];
}

function buildResult(query, type, evidence, identityHint, searchMeta) {
  const unique = dedupeEvidence(evidence).slice(0, 100);
  const socialCount = unique.filter((item) => item.category === 'profile').length;
  const businessCount = unique.filter((item) => item.category === 'business').length;
  const exactCount = unique.filter((item) => item.matchType === 'exact').length;
  const platformsFound = [...new Set(unique.map((item) => item.source).filter(Boolean))];
  const confidence = unique.length ? Math.round(unique.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / unique.length) : 0;
  const visibilityScore = unique.length ? Math.min(98, 18 + Math.min(unique.length, 15) * 4 + Math.min(platformsFound.length, 8) * 3) : 0;
  const verificationGrade = exactCount >= 3 && platformsFound.length >= 2 ? 'A' : exactCount >= 1 ? 'B' : 'NONE';
  const strict = STRICT_TYPES.has(type);

  return {
    query,
    type,
    visibilityScore,
    confidence,
    sourceCount: unique.length,
    possibleIdentity: identityHint || (unique.length
      ? strict ? 'Verified public identifier footprints found — ownership still requires source review' : 'Exact public identifier signals found — cross-platform identity still requires analyst review'
      : 'No verified public identity established'),
    summary: unique.length
      ? `Verified Search found ${unique.length} source-linked public record${unique.length === 1 ? '' : 's'} after exact identifier verification. ${platformsFound.length ? `Sources: ${platformsFound.join(', ')}.` : ''}`
      : `Verified Search completed but no public source containing the exact ${type} identifier was confirmed. This does not prove that no account or profile exists; it means the identifier was not verified in returned public/indexed content.`,
    matchPolicy: strict ? 'verified_exact_strict' : 'verified_exact_identifier',
    verificationGrade,
    exactMatchCount: exactCount,
    socialFootprintCount: socialCount,
    businessFootprintCount: businessCount,
    platformCount: platformsFound.length,
    platformsFound,
    evidence: unique.map(({ matchType, identityHint: _identityHint, ...item }) => item),
    timeline: unique
      .map((item) => ({ date: item.observedAt || isoNow(), label: `${item.source}: ${item.title}`, detail: item.summary }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    exposure: {
      status: 'none',
      summary: 'Public/authorized sources only. No passwords, OTPs, private chats, locked accounts, secret tokens, or private real-time location are accessed.',
    },
    mode: 'live',
    connectorStatus: {
      tavily: process.env.TAVILY_API_KEY ? 'connected_advanced' : 'not_configured',
      github: type === 'email' || type === 'username' ? 'connected_public' : 'not_applicable',
      rdap: type === 'domain' ? 'connected_public' : 'not_applicable',
      searchMode: 'verified_exact_adaptive_fanout',
    },
    searchMeta: {
      ...searchMeta,
      strictVerification: true,
      falsePositiveProtection: type === 'mobile' ? 'phone-candidate parsing; no whole-page digit concatenation' : type === 'email' ? 'exact/normalized public email verification' : 'exact identifier verification',
    },
  };
}

async function searchPublicSources(query, type) {
  const scan = await deepTavilyScan(query, type).catch(() => ({ evidence: [], meta: { queriesIssued: 0, groupsAttempted: [], candidateUrlsReviewed: 0, extractionsAttempted: 0 } }));
  const evidence = [...scan.evidence];
  let identityHint = null;

  if (type === 'email') {
    const github = await githubEmailCommits(query).catch(() => []);
    evidence.push(...github);
    identityHint = github.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'username') {
    const github = await githubUsername(query).catch(() => []);
    evidence.push(...github);
    identityHint = github.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'domain') {
    const rdap = await domainRdap(query).catch(() => []);
    evidence.push(...rdap);
    identityHint = rdap.find((item) => item.identityHint)?.identityHint || query;
  }

  return buildResult(query, type, evidence, identityHint, scan.meta);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const requestedType = req.body?.type || inferType(req.body?.query);
  if (!ALLOWED_TYPES.has(requestedType)) return sendJson(res, 400, { error: 'Unsupported search type' });
  const query = normalize(req.body?.query, requestedType);
  if (!query) return sendJson(res, 400, { error: 'Search query is required' });

  if (requestedType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
    return sendJson(res, 400, { error: 'Enter a valid email address' });
  }
  if (requestedType === 'mobile' && (query.length !== 10 || !/^[6-9]\d{9}$/.test(query))) {
    return sendJson(res, 400, { error: 'Enter a valid 10-digit Indian mobile number' });
  }

  try {
    const result = await searchPublicSources(query, requestedType);
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: 'Verified public-source scan completed. Only source-linked identifier evidence is returned; synthetic fallback data is not used.',
    });
  } catch (error) {
    console.error('IntelSight unified search error', error);
    return sendJson(res, 502, { error: 'Verified public-source search temporarily unavailable' });
  }
}
