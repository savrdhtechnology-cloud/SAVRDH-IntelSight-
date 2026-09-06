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
const safeText = (value, max = 360) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
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
    ? Math.min(95, 24 + exactSignals * 14 + socialSignals * 8 + Math.min(unique.length, 10) * 3)
    : 0;

  const webConfigured = connectorStatus.brave === 'connected';
  const summary = unique.length
    ? `Found ${unique.length} public-source signal${unique.length === 1 ? '' : 's'}. Exact identifier mentions are stronger evidence; username-only profile matches are marked as possible matches and require analyst verification.`
    : webConfigured
      ? 'No public evidence was returned by the configured public-source connectors for this identifier. This does not prove that no public presence exists.'
      : 'No exact public evidence was found from the currently available direct connectors. Broad indexed web and social discovery requires the Brave Search connector to be enabled in Vercel.';

  return {
    query,
    type,
    visibilityScore,
    confidence: averageConfidence,
    sourceCount: unique.length,
    possibleIdentity: identityHint || (unique.length ? 'Public identity signals discovered — analyst review required' : 'No verified public identity established'),
    summary,
    evidence: unique.map(({ matchType, ...item }) => item),
    timeline: unique
      .map((item) => ({
        date: item.observedAt || isoNow(),
        label: `${item.source}: ${item.title}`,
        detail: item.summary,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    exposure: {
      status: 'none',
      summary: 'This search uses public/authorized sources only and does not query passwords, OTPs, session tokens, private chats, or private location data.',
    },
    mode: 'live',
    connectorStatus,
  };
}

async function braveSearch(searchQuery, identifier) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('count', '20');
  url.searchParams.set('result_filter', 'web');
  url.searchParams.set('extra_snippets', 'true');
  url.searchParams.set('text_decorations', 'false');
  url.searchParams.set('safesearch', 'moderate');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`Brave Search returned ${response.status}`);
  const payload = await response.json();
  const results = Array.isArray(payload?.web?.results) ? payload.web.results : [];
  const loweredIdentifier = identifier.toLowerCase();

  return results.map((item, index) => {
    const title = safeText(item.title, 180) || 'Public web result';
    const description = safeText([item.description, ...(Array.isArray(item.extra_snippets) ? item.extra_snippets : [])].filter(Boolean).join(' '), 420);
    const combined = `${title} ${description}`.toLowerCase();
    const exact = combined.includes(loweredIdentifier);
    const platform = getPlatform(item.url);
    return {
      id: sourceId('web', `${index}-${item.url}`),
      source: platform || 'Indexed Public Web',
      title,
      url: item.url,
      category: platform ? 'profile' : 'web',
      confidence: exact ? 90 : platform ? 68 : 62,
      observedAt: isoNow(),
      summary: description || `Public indexed result returned for ${identifier}.`,
      matchType: exact ? 'exact' : 'possible',
    };
  });
}

async function braveIdentifierSearch(identifier, type) {
  if (!process.env.BRAVE_SEARCH_API_KEY) return [];
  const exactQuery = `"${identifier.replace(/"/g, '')}"`;
  const searches = [braveSearch(exactQuery, identifier)];
  if (type === 'email' || type === 'mobile') {
    searches.push(braveSearch(`${exactQuery} (site:linkedin.com OR site:facebook.com OR site:instagram.com OR site:x.com OR site:twitter.com OR site:github.com OR site:reddit.com OR site:tiktok.com)`, identifier));
  }
  const settled = await Promise.allSettled(searches);
  return settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
}

async function githubEmailCommits(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  const apiUrl = new URL('https://api.github.com/search/commits');
  apiUrl.searchParams.set('q', `author-email:${email}`);
  apiUrl.searchParams.set('per_page', '10');
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/0.3',
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
      title: `Exact email observed in public Git commit metadata`,
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
      'User-Agent': 'SAVRDH-IntelSight/0.3',
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
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.3 public-osint' },
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
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.3' },
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
      braveIdentifierSearch(query, type).catch(() => []),
    ]);
    evidence.push(...commitEvidence, ...indexedEvidence);
    identityHint = commitEvidence.find((item) => item.identityHint)?.identityHint || null;

    const localPart = query.split('@')[0];
    if (/^[A-Za-z0-9_-]{3,38}$/.test(localPart)) {
      const possibleProfiles = await usernamePresence(localPart, false).catch(() => []);
      evidence.push(...possibleProfiles);
    }
  } else if (type === 'mobile') {
    evidence.push(...await braveIdentifierSearch(query, type).catch(() => []));
  } else if (type === 'username') {
    const [profiles, indexedEvidence] = await Promise.all([
      usernamePresence(query, true).catch(() => []),
      braveIdentifierSearch(query, type).catch(() => []),
    ]);
    evidence.push(...profiles, ...indexedEvidence);
    identityHint = profiles.find((item) => item.identityHint)?.identityHint || null;
  } else if (type === 'domain') {
    const [registry, indexedEvidence] = await Promise.all([
      domainEvidence(query).catch(() => []),
      braveIdentifierSearch(query, type).catch(() => []),
    ]);
    evidence.push(...registry, ...indexedEvidence);
    identityHint = registry.find((item) => item.identityHint)?.identityHint || query;
  }

  const connectorStatus = {
    brave: process.env.BRAVE_SEARCH_API_KEY ? 'connected' : 'not_configured',
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
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: result.connectorStatus.brave === 'connected'
        ? 'Live public web and social-index search completed.'
        : 'Direct public connectors completed. Add BRAVE_SEARCH_API_KEY in Vercel to enable broad indexed web/social discovery.',
    });
  } catch (error) {
    console.error('IntelSight search connector error', error);
    return sendJson(res, 502, { error: 'Public source connector temporarily unavailable' });
  }
}
