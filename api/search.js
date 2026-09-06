const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const allowedTypes = new Set(['email', 'mobile', 'username', 'domain']);
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
  'medium.com': 'Medium',
  'dev.to': 'DEV Community',
};

const SOCIAL_DOMAINS = [
  'linkedin.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com',
  'github.com', 'reddit.com', 'tiktok.com', 'medium.com', 'dev.to',
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

const isoNow = () => new Date().toISOString();
const safeText = (value, max = 420) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const sourceId = (prefix, value) => `${prefix}-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64)}`;

function getPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOCIAL_HOSTS[host] || SOCIAL_HOSTS[host.replace(/^www\./, '')] || null;
  } catch {
    return null;
  }
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
  const unique = dedupeEvidence(evidence).slice(0, 40);
  const exactSignals = unique.filter((item) => item.matchType === 'exact').length;
  const socialSignals = unique.filter((item) => item.category === 'profile').length;
  const averageConfidence = unique.length
    ? Math.round(unique.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / unique.length)
    : 0;
  const visibilityScore = unique.length
    ? Math.min(95, 20 + exactSignals * 15 + socialSignals * 7 + Math.min(unique.length, 10) * 3)
    : 0;

  const webConfigured = connectorStatus.tavily === 'connected' || connectorStatus.brave === 'connected';
  const summary = unique.length
    ? `Found ${unique.length} public-source signal${unique.length === 1 ? '' : 's'}. Exact identifier mentions are stronger evidence; username-only or semantically related profile results are marked as possible matches and require analyst verification.`
    : webConfigured
      ? 'No public evidence was returned by the configured public-source connectors for this identifier. This does not prove that no public presence exists.'
      : 'No exact public evidence was found from the currently available direct connectors. Add TAVILY_API_KEY in Vercel to enable broad indexed web and public social discovery.';

  return {
    query,
    type,
    visibilityScore,
    confidence: averageConfidence,
    sourceCount: unique.length,
    possibleIdentity: identityHint || (unique.length ? 'Public identity signals discovered — analyst review required' : 'No verified public identity established'),
    summary,
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

function resultToEvidence(item, identifier, prefix = 'tavily') {
  const title = safeText(item?.title, 180) || 'Public web result';
  const content = safeText(item?.content || item?.snippet || '', 420);
  const url = String(item?.url || '').trim();
  if (!url) return null;
  const combined = `${title} ${content}`.toLowerCase();
  const exact = combined.includes(identifier.toLowerCase());
  const platform = getPlatform(url);
  const relevance = Number(item?.score || 0);

  return {
    id: sourceId(prefix, url),
    source: platform || 'Indexed Public Web',
    title,
    url,
    category: platform ? 'profile' : 'web',
    confidence: exact ? 92 : platform ? Math.max(52, Math.min(76, Math.round(relevance * 100))) : Math.max(48, Math.min(72, Math.round(relevance * 100))),
    observedAt: isoNow(),
    summary: `${content || `Public indexed result returned for ${identifier}.`}${exact ? ' • Exact identifier text observed in indexed content.' : ' • Possible match; exact identifier text was not confirmed in the returned snippet.'}`,
    matchType: exact ? 'exact' : 'possible',
  };
}

async function tavilySearch(searchQuery, identifier, includeDomains) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const body = {
    query: searchQuery,
    search_depth: 'basic',
    topic: 'general',
    max_results: 20,
    include_answer: false,
    include_raw_content: false,
  };
  if (Array.isArray(includeDomains) && includeDomains.length) body.include_domains = includeDomains;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) throw new Error(`Tavily Search returned ${response.status}`);
  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.map((item) => resultToEvidence(item, identifier, 'tavily')).filter(Boolean);
}

async function tavilyIdentifierSearch(identifier, type) {
  if (!process.env.TAVILY_API_KEY) return [];
  const clean = identifier.replace(/"/g, '');
  const exactQuery = `"${clean}"`;
  const searches = [tavilySearch(exactQuery, identifier)];

  if (type === 'email' || type === 'mobile' || type === 'username') {
    searches.push(tavilySearch(exactQuery, identifier, SOCIAL_DOMAINS));
  }

  const settled = await Promise.allSettled(searches);
  return settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
}

async function braveSearch(searchQuery, identifier) {
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
  return results.map((item) => resultToEvidence({ title: item.title, content: item.description, url: item.url, score: 0.65 }, identifier, 'brave')).filter(Boolean);
}

async function broadIndexedSearch(identifier, type) {
  if (process.env.TAVILY_API_KEY) return tavilyIdentifierSearch(identifier, type);
  if (process.env.BRAVE_SEARCH_API_KEY) return braveSearch(`"${identifier.replace(/"/g, '')}"`, identifier);
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
      'User-Agent': 'SAVRDH-IntelSight/0.4',
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
      confidence: 96,
      observedAt: item?.commit?.author?.date || isoNow(),
      summary: `Exact author-email match in ${repo}. Public author name: ${authorName}. This is strong public evidence for the email, but it should still be reviewed in context.`,
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
      'User-Agent': 'SAVRDH-IntelSight/0.4',
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
    summary: `${matchType === 'possible' ? 'Possible username match only — not verified as the same email owner. ' : ''}Public repositories: ${data.public_repos ?? 0} • Followers: ${data.followers ?? 0}${data.name ? ` • Public name: ${data.name}` : ''}${data.company ? ` • Company: ${data.company}` : ''}`,
    matchType,
    identityHint: data.name || data.login,
  };
}

async function redditProfile(username, confidence = 48, matchType = 'possible') {
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) return null;
  const url = `https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.4 public-osint' },
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
    summary: `${matchType === 'possible' ? 'Possible username match only — not verified as the same email owner. ' : ''}Public Reddit account metadata is available for this username.`,
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
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.4' },
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

    const localPart = query.split('@')[0];
    if (/^[A-Za-z0-9_-]{3,38}$/.test(localPart)) {
      evidence.push(...await usernamePresence(localPart, false).catch(() => []));
    }
  } else if (type === 'mobile') {
    evidence.push(...await broadIndexedSearch(query, type).catch(() => []));
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

  try {
    const result = await searchPublicSources(normalized, requestedType);
    const webConnected = result.connectorStatus.tavily === 'connected' || result.connectorStatus.brave === 'connected_fallback';
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: webConnected
        ? 'Live public web and public social-index search completed.'
        : 'Direct public connectors completed. Add TAVILY_API_KEY in Vercel to enable broad indexed web/social discovery.',
    });
  } catch (error) {
    console.error('IntelSight search connector error', error);
    return sendJson(res, 502, { error: 'Public source connector temporarily unavailable' });
  }
}
