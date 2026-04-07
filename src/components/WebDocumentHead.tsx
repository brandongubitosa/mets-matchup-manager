import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const META = {
  title: 'MLB Matchup Manager',
  description:
    'Explore batter vs pitcher matchups, game predictions, and live MLB scores for your team.',
};

/**
 * Sets document title and basic meta tags on web after SPA load (share previews depend on crawler).
 */
export const WebDocumentHead: React.FC = () => {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.title = META.title;

    const setMeta = (attr: 'name' | 'property', name: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', META.description);
    setMeta('property', 'og:title', META.title);
    setMeta('property', 'og:description', META.description);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'twitter:card', 'summary');
  }, []);

  return null;
};
