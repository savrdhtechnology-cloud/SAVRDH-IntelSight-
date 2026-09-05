import { useEffect } from 'react';

type SEOProps = {
  title: string;
  description: string;
  path?: string;
};

export const SEO = ({ title, description, path = '/' }: SEOProps) => {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${path}`;
  }, [title, description, path]);

  return null;
};
