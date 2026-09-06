const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const allowedTypes = new Set(['email', 'mobile', 'username', 'domain']);
const STRICT_TYPES = new Set(['email', 'mobile']);

const PLATFORM_GROUPS = [
  { name: 'Meta Social', domains: ['facebook.com', 'instagram.com', 'threads.net'] },
  { name: 'LinkedIn', domains: ['linkedin.com'] },
  { name: 'X & Reddit', domains: ['x.com', 'twitter.com', 'reddit.com'] },
  { name: 'Developer Social', domains: ['github.com', 'medium.com', 'dev.to'] },
  { name: 'Video Social', domains: ['youtube.com', 'tiktok.com'] },
  { name: 'Discovery Social', domains: ['pinterest.com', 'quora.com'] },
  { name: 'Public Telegram', domains: ['t.me', 'telegram.me'] },
];

const HOST_LABELS = {
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'threads.net': 'Threads',
  'www.threads.net': 'Threads',
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'x.com': 'X',
  'www.x.com': 'X',
  'twitter.com': 'X / Twitter',
  'www.twitter.com': 'X / Twitter',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'github.com': 'GitHub',
  'www.github.com': 'GitHub',
  'medium.com': 'Medium',
  'dev.to': 'DEV Community',
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'www.tiktok.com': 'TikTok',
  'pinterest.com': 'Pinterest',
  'www.pinterest.com': 'Pinterest',
  'quora.com': 'Quora',
  'www.quora.com': 'Quora',
  't.me': 'Telegram Public',
  'telegram.me': 'Telegram Public',
};

const sendJson = (res, status, payload) => {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const safeText = (value, max = 1800) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const isoNow = () => new Date().toISOString();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const sourceId = (prefix, value) => `${prefix}-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 72)}`;

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
  if (type === 'mobile') return raw.replace(/[^+\d]/g, '');
  if (type === 'domain') return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  return raw.replace(/^@/, '');
}

function hostLabel(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return HOST_LABELS[host] || HOST_LABELS[host.replace(/^www\./, '')] || null;
  } catch {
    return null;
  }
}

function phoneVariants(identifier) {
  const digits = digitsOnly(identifier);
  const variants = new Set();
  if (!digits) return [];
  variants.add(digits);
  if (digits.length === 12 && digits.startsWith('91')) variants.add(digits.slice(2));
  if (digits.length === 11 && digits.startsWith('0')) variants.add(digits.slice(1));
  if (digits.length === 10) variants.add(`91${digits}`);
  return [...variants].filter((value) => value.length >= 10);
}

function exactObserved(text, identifier, type) {
  const value = String(text || '');
  if (!value) return { exact: false, basis: null };

  if (type === 'email') {
    const exact = value.toLowerCase().includes(String(identifier).toLowerCase());
    return { exact, basis: exact ? 'Exact email text' : null };
  }

  if (type === 'mobile') {
    const haystack = digitsOnly(value);
    for (const variant of phoneVariants(identifier)) {
      if (haystack.includes(variant)) {
        return { exact: true, basis: variant.length === 10 ? 'Exact 10-digit mobile core' : 'Exact normalized mobile number' };
      }
    }
    return { exact: false, basis: null };
  }

  const exact = value.toLowerCase().includes(String(identifier).toLowerCase());
  return { exact, basis: exact ? 'Exact identifier text' : null };
}

function searchQueryVariants(identifier, type) {
  if (type === 'email') {
    return [
      `"${identifier}"`,
      `${identifier}`,
      `contact ${identifier}`,
      `email ${identifier}`,
    ];
  }

  if (type === 'mobile') {
    const variants = phoneVariants(identifier);
    const queries = new Set();
    for (const digits of variants) {
      queries.add(`"${digits}"`);
      if (digits.length === 10) {
        queries.add(`"${digits.slice(0, 5)} ${digits.slice(5)}"`);
        queries.add(`"${digits.slice(0, 5)}-${digits.slice(5)}"`);
        queries.add(`"+91 ${digits}"`);
      }
    }
    return [...queries].slice(0, 5);
  }

  return [`"${identifier}"`, identifier];
}

async function tavilySearch(query, includeDomains = null) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const body = {
    query: String(query).slice(0, 390),
    search_depth: 'advanced',
    topic: 'general',
    max_results: 10,
    chunks_per_source: 3,
    include_answer: false,
    include_raw_content: true,
  };
  if (Array.isArray(includeDomains) && includeDomains.length) body.include_domains = includeDomains;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ urls: urls.slice(0, 10), extract_depth: 'advanced', include_images: false }),
    signal: AbortSignal.timeout(18000),
  });

  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

function candidateToEvidence(candidate, identifier, type, scanGroup, extractedRaw = '') {
  const title = safeText(candidate?.title, 260) || 'Public web result';
  const content = safeText(candidate?.content, 1600);
  const rawContent = safeText(candidate?.raw_content, 6000);
  const extracted = safeText(extractedRaw, 6000);
  const url = String(candidate?.url || '').trim();
  if (!url) return null;

  const observed = exactObserved(`${title}\n${content}\n${rawContent}\n${extracted}`, identifier, type);
  if (STRICT_TYPES.has(type) && !observed.exact) return null;

  const platform = hostLabel(url);
  const relevance = Number(candidate?.score || 0);
  const confidence = observed.exact
    ? STRICT_TYPES.has(type) ? 99 : 96
    : Math.max(45, Math.min(82, Math.round(relevance * 100)));

  const excerpt = content || rawContent.slice(0, 600) || extracted.slice(0, 600) || `Public result returned for ${identifier}.`;
  return {
    id: sourceId('deep', url),
    source: platform || 'Indexed Public Web',
    title,
    url,
    category: platform ? 'profile' : 'web',
    confidence,
    observedAt: isoNow(),
    summary: `${excerpt}${observed.exact ? ` • ${observed.basis} confirmed in returned/extracted public content.` : ' • Correlation requires analyst review.'}`,
    matchType: observed.exact ? 'exact' : 'possible',
    matchBasis: observed.basis,
    scanGroup,
  };
}

function dedupeCandidates(items) {
  const map = new Map();
  for (const item of items) {
    const url = String(item?.url || '').trim();
    if (!url) continue;
    const key = url.toLowerCase().replace(/\/$/, '');
    const current = map.get(key);
    if (!current || Number(item?.score || 0) > Number(current?.score || 0)) map.set(key, item);
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

async function deepTavilyScan(identifier, type) {
  if (!process.env.TAVILY_API_KEY) return [];

  const variants = searchQueryVariants(identifier, type);
  const jobs = [];

  // General web: two focused variants improve recall without flooding low-quality results.
  for (const query of variants.slice(0, 2)) {
    jobs.push({ group: 'General Web', promise: tavilySearch(query) });
  }

  // Platform-by-platform exact scan. Smaller sub-queries improve recall on sparse identifiers.
  if (type === 'email' || type === 'mobile' || type === 'username') {
    const bestQuery = variants[0];
    for (const group of PLATFORM_GROUPS) {
      jobs.push({ group: group.name, promise: tavilySearch(bestQuery, group.domains) });
    }
  }

  // Additional contact-format query catches directories, PDFs and contact pages.
  if (STRICT_TYPES.has(type) && variants[2]) {
    jobs.push({ group: 'Contact & Documents', promise: tavilySearch(variants[2]) });
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  const candidates = [];
  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const group = jobs[index].group;
    for (const item of result.value) candidates.push({ ...item, _scanGroup: group });
  });

  const uniqueCandidates = dedupeCandidates(candidates);
  const evidence = [];
  const needsExtraction = [];

  for (const candidate of uniqueCandidates) {
    const direct = candidateToEvidence(candidate, identifier, type, candidate._scanGroup || 'Public Web');
    if (direct) {
      evidence.push(direct);
      continue;
    }

    if (STRICT_TYPES.has(type)) {
      const combinedLength = safeText(candidate?.raw_content, 6000).length + safeText(candidate?.content, 1600).length;
      if (combinedLength < 250 && candidate?.url) needsExtraction.push(candidate);
    }
  }

  // Second-stage extraction verifies candidate pages where the search snippet was too thin.
  const extractionTargets = needsExtraction.slice(0, 10);
  if (extractionTargets.length) {
    const extracted = await tavilyExtract(extractionTargets.map((item) => item.url)).catch(() => []);
    const byUrl = new Map(extracted.map((item) => [String(item?.url || '').toLowerCase().replace(/\/$/, ''), item]));
    for (const candidate of extractionTargets) {
      const key = String(candidate.url).toLowerCase().replace(/\/$/, '');
      const raw = byUrl.get(key)?.raw_content || '';
      const verified = candidateToEvidence(candidate, identifier, type, candidate._scanGroup || 'Extracted Public Web', raw);
      if (verified) evidence.push(verified);
    }
  }

  return dedupeEvidence(evidence);
}

async function githubEmailCommits(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  const url = new URL('https://api.github.com/search/commits');
  url.searchParams.set('q', `author-email:${email}`);
  url.searchParams.set('per_page', '10');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/0.7',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) return [];
  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

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
    identityHint: item?.commit?.author?.name || item?.author?.login || null,
  }));
}

async function usernameProfiles(username) {
  const results = [];
  if (/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SAVRDH-IntelSight/0.7', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(7000),
    }).catch(() => null);
    if (response?.ok) {
      const data = await response.json();
      results.push({
        id: sourceId('github-profile', data.login), source: 'GitHub Public Profile', title: `Public GitHub profile: ${data.login}`,
        url: data.html_url, category: 'profile', confidence: 98, observedAt: isoNow(),
        summary: `Exact public username profile${data.name ? ` • Public name: ${data.name}` : ''}${data.company ? ` • Company: ${data.company}` : ''}.`,
        matchType: 'exact', matchBasis: 'Exact username', scanGroup: 'GitHub Public API', identityHint: data.name || data.login,
      });
    }
  }
  return results;
}

async function domainRdap(domain) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return [];
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'SAVRDH-IntelSight/0.7' }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!response?.ok) return [];
  const data = await response.json();
  return [{
    id: 'rdap-domain', source: 'RDAP Registry', title: `Registry record for ${data.ldhName || domain}`, url,
    category: 'domain', confidence: 99, observedAt: isoNow(), summary: `Public RDAP registry record available for ${data.ldhName || domain}.`,
    matchType: 'exact', matchBasis: 'Exact domain registry record', scanGroup: 'RDAP', identityHint: data.ldhName || domain,
  }];
}

function buildResult(query, type, evidence, connectorStatus, identityHint = null) {
  const strict = STRICT_TYPES.has(type);
  const accepted = strict ? evidence.filter((item) => item.matchType === 'exact') : evidence;
  const unique = dedupeEvidence(accepted).slice(0, 80);
  const exactCount = unique.filter((item) => item.matchType === 'exact').length;
  const socialCount = unique.filter((item) => !!hostLabel(item.url)).length;
  const averageConfidence = unique.length ? Math.round(unique.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / unique.length) : 0;
  const visibilityScore = unique.length ? Math.min(98, 25 + Math.min(unique.length, 15) * 4 + Math.min(socialCount, 6) * 5) : 0;

  const platformSummary = [...new Set(unique.map((item) => item.source).filter((source) => source !== 'Indexed Public Web'))];
  const summary = strict
    ? unique.length
      ? `Deep Exact Search found ${unique.length} verified public footprint${unique.length === 1 ? '' : 's'} containing the exact ${type === 'email' ? 'email address' : 'mobile number/core digits'}. ${socialCount ? `Exact social/public-platform footprints were found on: ${platformSummary.join(', ')}.` : 'No exact social-platform footprint was verified in returned public content.'}`
      : `Deep Exact Search completed across general web, social platforms, public pages and extracted candidate pages. No returned public source contained the exact ${type === 'email' ? 'email address' : 'mobile number/core digits'}.`
    : unique.length
      ? `Deep public search found ${unique.length} source-linked signals.`
      : 'No public evidence was returned by the configured connectors.';

  return {
    query,
    type,
    visibilityScore,
    confidence: averageConfidence,
    sourceCount: unique.length,
    possibleIdentity: identityHint || (unique.length ? (strict ? 'Exact public identifier footprints found — source ownership still requires verification' : 'Public identity signals discovered — analyst review required') : 'No verified public identity established'),
    summary,
    matchPolicy: strict ? 'strict_exact_deep' : 'confidence_scored_deep',
    exactMatchCount: exactCount,
    socialFootprintCount: socialCount,
    platformsFound: platformSummary,
    evidence: unique.map(({ matchType, identityHint: _identityHint, ...item }) => item),
    timeline: unique.map((item) => ({ date: item.observedAt || isoNow(), label: `${item.source}: ${item.title}`, detail: item.summary })).sort((a, b) => new Date(b.date) - new Date(a.date)),
    exposure: {
      status: 'none',
      summary: 'Public/authorized sources only. No passwords, OTPs, session tokens, private chats, locked/private accounts, or private real-time location are accessed.',
    },
    mode: 'live',
    connectorStatus,
  };
}

async function searchPublicSources(query, type) {
  const connectorStatus = {
    tavily: process.env.TAVILY_API_KEY ? 'connected_advanced' : 'not_configured',
    github: 'connected',
    rdap: 'connected',
    searchMode: 'deep_exact_public',
  };

  const evidence = [];
  let identityHint = null;

  if (type === 'email') {
    const [github, web] = await Promise.all([
      githubEmailCommits(query).catch(() => []),
      deepTavilyScan(query, type).catch(() => []),
    ]);
    evidence.push(...github, ...web);
    identityHint = github.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'mobile') {
    evidence.push(...await deepTavilyScan(query, type).catch(() => []));
  } else if (type === 'username') {
    const [profiles, web] = await Promise.all([
      usernameProfiles(query).catch(() => []),
      deepTavilyScan(query, type).catch(() => []),
    ]);
    evidence.push(...profiles, ...web);
    identityHint = profiles.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'domain') {
    const [rdap, web] = await Promise.all([
      domainRdap(query).catch(() => []),
      deepTavilyScan(query, type).catch(() => []),
    ]);
    evidence.push(...rdap, ...web);
    identityHint = rdap.find((item) => item.identityHint)?.identityHint || query;
  }

  return buildResult(query, type, evidence, connectorStatus, identityHint);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const body = req.body || {};
  const requestedType = body.type || inferType(body.query);
  if (!allowedTypes.has(requestedType)) return sendJson(res, 400, { error: 'Unsupported search type' });
  const query = normalize(body.query, requestedType);
  if (!query) return sendJson(res, 400, { error: 'Search query is required' });

  if (requestedType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) return sendJson(res, 400, { error: 'Enter a valid email address' });
  if (requestedType === 'mobile' && digitsOnly(query).length < 10) return sendJson(res, 400, { error: 'Enter a valid mobile number' });

  try {
    const result = await searchPublicSources(query, requestedType);
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: STRICT_TYPES.has(requestedType)
        ? 'Deep exact public web/social scan completed. Only exact public identifier evidence was accepted.'
        : 'Deep public intelligence scan completed.',
    });
  } catch (error) {
    console.error('IntelSight deep search error', error);
    return sendJson(res, 502, { error: 'Deep public-source search temporarily unavailable' });
  }
}
