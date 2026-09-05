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
      source: type === 'username' ? 'GitHub Public Profile' : 'Indexed Web',
      title: type === 'domain' ? `Public references for ${query}` : `Public mention containing ${query}`,
      url: 'https://example.com/public-source-1',
      category: type === 'domain' ? 'domain' : 'web',
      confidence: 88,
      observedAt: iso(2),
      summary: 'Synthetic demonstration record. A live deployment will replace this with evidence from configured public or licensed sources.',
    },
    {
      id: 'ev-2',
      source: 'Public Profile Index',
      title: 'Possible matching public profile',
      url: 'https://example.com/public-source-2',
      category: 'profile',
      confidence: 74,
      observedAt: iso(18),
      summary: 'Potential match based on public identifier correlation. Human review is required before treating it as the same person or organization.',
    },
    {
      id: 'ev-3',
      source: 'Defensive Exposure Provider',
      title: 'Exposure indicator summary',
      url: 'https://example.com/public-source-3',
      category: 'exposure',
      confidence: 63,
      observedAt: iso(91),
      summary: 'Demonstration exposure signal only. IntelSight is designed to show risk summaries, not stolen passwords, tokens, cookies, OTPs or private messages.',
    },
  ];

  return {
    query,
    type,
    visibilityScore: type === 'domain' ? 82 : type === 'username' ? 76 : 68,
    confidence: 79,
    sourceCount: evidence.length,
    possibleIdentity: identityLabel,
    summary: 'IntelSight correlates public and authorized digital signals, keeps findings evidence-linked, and uses confidence scoring instead of claiming unverified identity matches as fact.',
    evidence,
    timeline: [
      { date: iso(2), label: 'Recent public mention', detail: 'A public reference matching the searched identifier was observed.' },
      { date: iso(18), label: 'Profile correlation', detail: 'A possible public profile relationship was identified for analyst review.' },
      { date: iso(91), label: 'Historical signal', detail: 'An older public or defensive exposure signal was associated with the identifier.' },
    ],
    exposure: {
      status: 'possible',
      summary: 'Possible defensive exposure signal found in demo data. Live mode will only use authorized providers and will not display stolen secrets.',
    },
    mode: 'demo',
  };
}
