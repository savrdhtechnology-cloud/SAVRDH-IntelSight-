const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const BUSINESS_GROUPS = [
  {
    name: 'Corporate & Registry References',
    domains: ['mca.gov.in', 'tofler.in', 'zaubacorp.com', 'thecompanycheck.com', 'cleartax.in', 'indiafilings.com'],
  },
  {
    name: 'Professional Company Profiles',
    domains: ['linkedin.com', 'crunchbase.com', 'tracxn.com'],
  },
  {
    name: 'Public Social Presence',
    domains: ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com'],
  },
];

const HOST_LABELS = {
  'mca.gov.in': 'MCA Public Web',
  'www.mca.gov.in': 'MCA Public Web',
  'tofler.in': 'Tofler',
  'www.tofler.in': 'Tofler',
  'zaubacorp.com': 'Zauba Corp',
  'www.zaubacorp.com': 'Zauba Corp',
  'thecompanycheck.com': 'The Company Check',
  'www.thecompanycheck.com': 'The Company Check',
  'cleartax.in': 'ClearTax',
  'www.cleartax.in': 'ClearTax',
  'indiafilings.com': 'IndiaFilings',
  'www.indiafilings.com': 'IndiaFilings',
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'crunchbase.com': 'Crunchbase',
  'www.crunchbase.com': 'Crunchbase',
  'tracxn.com': 'Tracxn',
  'www.tracxn.com': 'Tracxn',
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'x.com': 'X',
  'www.x.com': 'X',
  'twitter.com': 'X / Twitter',
  'www.twitter.com': 'X / Twitter',
  'youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
};

const BUSINESS_HOSTS = new Set([
  'mca.gov.in', 'tofler.in', 'zaubacorp.com', 'thecompanycheck.com',
  'cleartax.in', 'indiafilings.com', 'crunchbase.com', 'tracxn.com',
]);

const SOCIAL_HOSTS = new Set([
  'linkedin.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'youtube.com',
]);

const sendJson = (res, status, payload) => {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(payload);
};

const safeText = (value, max = 5000) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const isoNow = () => new Date().toISOString();
const sourceId = (prefix, value) => `${prefix}-${String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 72)}`;

function normalizeCompany(value) {
  return String(value || '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function baseCompany(value) {
  return normalizeCompany(value)
    .replace(/\bprivate limited\b/g, ' ')
    .replace(/\bpvt ltd\b/g, ' ')
    .replace(/\bpvt limited\b/g, ' ')
    .replace(/\blimited\b/g, ' ')
    .replace(/\bltd\b/g, ' ')
    .replace(/\bllp\b/g, ' ')
    .replace(/\bincorporated\b/g, ' ')
    .replace(/\binc\b/g, ' ')
    .replace(/\bcorporation\b/g, ' ')
    .replace(/\bcorp\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function hostLabel(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return HOST_LABELS[host] || HOST_LABELS[host.replace(/^www\./, '')] || null;
  } catch {
    return null;
  }
}

function tokenCoverage(text, company) {
  const tokens = baseCompany(company).split(' ').filter((token) => token.length >= 3);
  if (!tokens.length) return 0;
  const normalized = normalizeCompany(text);
  const matched = tokens.filter((token) => normalized.includes(token)).length;
  return matched / tokens.length;
}

function companyMatch(text, company, score = 0) {
  const normalizedText = normalizeCompany(text);
  const full = normalizeCompany(company);
  const base = baseCompany(company);
  const exactFull = !!full && normalizedText.includes(full);
  const exactBase = !!base && base.length >= 5 && normalizedText.includes(base);
  const coverage = tokenCoverage(text, company);

  if (exactFull) return { confidence: 98, matchType: 'exact', basis: 'Exact legal/company name observed' };
  if (exactBase && coverage >= 0.95) return { confidence: 93, matchType: 'exact', basis: 'Exact normalized company name observed' };
  if (coverage >= 0.85 && Number(score || 0) >= 0.55) return { confidence: 84, matchType: 'possible', basis: 'High company-name token coverage' };
  if (coverage >= 0.7 && Number(score || 0) >= 0.7) return { confidence: 76, matchType: 'possible', basis: 'Likely organization-name correlation' };
  return null;
}

function extractCompanyFacts(text) {
  const value = String(text || '');
  const cin = [...new Set(value.match(/\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g) || [])].slice(0, 5);
  const gstin = [...new Set(value.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g) || [])].slice(0, 5);
  return { cin, gstin };
}

function searchVariants(company) {
  const clean = String(company || '').replace(/"/g, '').trim();
  const base = baseCompany(clean);
  const queries = new Set([
    `"${clean}"`,
    `"${clean}" company`,
    `"${clean}" CIN directors registered office`,
    `"${clean}" website contact`,
  ]);
  if (base && normalizeCompany(base) !== normalizeCompany(clean)) {
    queries.add(`"${base}" company India`);
  }
  return [...queries].slice(0, 5);
}

async function tavilySearch(query, includeDomains = null) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const body = {
    query: String(query).slice(0, 390),
    search_depth: 'advanced',
    topic: 'general',
    max_results: 10,
    chunks_per_source: 3,
    include_answer: false,
    include_raw_content: true,
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

  if (!response.ok) throw new Error(`Tavily company search ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

function classifyCategory(url, text, company, match) {
  const host = hostOf(url);
  if (SOCIAL_HOSTS.has(host)) return 'profile';
  if (BUSINESS_HOSTS.has(host)) return 'business';

  const normalizedHost = host.replace(/[^a-z0-9]/g, '');
  const distinctive = baseCompany(company).split(' ').filter((token) => token.length >= 5);
  if (match?.matchType === 'exact' && distinctive.some((token) => normalizedHost.includes(token))) return 'domain';

  if (/\b(CIN|company identification number|incorporated|registered office|directors?|private limited|pvt\.? ltd|limited|llp)\b/i.test(text)) return 'business';
  return 'web';
}

function candidateToEvidence(candidate, company, scanGroup) {
  const title = safeText(candidate?.title, 280) || 'Public company result';
  const content = safeText(candidate?.content, 1800);
  const raw = safeText(candidate?.raw_content, 6500);
  const url = String(candidate?.url || '').trim();
  if (!url) return null;

  const combined = `${title}\n${content}\n${raw}`;
  const match = companyMatch(combined, company, candidate?.score);
  if (!match) return null;

  const category = classifyCategory(url, combined, company, match);
  const source = hostLabel(url) || (category === 'domain' ? 'Company Website Candidate' : 'Indexed Public Web');
  const facts = extractCompanyFacts(combined);
  const factText = [
    facts.cin.length ? `CIN observed: ${facts.cin.join(', ')}` : '',
    facts.gstin.length ? `GSTIN observed: ${facts.gstin.join(', ')}` : '',
  ].filter(Boolean).join(' • ');

  return {
    id: sourceId('company', url),
    source,
    title,
    url,
    category,
    confidence: match.confidence,
    observedAt: isoNow(),
    summary: `${content || raw.slice(0, 800) || `Public source returned for ${company}.`} • ${match.basis}${factText ? ` • ${factText}` : ''}.`,
    matchType: match.matchType,
    matchBasis: match.basis,
    scanGroup,
    companyFacts: facts,
  };
}

function dedupeEvidence(items) {
  const map = new Map();
  for (const item of items) {
    const key = String(item?.url || item?.title || '').toLowerCase().replace(/\/$/, '');
    if (!key) continue;
    const current = map.get(key);
    if (!current || Number(item.confidence || 0) > Number(current.confidence || 0)) map.set(key, item);
  }
  return [...map.values()];
}

async function companyWebScan(company) {
  if (!process.env.TAVILY_API_KEY) return [];
  const variants = searchVariants(company);
  const jobs = [
    { group: 'General Company Web', promise: tavilySearch(variants[0]) },
    { group: 'Company Facts & Directors', promise: tavilySearch(variants[2] || variants[0]) },
  ];

  for (const group of BUSINESS_GROUPS) {
    jobs.push({ group: group.name, promise: tavilySearch(variants[0], group.domains) });
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  const evidence = [];
  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    for (const candidate of result.value) {
      const item = candidateToEvidence(candidate, company, jobs[index].group);
      if (item) evidence.push(item);
    }
  });
  return dedupeEvidence(evidence).sort((a, b) => b.confidence - a.confidence).slice(0, 80);
}

function buildResult(company, evidence) {
  const unique = dedupeEvidence(evidence).sort((a, b) => b.confidence - a.confidence).slice(0, 80);
  const exact = unique.filter((item) => item.matchType === 'exact');
  const profiles = unique.filter((item) => item.category === 'profile');
  const businesses = unique.filter((item) => item.category === 'business');
  const domains = unique.filter((item) => item.category === 'domain');
  const allCins = [...new Set(unique.flatMap((item) => item.companyFacts?.cin || []))];
  const allGstins = [...new Set(unique.flatMap((item) => item.companyFacts?.gstin || []))];
  const confidence = unique.length
    ? Math.round(unique.reduce((sum, item) => sum + item.confidence, 0) / unique.length)
    : 0;
  const visibilityScore = unique.length
    ? Math.min(98, 28 + Math.min(unique.length, 15) * 4 + Math.min(profiles.length, 5) * 4 + Math.min(businesses.length, 5) * 3)
    : 0;

  return {
    query: company,
    type: 'company',
    visibilityScore,
    confidence,
    sourceCount: unique.length,
    possibleIdentity: unique.length
      ? `Company intelligence profile: ${company}`
      : `No verified public company profile established for ${company}`,
    summary: unique.length
      ? `Company Intelligence Search found ${unique.length} source-linked public signal${unique.length === 1 ? '' : 's'} for “${company}”: ${exact.length} exact company-name match${exact.length === 1 ? '' : 'es'}, ${businesses.length} corporate/business reference${businesses.length === 1 ? '' : 's'}, ${profiles.length} public social/professional profile${profiles.length === 1 ? '' : 's'}, and ${domains.length} likely company-domain signal${domains.length === 1 ? '' : 's'}. Results remain source-linked and should be verified before legal or compliance use.`
      : `Company Intelligence Search completed for “${company}”, but no sufficiently corroborated public source was returned.`,
    matchPolicy: 'company_identity_scored',
    exactMatchCount: exact.length,
    companyProfile: {
      searchedName: company,
      cinCandidates: allCins,
      gstinCandidates: allGstins,
      businessReferenceCount: businesses.length,
      publicProfileCount: profiles.length,
      domainSignalCount: domains.length,
    },
    evidence: unique.map(({ matchType, companyFacts: _companyFacts, ...item }) => item),
    timeline: unique.map((item) => ({
      date: item.observedAt || isoNow(),
      label: `${item.source}: ${item.title}`,
      detail: item.summary,
    })),
    exposure: {
      status: 'none',
      summary: 'Company search uses public or authorized sources only. It does not access private accounts, private communications, credentials, or restricted databases.',
    },
    mode: 'live',
    connectorStatus: {
      tavily: process.env.TAVILY_API_KEY ? 'connected_advanced' : 'not_configured',
      searchMode: 'company_intelligence',
      corporateWeb: 'public_indexed_sources',
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const company = String(req.body?.query || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (company.length < 2) return sendJson(res, 400, { error: 'Enter a valid company or organization name' });

  try {
    const evidence = await companyWebScan(company);
    const result = buildResult(company, evidence);
    return sendJson(res, 200, {
      result,
      connectorStatus: result.connectorStatus,
      message: 'Company intelligence scan completed across public corporate, professional, social and web sources.',
    });
  } catch (error) {
    console.error('IntelSight company search error', error);
    return sendJson(res, 502, { error: 'Company public-source search temporarily unavailable' });
  }
}
