const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const send = (res, status, payload) => {
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const clean = (value, max = 300) => String(value || '').trim().slice(0, max);
const now = () => new Date().toISOString();
const safeText = (value, max = 1400) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const emailObserved = (text, email) => String(text || '').toLowerCase().includes(String(email || '').toLowerCase());

const platformFromUrl = (url) => {
  const value = String(url || '').toLowerCase();
  if (value.includes('github.com')) return 'GitHub';
  if (value.includes('vercel.app') || value.includes('vercel.com')) return 'Vercel Public Web';
  if (value.includes('supabase.co') || value.includes('supabase.com')) return 'Supabase Public Web';
  if (value.includes('npmjs.com')) return 'npm';
  if (value.includes('stackoverflow.com') || value.includes('stackexchange.com')) return 'Stack Overflow';
  if (value.includes('dev.to')) return 'DEV Community';
  return 'Developer Public Web';
};

async function githubCommitEmailSearch(email) {
  const url = new URL('https://api.github.com/search/commits');
  url.searchParams.set('q', `author-email:${email}`);
  url.searchParams.set('per_page', '20');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item, index) => ({
    id: `github-${index}-${String(item?.sha || '').slice(0, 10)}`,
    source: 'GitHub Public Commits',
    platform: 'GitHub',
    title: item?.repository?.full_name ? `Public commit in ${item.repository.full_name}` : 'Public GitHub commit',
    url: item?.html_url || item?.repository?.html_url,
    content: `Exact author email observed in public Git commit metadata${item?.commit?.author?.name ? ` • Public author name: ${item.commit.author.name}` : ''}.`,
    confidence: 99,
    observedAt: item?.commit?.author?.date || now(),
    matchBasis: 'Exact author-email match in public Git metadata',
  })).filter((item) => item.url);
}

async function tavilyDomainSearch(email, domains) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: `"${email.replace(/"/g, '')}"`,
      topic: 'general',
      search_depth: 'advanced',
      max_results: 12,
      include_domains: domains,
      include_answer: false,
      include_raw_content: true,
      safe_search: true,
    }),
    signal: AbortSignal.timeout(22000),
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.map((item, index) => {
    const title = safeText(item?.title, 260) || 'Public developer/cloud result';
    const content = safeText(item?.content || '', 1200);
    const raw = safeText(item?.raw_content || '', 7000);
    if (!emailObserved(`${title} ${content} ${raw}`, email)) return null;
    const url = String(item?.url || '').trim();
    if (!url) return null;
    return {
      id: `devweb-${domains[0]}-${index}`,
      source: platformFromUrl(url),
      platform: platformFromUrl(url),
      title,
      url,
      content: content || `Exact email text observed in publicly indexed content on ${platformFromUrl(url)}.`,
      confidence: 99,
      observedAt: now(),
      matchBasis: 'Exact email text observed in public indexed content',
    };
  }).filter(Boolean);
}

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const query = clean(req.body?.query, 240).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
    return send(res, 400, { error: 'Developer/cloud footprint scan currently requires a valid email address.' });
  }

  const groups = [
    ['github.com'],
    ['vercel.com', 'vercel.app'],
    ['supabase.com', 'supabase.co'],
    ['npmjs.com', 'dev.to', 'stackoverflow.com', 'stackexchange.com'],
  ];

  try {
    const tasks = [githubCommitEmailSearch(query), ...groups.map((domains) => tavilyDomainSearch(query, domains))];
    const settled = await Promise.allSettled(tasks);
    const evidence = dedupe(settled.flatMap((entry) => entry.status === 'fulfilled' ? entry.value : []));
    return send(res, 200, {
      ok: true,
      query,
      evidence,
      connectorStatus: {
        githubPublicCommits: 'connected',
        developerCloudWeb: process.env.TAVILY_API_KEY ? 'connected' : 'not_configured',
      },
      publicDataOnly: true,
      notice: 'Only public/indexed evidence is returned. Vercel or Supabase login/account email associations are not public evidence and are intentionally not exposed.',
    });
  } catch (error) {
    console.error('Developer footprint connector error', error);
    return send(res, 502, { error: 'Developer/cloud public footprint scan failed' });
  }
}
