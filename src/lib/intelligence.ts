export type SearchType = 'email' | 'mobile' | 'username' | 'domain' | 'company';

export type EvidenceItem = {
  id: string;
  source: string;
  title: string;
  url: string;
  category: 'profile' | 'web' | 'domain' | 'exposure' | 'business';
  confidence: number;
  observedAt: string;
  summary: string;
  matchBasis?: string;
  scanGroup?: string;
  verification?: string;
};

export type SearchResult = {
  query: string;
  type: SearchType;
  visibilityScore: number;
  confidence: number;
  sourceCount: number;
  possibleIdentity: string;
  summary: string;
  evidence: EvidenceItem[];
  timeline: Array<{ date: string; label: string; detail: string }>;
  exposure: {
    status: 'none' | 'possible' | 'observed';
    summary: string;
  };
  mode: 'demo' | 'live';
  matchPolicy?: string;
  verificationGrade?: string;
  exactMatchCount?: number;
  socialFootprintCount?: number;
  businessFootprintCount?: number;
  platformCount?: number;
  platformsFound?: string[];
  connectorStatus?: Record<string, string>;
  searchMeta?: {
    queriesIssued?: number;
    groupsAttempted?: string[];
    candidateUrlsReviewed?: number;
    extractionsAttempted?: number;
    strictVerification?: boolean;
    falsePositiveProtection?: string;
  };
  companyProfile?: {
    searchedName?: string;
    cinCandidates?: string[];
    gstinCandidates?: string[];
    businessReferenceCount?: number;
    publicProfileCount?: number;
    domainSignalCount?: number;
  };
};

const safeText = (value: string) => value.trim().slice(0, 180);

const companyPattern = /\b(private\s+limited|pvt\.?\s*ltd\.?|pvt\.?\s+limited|limited|ltd\.?|llp|incorporated|inc\.?|corporation|corp\.?|company|co\.?|technologies|technology|financials?|capital|industries|enterprises|solutions|foods|group)\b/i;

export function inferSearchType(value: string): SearchType {
  const q = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'email';
  if (/^[+\d][\d\s().-]{7,}$/.test(q)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(q)) return 'domain';
  if (companyPattern.test(q)) return 'company';
  return 'username';
}

export function normalizeQuery(value: string, type: SearchType): string {
  const q = safeText(value);
  if (type === 'email') return q.toLowerCase();
  if (type === 'domain') return q.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (type === 'mobile') return q.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  if (type === 'company') return q.replace(/\s+/g, ' ').trim();
  return q.replace(/^@/, '');
}

// Kept for compatibility with the existing dashboards. This is now an empty state,
// not a synthetic intelligence dataset. Search failures must never look like real findings.
export function createDemoResult(value: string, explicitType?: SearchType): SearchResult {
  const type = explicitType ?? inferSearchType(value || '');
  const query = normalizeQuery(value || '', type);
  return {
    query,
    type,
    visibilityScore: 0,
    confidence: 0,
    sourceCount: 0,
    possibleIdentity: 'No verified public identity established',
    summary: 'No verified live intelligence has been loaded for this identifier yet. Run a search to collect source-linked public evidence.',
    evidence: [],
    timeline: [],
    exposure: {
      status: 'none',
      summary: 'IntelSight only uses public or authorized sources and does not display private chats, passwords, OTPs, secret tokens, locked-account data, or private real-time location.',
    },
    mode: 'demo',
    matchPolicy: 'no_synthetic_fallback',
    verificationGrade: 'NONE',
    exactMatchCount: 0,
    socialFootprintCount: 0,
    businessFootprintCount: 0,
    platformCount: 0,
    platformsFound: [],
  };
}
