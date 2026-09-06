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

const usageLimitError = (error) => /usage limit|plan.?s set usage|upgrade your plan|credit|quota|billing/i.test(String(error?.message || ''));

const subjectFromResearchInput = (input) => {
  const value = clean(input, 3000);
  const quoted = value.match(/(?:for|profile for|about)\s+\"([^\"]{1,120})\"/i)?.[1];
  if (quoted) return clean(quoted, 120);
  const anyQuoted = value.match(/\"([^\"]{1,120})\"/)?.[1];
  return clean(anyQuoted || value.split(/[\n.]/)[0], 120);
};

const encodeLiteRequest = (subject) => `lite-${Buffer.from(clean(subject, 120), 'utf8').toString('base64url')}`.slice(0, 150);
const decodeLiteRequest = (requestId) => {
  try {
    if (!String(requestId).startsWith('lite-')) return null;
    return Buffer.from(String(requestId).slice(5), 'base64url').toString('utf8').slice(0, 120);
  } catch { return null; }
};

async function runSearch(body) {
  const query = clean(body.query, 800);
  if (!query) throw Object.assign(new Error('Query is required'), { status: 400 });
  const depth = body.searchDepth === 'basic' ? 'basic' : 'advanced';
  return tavily('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      topic: body.topic === 'news' ? 'news' : 'general',
      search_depth: depth,
      ...(depth === 'advanced' ? { chunks_per_source: 3 } : {}),
      max_results: Math.max(1, Math.min(Number(body.maxResults) || 10, 20)),
      include_answer: body.includeAnswer === false ? false : depth === 'advanced' ? 'advanced' : true,
      include_raw_content: Boolean(body.includeRawContent),
      include_images: Boolean(body.includeImages),
      include_image_descriptions: Boolean(body.includeImages),
      include_favicon: true,
      auto_parameters: false,
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
  try {
    return await tavily('/research', {
      method: 'POST',
      body: JSON.stringify({ input, model, stream: false }),
    });
  } catch (error) {
    if (!usageLimitError(error)) throw error;
    const subject = subjectFromResearchInput(input) || 'public intelligence subject';
    return {
      request_id: encodeLiteRequest(subject),
      status: 'pending',
      fallback_mode: 'quota_safe_lite',
      notice: 'Tavily Research usage limit reached. IntelSight switched to low-credit public search + connector fusion mode.',
    };
  }
}

async function runLiteStatus(subject) {
  const query = `\"${clean(subject, 120).replace(/\"/g, '')}\" public profile social website domain company organization registry contact`;
  try {
    const payload = await runSearch({ query, searchDepth: 'basic', maxResults: 8, includeAnswer: true, includeRawContent: false, includeImages: false });
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const answer = clean(payload?.answer, 8000);
    const sourceLines = results.slice(0, 8).map((item, index) => `- [${item?.title || `Public source ${index + 1}`}](${item?.url || ''})`).join('\n');
    return {
      status: 'completed',
      fallback_mode: 'quota_safe_lite',
      content: `## Limited Public Intelligence Summary\n\n${answer || `IntelSight completed a low-credit public-source scan for ${subject}.`}\n\n## Sources\n${sourceLines || 'No Tavily Lite sources were returned. Specialized connector evidence may still be available in the dashboard.'}`,
      sources: results,
      notice: 'Full Tavily Research was unavailable because the account usage limit was reached. This result uses a lower-credit public search plus IntelSight connector fusion.',
    };
  } catch (error) {
    return {
      status: 'completed',
      fallback_mode: 'connector_only',
      content: `## Limited Connector Mode\n\nFull Tavily Research and Tavily Lite Search are currently unavailable because the Tavily account usage limit has been reached. IntelSight has kept the investigation open and will display any evidence returned by independent public connectors such as GitHub, RDAP and already available public-source connector results.\n\nIncrease/reset the Tavily usage allowance to restore broad web, social and image coverage.`,
      sources: [],
      notice: String(error?.message || 'Tavily usage limit reached'),
    };
  }
}

async function researchStatus(body) {
  const requestId = clean(body.requestId, 150);
  if (!/^[a-zA-Z0-9_-]{8,150}$/.test(requestId)) throw Object.assign(new Error('Valid research request ID is required'), { status: 400 });
  const liteSubject = decodeLiteRequest(requestId);
  if (liteSubject) return runLiteStatus(liteSubject);
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
      query: `\"${query.replace(/\"/g, '')}\"`,
      topic: 'general',
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_favicon: true,
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
    return `Research the company/organization \"${cleanSubject}\" using public sources. Focus on official website, corporate identity, public registry references, products/services, leadership mentions, locations, public contact information, social/company pages, recent news, and material risk or credibility signals. Distinguish confirmed facts from possible matches. ${cleanContext}`;
  }
  if (mode === 'market') {
    return `Prepare a public-source market intelligence brief for \"${cleanSubject}\". Cover market positioning, competitors, products/services, recent developments, customer/industry signals, opportunities, risks, and source links. ${cleanContext}`;
  }
  if (mode === 'meeting') {
    return `Prepare a concise meeting briefing for \"${cleanSubject}\" using public sources only. Include organization overview, key people publicly associated with it, latest material developments, likely discussion topics, public credibility/risk signals, and questions worth asking. ${cleanContext}`;
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
