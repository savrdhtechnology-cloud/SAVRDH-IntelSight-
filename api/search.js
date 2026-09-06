const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const allowedTypes = new Set(['email', 'mobile', 'username', 'domain']);
const STRICT_TYPES = new Set(['email', 'mobile']);

const SOCIAL_HOSTS = {
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'x.com': 'X',
  'www.x.com': 'X',
  'twitter.com': 'X / Twitter',
  'www.twitter.com': 'X / Twitter',
  'github.com': 'GitHub',
  'www.github.com': 'GitHub',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'tiktok.com': 'TikTok',
  'www.tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'threads.net': 'Threads',
  'www.threads.net': 'Threads',
  'pinterest.com': 'Pinterest',
  'www.pinterest.com': 'Pinterest',
  'quora.com': 'Quora',
  'www.quora.com': 'Quora',
  'medium.com': 'Medium',
  'dev.to': 'DEV Community',
  't.me': 'Telegram Public',
  'telegram.me': 'Telegram Public',
};

const SOCIAL_DOMAINS = [
  'linkedin.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com',
  'github.com', 'reddit.com', 'tiktok.com', 'youtube.com', 'threads.net',
  'pinterest.com', 'quora.com', 'medium.com', 'dev.to', 't.me', 'telegram.me',
];

// Deep exact scan groups keep each search narrow enough that a public post/profile/page
// containing the identifier is not drowned out by unrelated web results.
const SOCIAL_SCAN_GROUPS = [
  ['facebook.com', 'instagram.com', 'threads.net'],
  ['linkedin.com'],
  ['x.com', 'twitter.com', 'reddit.com'],
  ['github.com', 'medium.com', 'dev.to'],
  ['tiktok.com', 'youtube.com'],
  ['pinterest.com', 'quora.com'],
  ['t.me', 'telegram.me'],
];

const sendJson = (res, status, payload) => {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const inferType = (value) => {
  const raw = String(value || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'email';
  if (/^\+?[\d\s().-]{7,20}$/.test(raw)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'domain';
  return 'username';
};

const normalize = (value, type) => {
  const raw = String(value || '').trim().slice(0, 180);
  if (type === 'domain') return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (type === 'email') return raw.toLowerCase();
  if (type === 'mobile') return raw.replace(/[^+\d]/g, '');
  return raw.replace(/^@/, '');
};

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const isoNow = () => new Date().toISOString();
const safeText = (value, max = 600) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const sourceId = (prefix, value) => `${prefix}-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64)}`;

function getPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOCIAL_HOSTS[host] || SOCIAL_HOSTS[host.replace(/^www\./, '')] || null;
  } catch {
    return null;
  }
}

function exactIdentifierObserved(text, identifier, type) {
  const haystack = String(text || '');
  if (!haystack || !identifier) return false;

  if (type === 'email') {
    return haystack.toLowerCase().includes(String(identifier).toLowerCase());
  }

  if (type === 'mobile') {
    const wanted = digitsOnly(identifier);
    if (wanted.length < 7) return false;
    const observedDigits = digitsOnly(haystack);
    return observedDigits.includes(wanted);
  }

  return haystack.toLowerCase().includes(String(identifier).toLowerCase());
}

function dedupeEvidence(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url || item.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildResult(query, type, evidence, connectorStatus, identityHint) {
  const strict = STRICT_TYPES.has(type);
  const accepted = strict ? evidence.filter((item) => item.matchType === 'exact') : evidence;
  const unique = dedupeEvidence(accepted).slice(0, 60);
  const exactSignals = unique.filter((item) => item.matchType === 'exact').length;
  const socialSignals = unique.filter((item) => item.category === 'profile').length;
  const platformCount = new Set(unique.map((item) => item.source).filter(Boolean)).size;
  const averageConfidence = unique.length
    ? Math.round(unique.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / unique.length)
    : 0;
  const visibilityScore = unique.length
    ? Math.min(95, 20 + exactSignals * 15 + socialSignals * 7 + Math.min(unique.length, 10) * 3)
    : 0;

  const webConfigured = connectorStatus.tavily === 'connected' || connectorStatus.brave === 'connected_fallback';
  const summary = strict
    ? unique.length
      ? `Deep Strict Exact Match Mode: found ${unique.length} public-source footprint${unique.length === 1 ? '' : 's'} across ${platformCount} source${platformCount === 1 ? '' : 's'} where the exact ${type === 'email' ? 'email address' : 'mobile number'} was observed in returned public evidence or indexed page content. Similar names, derived usernames and semantic-only matches were excluded.`
      : webConfigured
        ? `Deep Strict Exact Match Mode: no public result containing the exact ${type === 'email' ? 'email address' : 'mobile number'} was confirmed by the configured connectors. Similar or inferred matches were intentionally excluded.`
        : 'Strict Exact Match Mode is active, but broad public-web search is not configured.'
    : unique.length
      ? `Found ${unique.length} public-source signal${unique.length === 1 ? '' : 's'}. Non-exact correlations remain analyst-review leads.`
      : 'No public evidence was returned by the configured public-source connectors.';

  return {
    query,
    type,
    visibilityScore,
    confidence: averageConfidence,
    sourceCount: unique.length,
    possibleIdentity: identityHint || (unique.length
      ? strict
        ? 'Exact public identifier footprints found — ownership still requires source verification'
        : 'Public identity signals discovered — analyst review required'
      : 'No verified public identity established'),
    summary,
    matchPolicy: strict ? 'strict_exact_deep_scan' : 'confidence_scored',
    exactMatchCount: exactSignals,
    socialFootprintCount: socialSignals,
    platformCount,
    evidence: unique.map(({ matchType, identityHint: _identityHint, ...item }) => item),
    timeline: unique
      .map((item) => ({
        date: item.observedAt || isoNow(),
        label: `${item.source}: ${item.title}`,
        detail: item.summary,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    exposure: {
      status: 'none',
      summary: 'This search uses public/authorized sources only and does not query passwords, OTPs, session tokens, private chats, private accounts, or private location data.',
    },
    mode: 'live',
    connectorStatus,
  };
}

function resultToEvidence(item, identifier, type, prefix = 'tavily') {
  const title = safeText(item?.title, 220) || 'Public web result';
  const content = safeText(item?.content || item?.snippet || '', 900);
  const rawContent = safeText(item?.raw_content || '', 6000);
  const url = String(item?.url || '').trim();
  if (!url) return null;

  const combined = `${title} ${content} ${rawContent}`;
  const exact = exactIdentifierObserved(combined, identifier, type);
  const strict = STRICT_TYPES.has(type);
  if (strict && !exact) return null;

  const platform = getPlatform(url);
  const relevance = Number(item?.score || 0);
  const confidence = exact
    ? strict ? 99 : 94
    : platform
      ? Math.max(52, Math.min(76, Math.round(relevance * 100)))
      : Math.max(48, Math.min(72, Math.round(relevance * 100)));

  const source = platform || 'Indexed Public Web';
  const footprintType = platform ? 'public social profile/post/page mention' : 'public web/document mention';

  return {
    id: sourceId(prefix, url),
    source,
    title,
    url,
    category: platform ? 'profile' : 'web',
    confidence,
    observedAt: isoNow(),
    summary: `${content || `Public indexed result returned for ${identifier}.`}${exact ? ` • Exact ${type === 'mobile' ? 'mobile digits' : 'identifier text'} observed in ${footprintType}.` : ' • Possible correlation only; analyst verification required.'}`,
    matchType: exact ? 'exact' : 'possible',
  };
}

async function tavilySearch(searchQuery, identifier, type, includeDomains) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const strict = STRICT_TYPES.has(type);
  const body = {
    query: searchQuery,
    search_depth: strict ? 'advanced' : 'basic',
    topic: 'general',
    max_results: strict ? 12 : 20,
    include_answer: false,
    // In strict mode raw public page text gives us a stronger exact-match check than snippet-only results.
    include_raw_content: strict,
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

  if (!response.ok) throw new Error(`Tavily Search returned ${response.status}`);
  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.map((item) => resultToEvidence(item, identifier, type, 'tavily')).filter(Boolean);
}

async function tavilyIdentifierSearch(identifier, type) {
  if (!process.env.TAVILY_API_KEY) return [];
  const clean = identifier.replace(/"/g, '');
  const exactQuery = `"${clean}"`;

  // One global exact scan + narrow platform groups. Keeping these in parallel avoids multiplying latency.
  const searches = [tavilySearch(exactQuery, identifier, type)];

  if (type === 'email' || type === 'mobile') {
    for (const domains of SOCIAL_SCAN_GROUPS) {
      searches.push(tavilySearch(exactQuery, identifier, type, domains));
    }
  } else if (type === 'username') {
    searches.push(tavilySearch(exactQuery, identifier, type, SOCIAL_DOMAINS));
  }

  const settled = await Promise.allSettled(searches);
  return settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
}

async function braveSearch(searchQuery, identifier, type) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('count', '20');
  url.searchParams.set('result_filter', 'web');
  url.searchParams.set('text_decorations', 'false');
  url.searchParams.set('safesearch', 'moderate');

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`Brave Search returned ${response.status}`);
  const payload = await response.json();
  const results = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  return results.map((item) => resultToEvidence({ title: item.title, content: item.description, url: item.url, score: 0.65 }, identifier, type, 'brave')).filter(Boolean);
}

async function broadIndexedSearch(identifier, type) {
  if (process.env.TAVILY_API_KEY) return tavilyIdentifierSearch(identifier, type);
  if (process.env.BRAVE_SEARCH_API_KEY) return braveSearch(`"${identifier.replace(/"/g, '')}"`, identifier, type);
  return [];
}

async function githubEmailCommits(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  const apiUrl = new URL('https://api.github.com/search/commits');
  apiUrl.searchParams.set('q', `author-email:${email}`);
  apiUrl.searchParams.set('per_page', '10');
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/0.6',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item, index) => {
    const authorName = item?.commit?.author?.name || item?.author?.login || 'Public commit author';
    const repo = item?.repository?.full_name || 'public repository';
    return {
      id: sourceId('github-email', `${index}-${item.html_url}`),
      source: 'GitHub Public Commits',
      title: 'Exact email observed in public Git commit metadata',
      url: item.html_url,
      category: 'profile',
      confidence: 99,
      observedAt: item?.commit?.author?.date || isoNow(),
      summary: `Exact author-email match in ${repo}. Public author name: ${authorName}. This confirms the email appears in public Git metadata; it does not by itself prove legal identity ownership.`,
      matchType: 'exact',
      identityHint: authorName,
    };
  });
}

async function githubProfile(username, confidence = 98, matchType = 'exact') {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return null;
  const apiUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/0.6',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return {
    id: sourceId('github-profile', data.login),
    source: 'GitHub Public Profile',
    title: `Public GitHub profile: ${data.login}`,
    url: data.html_url || `https://github.com/${encodeURIComponent(username)}`,
    category: 'profile',
    confidence,
    observedAt: isoNow(),
    summary: `${matchType === 'possible' ? 'Possible username match only. ' : ''}Public repositories: ${data.public_repos ?? 0} • Followers: ${data.followers ?? 0}${data.name ? ` • Public name: ${data.name}` : ''}${data.company ? ` • Company: ${data.company}` : ''}`,
    matchType,
    identityHint: data.name || data.login,
  };
}

async function redditProfile(username, confidence = 48, matchType = 'possible') {
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) return null;
  const url = `https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.6 public-osint' },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const profile = data?.data;
  if (!profile?.name) return null;
  return {
    id: sourceId('reddit-profile', profile.name),
    source: 'Reddit Public Profile',
    title: `Public Reddit username exists: u/${profile.name}`,
    url: `https://www.reddit.com/user/${encodeURIComponent(profile.name)}/`,
    category: 'profile',
    confidence,
    observedAt: isoNow(),
    summary: `${matchType === 'possible' ? 'Possible username match only. ' : ''}Public Reddit account metadata is available for this username.`,
    matchType,
  };
}

async function usernamePresence(username, exact = true) {
  const confidence = exact ? 98 : 50;
  const matchType = exact ? 'exact' : 'possible';
  const settled = await Promise.allSettled([
    githubProfile(username, confidence, matchType),
    redditProfile(username, exact ? 86 : 45, matchType),
  ]);
  return settled.flatMap((item) => item.status === 'fulfilled' && item.value ? [item.value] : []);
}

async function domainEvidence(domain) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return [];
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.6' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const data = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];
  const registration = events.find((e) => e.eventAction === 'registration')?.eventDate;
  const expiration = events.find((e) => e.eventAction === 'expiration')?.eventDate;
  const status = Array.isArray(data.status) ? data.status.join(', ') : 'Registry record available';
  return [{
    id: 'rdap-1',
    source: 'RDAP Registry',
    title: `Registry record for ${data.ldhName || domain}`,
    url,
    category: 'domain',
    confidence: 96,
    observedAt: isoNow(),
    summary: `Status: ${status}${registration ? ` • Registered: ${registration}` : ''}${expiration ? ` • Expires: ${expiration}` : ''}`,
    matchType: 'exact',
    identityHint: data.ldhName || domain,
  }];
}

async function searchPublicSources(query, type) {
  const evidence = [];
  let identityHint = null;

  if (type === 'email') {
    const [commitEvidence, indexedEvidence] = await Promise.all([
      githubEmailCommits(query).catch(() => []),
      broadIndexedSearch(query, type).catch(() => []),
    ]);
    evidence.push(...commitEvidence, ...indexedEvidence);
    identityHint = commitEvidence.find((item) => item.identityHint)?.identityHint || null;
    // STRICT MODE: do not derive usernames from the email local-part.
  } else if (type === 'mobile') {
    evidence.push(...await broadIndexedSearch(query, type).catch(() => []));
    // STRICT MODE: no name/username inference from a phone number.
  } else if (type === 'username') {
    const [profiles, indexedEvidence] = await Promise.all([
      usernamePresence(query, true).catch(() => []),
      broadIndexedSearch(query, type).catch(() => []),
    ]);
    evidence.push(...profiles, ...indexedEvidence);
    identityHint = profiles.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'domain') {
    const [registry, indexedEvidence] = await Promise.all([
      domainEvidence(query).catch(() => []),
      broadIndexedSearch(query, type).catch(() => []),
    ]);
    evidence.push(...registry, ...indexedEvidence);
    identityHint = registry.find((item) => item.identityHint)?.identityHint || query;
  }

  const connectorStatus = {
    tavily: process.env.TAVILY_API_KEY ? 'connected' : 'not_configured',
    socialExactScan: process.env.TAVILY_API_KEY && STRICT_TYPES.has(type) ? 'connected_deep_scan' : 'not_applicable',
    brave: process.env.BRAVE_SEARCH_API_KEY ? 'connected_fallback' : 'not_configured',
    github: 'connected',
    reddit: 'best_effort_public',
    rdap: 'connected',
  };

  return buildResult(query, type, evidence, connectorStatus, identityHint);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const body = req.body || {};
  const requestedType = body.type || inferType(body.query);
  if (!allowedTypes.has(requestedType)) return sendJson(res, 400, { error: 'Unsupported search type' });
  const normalized = normalize(body.query, requestedType);
  if (!normalized) return sendJson(res, 400, { error: 'Search query is required' });

  if (requestedType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return sendJson(res, 400, { error: 'Enter a valid email address' });
  }

  if (requestedType === 'mobile' && digitsOnly(normalized).length < 7) {
    return sendJson(res, 400, { error: 'Enter a valid mobile number' });
  }

  try {
    const result = await searchPublicSources(normalized, requestedType);
    const webConnected = result.connectorStatus.tavily === 'connected' || result.connectorStatus.brave === 'connected_fallback';
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: STRICT_TYPES.has(requestedType)
        ? webConnected
          ? 'Deep strict exact public identifier scan completed across general web and public social platforms. Non-exact and inferred matches were excluded.'
          : 'Strict exact direct-connector search completed. Broad public web search is not configured.'
        : webConnected
          ? 'Live public web and public social-index search completed.'
          : 'Direct public connectors completed. Add TAVILY_API_KEY in Vercel to enable broad indexed web/social discovery.',
    });
  } catch (error) {
    console.error('IntelSight search connector error', error);
    return sendJson(res, 502, { error: 'Public source connector temporarily unavailable' });
  }
}
