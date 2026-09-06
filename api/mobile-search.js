const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const SOURCE_GROUPS = [
  {
    name: 'Business Directories & Marketplaces',
    domains: [
      'justdial.com', 'indiamart.com', 'tradeindia.com', 'sulekha.com',
      'exportersindia.com', 'dial4trade.com', 'clickindia.com', 'quikr.com'
    ],
    category: 'business',
  },
  {
    name: 'Meta Social',
    domains: ['facebook.com', 'instagram.com', 'threads.net'],
    category: 'profile',
  },
  {
    name: 'LinkedIn',
    domains: ['linkedin.com'],
    category: 'profile',
  },
  {
    name: 'X & Reddit',
    domains: ['x.com', 'twitter.com', 'reddit.com'],
    category: 'profile',
  },
  {
    name: 'Video Social',
    domains: ['youtube.com', 'tiktok.com'],
    category: 'profile',
  },
  {
    name: 'Discovery Social',
    domains: ['pinterest.com', 'quora.com'],
    category: 'profile',
  },
  {
    name: 'Public Messaging Pages',
    domains: ['t.me', 'telegram.me'],
    category: 'profile',
  },
];

const HOST_LABELS = {
  'justdial.com': 'Justdial', 'www.justdial.com': 'Justdial',
  'indiamart.com': 'IndiaMART', 'www.indiamart.com': 'IndiaMART',
  'tradeindia.com': 'TradeIndia', 'www.tradeindia.com': 'TradeIndia',
  'sulekha.com': 'Sulekha', 'www.sulekha.com': 'Sulekha',
  'exportersindia.com': 'ExportersIndia', 'www.exportersindia.com': 'ExportersIndia',
  'dial4trade.com': 'Dial4Trade', 'www.dial4trade.com': 'Dial4Trade',
  'clickindia.com': 'ClickIndia', 'www.clickindia.com': 'ClickIndia',
  'quikr.com': 'Quikr', 'www.quikr.com': 'Quikr',
  'facebook.com': 'Facebook', 'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram', 'www.instagram.com': 'Instagram',
  'threads.net': 'Threads', 'www.threads.net': 'Threads',
  'linkedin.com': 'LinkedIn', 'www.linkedin.com': 'LinkedIn',
  'x.com': 'X', 'www.x.com': 'X',
  'twitter.com': 'X / Twitter', 'www.twitter.com': 'X / Twitter',
  'reddit.com': 'Reddit', 'www.reddit.com': 'Reddit',
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube',
  'tiktok.com': 'TikTok', 'www.tiktok.com': 'TikTok',
  'pinterest.com': 'Pinterest', 'www.pinterest.com': 'Pinterest',
  'quora.com': 'Quora', 'www.quora.com': 'Quora',
  't.me': 'Telegram Public', 'telegram.me': 'Telegram Public',
};

const BUSINESS_HOSTS = new Set([
  'justdial.com','www.justdial.com','indiamart.com','www.indiamart.com','tradeindia.com','www.tradeindia.com',
  'sulekha.com','www.sulekha.com','exportersindia.com','www.exportersindia.com','dial4trade.com','www.dial4trade.com',
  'clickindia.com','www.clickindia.com','quikr.com','www.quikr.com'
]);

const sendJson = (res, status, payload) => {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const isoNow = () => new Date().toISOString();
const safeText = (value, max = 2200) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);
const sourceId = (value) => `mobile-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 90)}`;

function normalizeMobile(value) {
  const raw = String(value || '').trim();
  const digits = digitsOnly(raw);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function phoneVariants(value) {
  const core = normalizeMobile(value);
  const variants = new Set();
  if (core.length !== 10) return [];
  variants.add(core);
  variants.add(`91${core}`);
  variants.add(`+91${core}`);
  variants.add(`+91 ${core}`);
  variants.add(`${core.slice(0, 5)} ${core.slice(5)}`);
  variants.add(`${core.slice(0, 5)}-${core.slice(5)}`);
  variants.add(`${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`);
  return [...variants];
}

function exactObserved(text, mobile) {
  const haystack = digitsOnly(text);
  const core = normalizeMobile(mobile);
  if (core.length !== 10) return false;
  return haystack.includes(core) || haystack.includes(`91${core}`);
}

function hostInfo(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return {
      host,
      label: HOST_LABELS[host] || HOST_LABELS[host.replace(/^www\./, '')] || 'Indexed Public Web',
      business: BUSINESS_HOSTS.has(host),
    };
  } catch {
    return { host: '', label: 'Indexed Public Web', business: false };
  }
}

async function tavilySearch(query, includeDomains = null, depth = 'advanced') {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const body = {
    query: String(query).slice(0, 390),
    search_depth: depth,
    topic: 'general',
    max_results: depth === 'advanced' ? 12 : 10,
    include_answer: false,
    include_raw_content: true,
  };
  if (depth === 'advanced') body.chunks_per_source = 3;
  if (Array.isArray(includeDomains) && includeDomains.length) body.include_domains = includeDomains;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(19000),
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
    signal: AbortSignal.timeout(19000),
  }).catch(() => null);
  if (!response?.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

function toEvidence(item, mobile, scanGroup, extractedRaw = '') {
  const url = String(item?.url || '').trim();
  if (!url) return null;
  const title = safeText(item?.title, 280) || 'Public result containing mobile number';
  const content = safeText(item?.content, 1800);
  const raw = safeText(item?.raw_content, 7000);
  const extracted = safeText(extractedRaw, 7000);
  const combined = `${title}\n${content}\n${raw}\n${extracted}`;
  if (!exactObserved(combined, mobile)) return null;

  const info = hostInfo(url);
  const category = info.business ? 'business' : info.label !== 'Indexed Public Web' ? 'profile' : 'web';
  const excerpt = content || raw.slice(0, 700) || extracted.slice(0, 700) || 'Exact mobile number observed in public content.';

  return {
    id: sourceId(url),
    source: info.label,
    title,
    url,
    category,
    confidence: 99,
    observedAt: isoNow(),
    summary: `${excerpt} • Exact mobile number/core digits confirmed in returned or extracted public content.`,
    matchType: 'exact',
    matchBasis: 'Exact normalized mobile number',
    scanGroup,
  };
}

function dedupeByUrl(items) {
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
    const key = String(item.url || '').toLowerCase().replace(/\/$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function mobileDeepScan(mobile) {
  const variants = phoneVariants(mobile);
  const core = normalizeMobile(mobile);
  const jobs = [];

  // Broad discovery across the public web using multiple real-world number formats.
  for (const variant of variants.slice(0, 5)) {
    jobs.push({ group: 'General Web', promise: tavilySearch(`"${variant}"`, null, 'advanced') });
  }

  // Contact/WhatsApp/business phrasing often surfaces listings and advertisements missed by bare-number search.
  const contextual = [
    `"${core}" WhatsApp`,
    `"${core}" contact`,
    `"${core}" phone`,
    `"${core}" business`,
    `"${core}" address`,
  ];
  for (const query of contextual) jobs.push({ group: 'Contact & Listings', promise: tavilySearch(query, null, 'basic') });

  // Dedicated source groups. Two number formats are searched in high-value business directories.
  for (const group of SOURCE_GROUPS) {
    const groupVariants = group.name === 'Business Directories & Marketplaces' ? variants.slice(0, 3) : variants.slice(0, 1);
    for (const variant of groupVariants) {
      jobs.push({ group: group.name, promise: tavilySearch(`"${variant}"`, group.domains, 'advanced') });
    }
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  const candidates = [];
  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    for (const item of result.value) candidates.push({ ...item, _scanGroup: jobs[index].group });
  });

  const uniqueCandidates = dedupeByUrl(candidates);
  const evidence = [];
  const extractionQueue = [];

  for (const item of uniqueCandidates) {
    const direct = toEvidence(item, mobile, item._scanGroup || 'Public Web');
    if (direct) evidence.push(direct);
    else if (item?.url) extractionQueue.push(item);
  }

  // Extract promising pages whose search snippet/raw content did not expose enough text.
  const targets = extractionQueue.slice(0, 12);
  if (targets.length) {
    const extracted = await tavilyExtract(targets.map((item) => item.url));
    const byUrl = new Map(extracted.map((item) => [String(item?.url || '').toLowerCase().replace(/\/$/, ''), item?.raw_content || '']));
    for (const item of targets) {
      const key = String(item.url).toLowerCase().replace(/\/$/, '');
      const verified = toEvidence(item, mobile, item._scanGroup || 'Extracted Public Web', byUrl.get(key) || '');
      if (verified) evidence.push(verified);
    }
  }

  return dedupeEvidence(evidence).slice(0, 100);
}

function buildResult(query, evidence) {
  const businessCount = evidence.filter((item) => item.category === 'business').length;
  const profileCount = evidence.filter((item) => item.category === 'profile').length;
  const platforms = [...new Set(evidence.map((item) => item.source))];
  const visibilityScore = evidence.length ? Math.min(98, 25 + Math.min(15, evidence.length) * 4 + Math.min(5, businessCount) * 3 + Math.min(5, profileCount) * 3) : 0;

  return {
    query,
    type: 'mobile',
    visibilityScore,
    confidence: evidence.length ? 99 : 0,
    sourceCount: evidence.length,
    possibleIdentity: evidence.length ? 'Exact public mobile-number footprints found — source ownership still requires verification' : 'No verified public mobile-number footprint established',
    summary: evidence.length
      ? `Deep Mobile Footprint Search found ${evidence.length} public source records containing the exact normalized mobile number. Business directories/marketplaces, public social pages/posts, contact pages and general indexed web were searched separately. Sources found: ${platforms.join(', ')}.`
      : 'Deep Mobile Footprint Search completed across public web, business directories, marketplaces and public social surfaces. No returned public page text contained the exact normalized mobile number.',
    matchPolicy: 'strict_exact_mobile_multisource',
    exactMatchCount: evidence.length,
    socialFootprintCount: profileCount,
    businessFootprintCount: businessCount,
    platformsFound: platforms,
    evidence: evidence.map(({ matchType, ...item }) => item),
    timeline: evidence.map((item) => ({ date: item.observedAt, label: `${item.source}: ${item.title}`, detail: item.summary })),
    exposure: {
      status: 'none',
      summary: 'Public/authorized sources only. No private account access, private chats, secret credentials or private real-time location are queried.',
    },
    mode: 'live',
    connectorStatus: {
      tavily: process.env.TAVILY_API_KEY ? 'connected_mobile_deep' : 'not_configured',
      searchMode: 'strict_exact_mobile_multisource',
      businessDirectories: 'enabled',
      socialPublicPages: 'enabled',
      imageOnlyOCR: 'not_configured',
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  const mobile = normalizeMobile(req.body?.query);
  if (mobile.length !== 10) return sendJson(res, 400, { error: 'Enter a valid 10-digit Indian mobile number' });

  try {
    const evidence = await mobileDeepScan(mobile);
    return sendJson(res, 200, {
      result: buildResult(mobile, evidence),
      message: 'Deep mobile-number public footprint scan completed across business directories, marketplaces, public social surfaces and indexed web.',
    });
  } catch (error) {
    console.error('IntelSight mobile search error', error);
    return sendJson(res, 502, { error: 'Mobile public-source search temporarily unavailable' });
  }
}
