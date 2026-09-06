const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const SOCIAL_DOMAINS = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'x.com', 'twitter.com',
  'youtube.com', 'reddit.com', 'threads.net', 'pinterest.com', 'tiktok.com',
];

const BUSINESS_DOMAINS = [
  'mca.gov.in', 'zaubacorp.com', 'tofler.in', 'thecompanycheck.com',
  'instafinancials.com', 'indiafilings.com', 'cleartax.in', 'indiamart.com',
  'justdial.com', 'tradeindia.com', 'sulekha.com', 'exportersindia.com',
];

const send = (res, status, payload) => {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(status).json(payload);
};

const clean = (value, max = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const now = () => new Date().toISOString();
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const inferType = (value) => {
  const v = clean(value, 240);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
  if (/^\+?[\d\s().-]{7,20}$/.test(v)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(v)) return 'domain';
  return /\s/.test(v) ? 'name' : 'username';
};

const platformFromUrl = (url) => {
  const v = String(url || '').toLowerCase();
  if (v.includes('facebook.com')) return 'Facebook';
  if (v.includes('instagram.com')) return 'Instagram';
  if (v.includes('linkedin.com')) return 'LinkedIn';
  if (v.includes('twitter.com') || v.includes('x.com')) return 'X / Twitter';
  if (v.includes('youtube.com') || v.includes('youtu.be')) return 'YouTube';
  if (v.includes('reddit.com')) return 'Reddit';
  if (v.includes('threads.net')) return 'Threads';
  if (v.includes('pinterest.')) return 'Pinterest';
  if (v.includes('tiktok.com')) return 'TikTok';
  if (v.includes('github.com')) return 'GitHub';
  if (BUSINESS_DOMAINS.some((host) => v.includes(host))) return 'Business / Registry';
  return 'Public Web';
};

const categoryFromUrl = (url) => {
  const platform = platformFromUrl(url);
  if (platform === 'Business / Registry') return 'registry';
  if (SOCIAL_DOMAINS.some((host) => String(url || '').toLowerCase().includes(host))) return 'social';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host && !['www.google.com', 'google.com'].includes(host)) return 'web';
  } catch {}
  return 'web';
};

const subjectObserved = (text, subject, type) => {
  const haystack = String(text || '');
  if (!haystack) return false;
  if (type === 'email') return haystack.toLowerCase().includes(String(subject).toLowerCase());
  if (type === 'mobile') {
    const wanted = digitsOnly(subject);
    return wanted.length >= 7 && digitsOnly(haystack).includes(wanted);
  }
  return haystack.toLowerCase().includes(String(subject).toLowerCase());
};

const exactNameObserved = (text, name) => String(text || '').toLowerCase().includes(String(name || '').toLowerCase());

async function tavilySearch(query, includeDomains = null, includeImages = false) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [], images: [] };
  const body = {
    query,
    topic: 'general',
    search_depth: 'advanced',
    max_results: 10,
    include_answer: false,
    include_raw_content: true,
    include_images: Boolean(includeImages),
    include_image_descriptions: Boolean(includeImages),
    include_favicon: true,
    safe_search: true,
  };
  if (Array.isArray(includeDomains) && includeDomains.length) body.include_domains = includeDomains;
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) return { results: [], images: [] };
  const payload = await response.json();
  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    images: Array.isArray(payload?.images) ? payload.images : [],
  };
}

async function githubAuthorNames(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
  const url = new URL('https://api.github.com/search/commits');
  url.searchParams.set('q', `author-email:${email}`);
  url.searchParams.set('per_page', '20');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SAVRDH-IntelSight/1.1',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const names = (Array.isArray(payload?.items) ? payload.items : [])
    .map((item) => clean(item?.commit?.author?.name, 90))
    .filter((name) => name && name.length >= 3 && !/^[\w.+-]+@/i.test(name));
  return [...new Set(names)].slice(0, 3);
}

function extractLabeledNames(text) {
  const value = String(text || '');
  const patterns = [
    /(?:contact\s*person|proprietor|founder|director|owner|managing\s*director|chief\s*executive\s*officer|ceo|name)\s*[:\-–]\s*([A-Z][A-Za-z.'’& -]{2,70})/g,
    /(?:by|author)\s*[:\-–]\s*([A-Z][A-Za-z.'’& -]{2,70})/g,
  ];
  const names = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(value))) {
      const candidate = clean(match[1], 80).replace(/[|•].*$/, '').trim();
      if (candidate.split(/\s+/).length >= 2 && candidate.length <= 80) names.push(candidate);
    }
  }
  return [...new Set(names)].slice(0, 5);
}

function normalizeImage(image, candidateName, originQuery) {
  if (typeof image === 'string') return { url: image, description: '', candidateName, originQuery };
  const url = String(image?.url || image?.src || '').trim();
  if (!url) return null;
  return {
    url,
    description: clean(image?.description || image?.alt || image?.title, 500),
    candidateName,
    originQuery,
  };
}

function mapEvidence(item, subject, type, candidateName, origin) {
  const url = String(item?.url || '').trim();
  if (!url) return null;
  const title = clean(item?.title, 260) || 'Public source';
  const content = clean(item?.content || item?.snippet, 1500);
  const raw = clean(item?.raw_content, 7000);
  const combined = `${title} ${content} ${raw}`;
  if (!exactNameObserved(combined, candidateName)) return null;
  const corroborated = subjectObserved(combined, subject, type);
  const platform = platformFromUrl(url);
  const category = categoryFromUrl(url);
  const confidence = corroborated ? 98 : category === 'registry' ? 82 : category === 'social' ? 72 : 68;
  return {
    id: `${origin}-${Buffer.from(url).toString('base64url').slice(0, 42)}`,
    candidateName,
    title,
    url,
    content,
    platform,
    category,
    confidence,
    matchType: corroborated ? 'corroborated' : 'name_only',
    matchBasis: corroborated
      ? `Candidate name and original ${type} were both observed in the returned public source.`
      : `Exact candidate name observed; ownership/link to the original ${type} remains unverified.`,
    observedAt: now(),
  };
}

const dedupeByUrl = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.url || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const subject = clean(req.body?.subject || req.body?.query, 240);
  if (!subject) return send(res, 400, { error: 'Search subject is required' });
  const type = inferType(subject);

  try {
    const discoveryQuery = type === 'email' || type === 'mobile'
      ? `"${subject.replace(/"/g, '')}" public name owner company organization contact`
      : `"${subject.replace(/"/g, '')}" official website company organization social profiles`;

    const [discovery, githubNames] = await Promise.all([
      tavilySearch(discoveryQuery, null, true),
      type === 'email' ? githubAuthorNames(subject.toLowerCase()) : Promise.resolve([]),
    ]);

    const discoveryText = discovery.results
      .filter((item) => subjectObserved(`${item?.title || ''} ${item?.content || ''} ${item?.raw_content || ''}`, subject, type))
      .map((item) => `${item?.title || ''}\n${item?.content || ''}\n${item?.raw_content || ''}`)
      .join('\n');

    const directCandidate = ['name', 'username'].includes(type) && /\s/.test(subject) ? [subject] : [];
    const candidateNames = [...new Set([
      ...directCandidate,
      ...githubNames,
      ...extractLabeledNames(discoveryText),
    ])].filter(Boolean).slice(0, 3);

    const evidence = [];
    const images = [];

    for (const candidateName of candidateNames.slice(0, 2)) {
      const safeName = candidateName.replace(/"/g, '');
      const searches = await Promise.allSettled([
        tavilySearch(`"${safeName}" official website domain contact company`, null, true),
        tavilySearch(`"${safeName}"`, SOCIAL_DOMAINS, true),
        tavilySearch(`"${safeName}" company firm CIN LLP GST proprietor director`, BUSINESS_DOMAINS, false),
      ]);

      searches.forEach((entry, index) => {
        if (entry.status !== 'fulfilled') return;
        const origin = index === 0 ? 'name-web' : index === 1 ? 'name-social' : 'name-registry';
        entry.value.results.forEach((item) => {
          const mapped = mapEvidence(item, subject, type, candidateName, origin);
          if (mapped) evidence.push(mapped);
        });
        entry.value.images.forEach((image) => {
          const normalized = normalizeImage(image, candidateName, origin);
          if (normalized) images.push(normalized);
        });
      });
    }

    // Keep discovery images too, but label them as subject-discovery images. These are visual search leads, not identity proof.
    discovery.images.forEach((image) => {
      const normalized = normalizeImage(image, candidateNames[0] || subject, 'subject-discovery');
      if (normalized) images.push(normalized);
    });

    const uniqueEvidence = dedupeByUrl(evidence).slice(0, 60);
    const uniqueImages = dedupeByUrl(images).slice(0, 30);
    const domains = [...new Set(uniqueEvidence
      .filter((item) => item.category === 'web')
      .map((item) => {
        try { return new URL(item.url).hostname.replace(/^www\./, ''); } catch { return null; }
      })
      .filter(Boolean))];

    return send(res, 200, {
      ok: true,
      subject,
      type,
      candidateNames,
      evidence: uniqueEvidence,
      images: uniqueImages,
      domains,
      counts: {
        evidence: uniqueEvidence.length,
        corroborated: uniqueEvidence.filter((item) => item.matchType === 'corroborated').length,
        social: uniqueEvidence.filter((item) => item.category === 'social').length,
        registry: uniqueEvidence.filter((item) => item.category === 'registry').length,
        web: uniqueEvidence.filter((item) => item.category === 'web').length,
        images: uniqueImages.length,
        domains: domains.length,
      },
      connector: 'tavily_entity_expansion',
      publicDataOnly: true,
      notice: 'Name-only results are correlation leads, not proof of ownership. Public/indexed images and image descriptions may be returned; text that exists only inside non-indexed image pixels requires a separate OCR-capable source workflow.',
    });
  } catch (error) {
    console.error('Entity expansion error', error);
    return send(res, 502, { error: 'Public entity expansion temporarily unavailable' });
  }
}
