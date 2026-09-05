const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const allowedTypes = new Set(['email', 'mobile', 'username', 'domain']);

const normalize = (value, type) => {
  const raw = String(value || '').trim().slice(0, 180);
  if (type === 'domain') return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (type === 'email') return raw.toLowerCase();
  if (type === 'mobile') return raw.replace(/[^+\d]/g, '');
  return raw.replace(/^@/, '');
};

const isoNow = () => new Date().toISOString();

async function domainLookup(domain) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return null;
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SAVRDH-IntelSight/0.2 public-osint-contact' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];
  const registration = events.find((e) => e.eventAction === 'registration')?.eventDate;
  const expiration = events.find((e) => e.eventAction === 'expiration')?.eventDate;
  const status = Array.isArray(data.status) ? data.status.join(', ') : 'Registry record available';

  return {
    query: domain,
    type: 'domain',
    visibilityScore: 72,
    confidence: 96,
    sourceCount: 1,
    possibleIdentity: data.ldhName || domain,
    summary: 'Live public registry metadata returned through RDAP. Registry data can describe a domain and its status, but it does not by itself prove who controls or operates the domain.',
    evidence: [{
      id: 'rdap-1',
      source: 'RDAP Registry',
      title: `Registry record for ${data.ldhName || domain}`,
      url,
      category: 'domain',
      confidence: 96,
      observedAt: isoNow(),
      summary: `Status: ${status}${registration ? ` • Registered: ${registration}` : ''}${expiration ? ` • Expires: ${expiration}` : ''}`,
    }],
    timeline: [
      ...(registration ? [{ date: registration, label: 'Domain registration', detail: 'Registration event reported by the public RDAP registry record.' }] : []),
      ...(expiration ? [{ date: expiration, label: 'Registry expiration date', detail: 'Expiration event reported by the public RDAP registry record.' }] : []),
      { date: isoNow(), label: 'IntelSight registry lookup', detail: 'Current public RDAP record retrieved.' },
    ],
    exposure: { status: 'none', summary: 'No breach/exposure provider was queried for this registry-only lookup.' },
    mode: 'live',
  };
}

async function githubLookup(username) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return null;
  const apiUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/0.2',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const profileUrl = data.html_url || `https://github.com/${encodeURIComponent(username)}`;
  const joined = data.created_at || isoNow();

  return {
    query: username,
    type: 'username',
    visibilityScore: Math.min(95, 55 + Math.min(Number(data.public_repos || 0), 25)),
    confidence: 98,
    sourceCount: 1,
    possibleIdentity: data.name ? `${data.name} (${data.login})` : data.login,
    summary: 'Live public GitHub profile metadata. This confirms that the public username exists on GitHub; cross-platform identity equivalence requires separate corroborating evidence.',
    evidence: [{
      id: 'github-1',
      source: 'GitHub Public API',
      title: `Public GitHub profile: ${data.login}`,
      url: profileUrl,
      category: 'profile',
      confidence: 98,
      observedAt: isoNow(),
      summary: `Public repositories: ${data.public_repos ?? 0} • Followers: ${data.followers ?? 0}${data.company ? ` • Public company field: ${data.company}` : ''}${data.location ? ` • Public location field: ${data.location}` : ''}`,
    }],
    timeline: [
      { date: joined, label: 'GitHub account created', detail: 'Creation date reported by the public GitHub profile.' },
      { date: isoNow(), label: 'IntelSight public profile lookup', detail: 'Current public GitHub profile metadata retrieved.' },
    ],
    exposure: { status: 'none', summary: 'No breach/exposure provider was queried for this public-profile lookup.' },
    mode: 'live',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).set(headers).json({ error: 'Method not allowed' });

  const { query, type } = req.body || {};
  if (!allowedTypes.has(type)) return res.status(400).set(headers).json({ error: 'Unsupported search type' });
  const normalized = normalize(query, type);
  if (!normalized) return res.status(400).set(headers).json({ error: 'Search query is required' });

  try {
    if (type === 'domain') {
      const result = await domainLookup(normalized);
      return result ? res.status(200).set(headers).json({ result }) : res.status(404).set(headers).json({ error: 'No public RDAP record found' });
    }
    if (type === 'username') {
      const result = await githubLookup(normalized);
      return result ? res.status(200).set(headers).json({ result }) : res.status(404).set(headers).json({ error: 'No public GitHub profile found' });
    }

    return res.status(200).set(headers).json({
      result: null,
      connectorStatus: 'not_configured',
      message: 'Email/mobile public-web connectors require an approved server-side search provider. The client will show synthetic demo results until configured.',
    });
  } catch (error) {
    console.error('IntelSight search connector error', error);
    return res.status(502).set(headers).json({ error: 'Public source connector temporarily unavailable' });
  }
}
