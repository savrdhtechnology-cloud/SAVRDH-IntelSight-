const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const send = (res, status, payload) => {
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);

async function tavily(path, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw Object.assign(new Error('TAVILY_API_KEY is not configured'), { status: 503 });

  const response = await fetch(`https://api.tavily.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(120000),
  });

  let payload;
  try { payload = await response.json(); } catch { payload = { error: 'Invalid Tavily response' }; }
  if (!response.ok) {
    const error = new Error(payload?.detail?.error || payload?.detail || payload?.error || `Tavily returned ${response.status}`);
    error.status = response.status;
    error.upstream = payload;
    throw error;
  }
  return payload;
}

function buildPrompt(body) {
  const companyName = clean(body.companyName || body.subject, 500);
  const companyUrl = clean(body.companyUrl, 800);
  const companyHq = clean(body.companyHq, 300);
  const companyIndustry = clean(body.companyIndustry, 300);
  const context = clean(body.context, 1800);
  if (!companyName) throw Object.assign(new Error('Company name is required'), { status: 400 });

  const supplied = [
    companyUrl ? `Known/possible company URL: ${companyUrl}` : '',
    companyHq ? `HQ/location hint: ${companyHq}` : '',
    companyIndustry ? `Industry hint: ${companyIndustry}` : '',
    context ? `Additional analyst context: ${context}` : '',
  ].filter(Boolean).join('\n');

  return `Prepare a comprehensive, evidence-grounded public-source company research report for "${companyName}".
${supplied}

IMPORTANT MATCHING RULES:
- First establish the correct company identity. Distinguish exact legal/entity matches from similarly named companies.
- Prefer official company sources, government/public registries, reputable financial/business databases, credible news, and primary-source pages.
- Do not invent missing facts. If a field is not supported by public evidence, write "Not reliably established from current public sources.".
- Keep dates, currencies, locations, leadership roles and financial figures source-grounded.
- Clearly distinguish confirmed facts from estimates, reported figures, and possible matches.
- Use public/authorized sources only.

OUTPUT FORMAT: Return a polished Markdown report using EXACTLY this structure and headings. Keep useful detail; use bullets where appropriate.

# ${companyName} Research Report

## Company Overview
### Business Description
### Core Products and Services
### Leadership Team
### Target Market
### Key Differentiators and Competitive Advantages
### Business and Revenue Model
### Funding and Investment
### Corporate Identity and Public Registry Signals
Include legal name, incorporation/public registry identifiers, registered office/HQ and official website only where reliably supported.

## Industry Overview
### Market Landscape
### Competitive Environment
### Market Challenges

## Financial Overview
### Revenue and Profitability
### Key Financial / Operating Metrics
### Pricing or Commercial Model
### Other Revenue Streams
If the company is private and reliable financials are unavailable, explicitly say so instead of estimating.

## Digital & Public Presence
### Official Website and Domains
### Public Social / Professional Presence
### Business Directories and Marketplaces
### Public Contact Signals

## News and Recent Developments
List recent material public developments with dates when available.

## Risk, Credibility and Analyst Notes
### Strong Signals
### Items Requiring Verification
### Material Risks or Contradictions

## References
Provide a clean list of the most important source URLs used in the report.

Write for an analyst/investigator, not as marketing copy.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  const body = req.body || {};
  const action = clean(body.action, 40) || 'start';

  try {
    if (action === 'status') {
      const requestId = clean(body.requestId, 160);
      if (!/^[a-zA-Z0-9-]{8,160}$/.test(requestId)) return send(res, 400, { error: 'Valid research request ID is required' });
      const data = await tavily(`/research/${encodeURIComponent(requestId)}`, { method: 'GET' });
      return send(res, 200, { ok: true, action: 'company_report', data, connector: 'tavily', publicDataOnly: true });
    }

    const prompt = buildPrompt(body);
    const model = ['mini', 'pro', 'auto'].includes(body.model) ? body.model : 'mini';
    const data = await tavily('/research', {
      method: 'POST',
      body: JSON.stringify({ input: prompt, model, stream: false }),
    });

    return send(res, 200, {
      ok: true,
      action: 'company_report',
      data,
      connector: 'tavily',
      publicDataOnly: true,
      reportSchema: 'company_intelligence_v1',
    });
  } catch (error) {
    console.error('Company report error', error);
    return send(res, Number(error?.status) || 502, {
      ok: false,
      error: error?.message || 'Company research failed',
      detail: error?.upstream || null,
    });
  }
}
