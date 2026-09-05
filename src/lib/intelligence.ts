export type SearchType = 'email' | 'mobile' | 'username' | 'domain';

export type EvidenceItem = {
  id: string;
  source: string;
  title: string;
  url: string;
  category: 'profile' | 'web' | 'domain' | 'exposure' | 'business';
  confidence: number;
  observedAt: string;
  summary: string;
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
};

const safeText = (value: string) => value.trim().slice(0, 180);

export function inferSearchType(value: string): SearchType {
  const q = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) return 'email';
  if (/^[+\d][\d\s()-]{7,}$/.test(q)) return 'mobile';
  if (/^(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(q)) return 'domain';
  return 'username';
}

export function normalizeQuery(value: string, type: SearchType): string {
  const q = safeText(value);
  if (type === 'email') return q.toLowerCase();
  if (type === 'domain') return q.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (type === 'mobile') return q.replace(/[^+\d]/g, '');
  return q.replace(/^@/, '');
}

export function createDemoResult(value: string, explicitType?: SearchType): SearchResult {
  const type = explicitType ?? inferSearchType(value);
  const query = normalizeQuery(value || 'public_example', type);
  const now = new Date();
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const identityLabel =
    type === 'domain' ? `Organization linked to ${query}` :
    type === 'email' ? 'Possible public identity match' :
    type === 'mobile' ? 'Possible public phone references' :
    `Public username cluster: ${query}`;

  const evidence: EvidenceItem[] = [
    {
      id: 'ev-1',
      source: type === 'username' ? 'GitHub Public Profile' : 'Indexed Public Web',
      title: type === 'domain' ? `Public references for ${query}` : `Public web mention containing ${query}`,
      url: 'https://example.com/public-source-1',
      category: type === 'domain' ? 'domain' : 'web',
      confidence: 92,
      observedAt: iso(0),
      summary: 'Synthetic demonstration record representing a high-confidence public occurrence. Live mode replaces this with evidence from configured public or licensed sources.',
    },
    {
      id: 'ev-2',
      source: 'Public Profile Index',
      title: 'Possible matching public profile',
      url: 'https://example.com/public-source-2',
      category: 'profile',
      confidence: 84,
      observedAt: iso(3),
      summary: 'Potential public profile match based on identifier correlation. Analyst review is required before treating it as the same person or organization.',
    },
    {
      id: 'ev-3',
      source: 'Business Directory',
      title: 'Possible organization association',
      url: 'https://example.com/public-source-3',
      category: 'business',
      confidence: 78,
      observedAt: iso(9),
      summary: 'Synthetic public business-directory signal showing how an organization or professional association would appear when supported by a traceable source.',
    },
    {
      id: 'ev-4',
      source: 'Domain & Registry Intelligence',
      title: 'Domain or website association signal',
      url: 'https://example.com/public-source-4',
      category: 'domain',
      confidence: 75,
      observedAt: iso(17),
      summary: 'Demonstration domain signal. In live mode, registry and website metadata remain source-linked and are not treated as proof of ownership without corroboration.',
    },
    {
      id: 'ev-5',
      source: 'Public Documents Index',
      title: 'Historical public document mention',
      url: 'https://example.com/public-source-5',
      category: 'web',
      confidence: 69,
      observedAt: iso(46),
      summary: 'Synthetic indexed-document reference showing how historical public mentions can be added to the lead timeline with source and confidence context.',
    },
    {
      id: 'ev-6',
      source: 'Defensive Exposure Provider',
      title: 'Exposure indicator summary',
      url: 'https://example.com/public-source-6',
      category: 'exposure',
      confidence: 63,
      observedAt: iso(91),
      summary: 'Demonstration defensive exposure signal only. IntelSight is designed to show risk summaries, not stolen passwords, tokens, cookies, OTPs or private messages.',
    },
  ];

  return {
    query,
    type,
    visibilityScore: type === 'domain' ? 86 : type === 'username' ? 81 : 74,
    confidence: 82,
    sourceCount: evidence.length,
    possibleIdentity: identityLabel,
    summary: 'IntelSight correlates public and authorized digital signals into a Lead 360 profile, showing where an identifier appears on the public internet, how strong each match is, and which evidence supports the relationship.',
    evidence,
    timeline: [
      { date: iso(0), label: 'Latest public occurrence checked', detail: 'A current public-source scan returned a matching identifier signal.' },
      { date: iso(3), label: 'Possible profile correlation', detail: 'A public profile signal was associated with the searched identifier and marked for analyst review.' },
      { date: iso(9), label: 'Organization association signal', detail: 'A possible public business or organization reference was observed.' },
      { date: iso(17), label: 'Domain association signal', detail: 'A domain or registry-related public signal was added to the evidence set.' },
      { date: iso(46), label: 'Historical indexed mention', detail: 'An older public document or indexed web reference was identified.' },
      { date: iso(91), label: 'Defensive exposure signal', detail: 'A non-secret defensive exposure indicator was associated with the identifier.' },
    ],
    exposure: {
      status: 'possible',
      summary: 'Possible defensive exposure signal found in demo data. Live mode will only use authorized providers and will not display stolen secrets.',
    },
    mode: 'demo',
  };
}
