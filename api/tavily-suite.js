const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function send(res, status, payload) {
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
}

function clean(value, max = 3000) {
  return String(value || '').trim().slice(0, max);
}

function safeUrl(value) {
  try {
    const parsed = new URL(clean(value, 1500));
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return null;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function tavily(path, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    const error = new Error('TAVILY_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`https://api.tavily.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(120000),
  });

  let payload = null;
  try { payload = await response.json(); } catch { payload = { error: 'Invalid upstream response' }; }
  if (!response.ok) {
    const error = new Error(payload?.detail?.error || payload?.detail || payload?.error || `Tavily returned ${response.status}`);
    error.status = response.status;
    error.upstream = payload;
    throw error;
  }
  return payload;
}

async function runSearch(body) {
  const query = clean(body.query, 800);
  if (!query) throw Object.assign(new Error('Query is required'), { status: 400 });
  return tavily('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      topic: body.topic === 'news' ? 'news' : 'general',
      search_depth: 'advanced',
      chunks_per_source: 3,
      max_results: Math.max(1, Math.min(Number(body.maxResults) || 10, 20)),
      include_answer: 'advanced',
      include_raw_content: Boolean(body.includeRawContent),
      include_images: true,
      include_image_descriptions: true,
      include_favicon: true,
      auto_parameters: true,
      safe_search: true,
      include_usage: true,
    }),
  });
}

async function runExtract(body) {
  const raw = Array.isArray(body.urls) ? body.urls : [body.url || body.urls];
  const urls = raw.map(safeUrl).filter(Boolean).slice(0, 5);
  if (!urls.length) throw Object.assign(new Error('At least one valid public URL is required'), { status: 400 });
  const query = clean(body.query, 500);
  return tavily('/extract', {
    method: 'POST',
    body: JSON.stringify({
      urls,
      ...(query ? { query } : {}),
      chunks_per_source: 3,
      extract_depth: 'advanced',
      include_images: false,
      include_favicon: true,
      format: 'markdown',
      include_usage: true,
    }),
  });
}

async function runMap(body) {
  const url = safeUrl(body.url);
  if (!url) throw Object.assign(new Error('A valid public website URL is required'), { status: 400 });
  const instructions = clean(body.instructions, 700);
  return tavily('/map', {
    method: 'POST',
    body: JSON.stringify({
      url,
      ...(instructions ? { instructions } : {}),
      max_depth: Math.max(1, Math.min(Number(body.maxDepth) || 1, 3)),
      max_breadth: Math.max(1, Math.min(Number(body.maxBreadth) || 20, 60)),
      limit: Math.max(1, Math.min(Number(body.limit) || 40, 100)),
      allow_external: false,
      timeout: 90,
      include_usage: true,
    }),
  });
}

async function runCrawl(body) {
  const url = safeUrl(body.url);
  if (!url) throw Object.assign(new Error('A valid public website URL is required'), { status: 400 });
  const instructions = clean(body.instructions, 700) || 'Find pages containing company information, contact details, products, services, leadership, legal information, news, policies and other public business intelligence.';
  return tavily('/crawl', {
    method: 'POST',
    body: JSON.stringify({
      url,
      instructions,
      chunks_per_source: 3,
      max_depth: Math.max(1, Math.min(Number(body.maxDepth) || 1, 2)),
      max_breadth: Math.max(1, Math.min(Number(body.maxBreadth) || 15, 40)),
      limit: Math.max(1, Math.min(Number(body.limit) || 25, 60)),
      allow_external: false,
      include_images: false,
      extract_depth: 'advanced',
      format: 'markdown',
      include_favicon: true,
      timeout: 90,
      include_usage: true,
    }),
  });
}

async function startResearch(body) {
  const input = clean(body.input || body.query, 3000);
  if (!input) throw Object.assign(new Error('Research question is required'), { status: 400 });
  const model = ['mini', 'pro', 'auto'].includes(body.model) ? body.model : 'mini';
  return tavily('/research', {
    method: 'POST',
    body: JSON.stringify({ input, model, stream: false }),
  });
}

async function researchStatus(body) {
  const requestId = clean(body.requestId, 150);
  if (!/^[a-zA-Z0-9-]{8,150}$/.test(requestId)) throw Object.assign(new Error('Valid research request ID is required'), { status: 400 });
  return tavily(`/research/${encodeURIComponent(requestId)}`, { method: 'GET' });
}

async function bulkLookup(body) {
  const items = (Array.isArray(body.items) ? body.items : clean(body.items, 5000).split(/[\n,]+/))
    .map((item) => clean(item, 240))
    .filter(Boolean)
    .slice(0, 10);
  if (!items.length) throw Object.assign(new Error('Add at least one lookup item'), { status: 400 });

  const settled = await Promise.allSettled(items.map((query) => tavily('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: `"${query.replace(/"/g, '')}"`,
      topic: 'general',
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_favicon: true,
      exact_match: false,
      safe_search: true,
      include_usage: true,
    }),
  })));

  return {
    results: settled.map((entry, index) => entry.status === 'fulfilled'
      ? { query: items[index], ok: true, ...entry.value }
      : { query: items[index], ok: false, error: entry.reason?.message || 'Lookup failed' }),
  };
}

function researchPrompt(mode, subject, context) {
  const cleanSubject = clean(subject, 500);
  const cleanContext = clean(context, 1400);
  if (!cleanSubject) throw Object.assign(new Error('Subject is required'), { status: 400 });

  if (mode === 'company') {
    return `Research the company/organization "${cleanSubject}" using public sources. Focus on official website, corporate identity, public registry references, products/services, leadership mentions, locations, public contact information, social/company pages, recent news, and material risk or credibility signals. Distinguish confirmed facts from possible matches. ${cleanContext}`;
  }
  if (mode === 'market') {
    return `Prepare a public-source market intelligence brief for "${cleanSubject}". Cover market positioning, competitors, products/services, recent developments, customer/industry signals, opportunities, risks, and source links. ${cleanContext}`;
  }
  if (mode === 'meeting') {
    return `Prepare a concise meeting briefing for "${cleanSubject}" using public sources only. Include organization overview, key people publicly associated with it, latest material developments, likely discussion topics, public credibility/risk signals, and questions worth asking. ${cleanContext}`;
  }
  return `${cleanSubject}${cleanContext ? `\nContext: ${cleanContext}` : ''}`;
}

async function templateResearch(body) {
  const input = researchPrompt(body.template || 'deep', body.subject || body.input, body.context);
  return startResearch({ input, model: body.model || 'mini' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const body = req.body || {};
  const action = clean(body.action, 60);

  try {
    let data;
    if (action === 'search' || action === 'chat') data = await runSearch(body);
    else if (action === 'extract') data = await runExtract(body);
    else if (action === 'map') data = await runMap(body);
    else if (action === 'crawl') data = await runCrawl(body);
    else if (action === 'research') data = await startResearch(body);
    else if (action === 'research_status') data = await researchStatus(body);
    else if (action === 'bulk') data = await bulkLookup(body);
    else if (action === 'company_research') data = await templateResearch({ ...body, template: 'company' });
    else if (action === 'market_research') data = await templateResearch({ ...body, template: 'market' });
    else if (action === 'meeting_prep') data = await templateResearch({ ...body, template: 'meeting' });
    else return send(res, 400, { error: 'Unsupported Tavily action' });

    return send(res, 200, {
      ok: true,
      action,
      data,
      connector: 'tavily',
      publicDataOnly: true,
    });
  } catch (error) {
    console.error('Tavily suite error', action, error);
    return send(res, Number(error?.status) || 502, {
      ok: false,
      error: error?.message || 'Tavily request failed',
      detail: error?.upstream || null,
    });
  }
}
