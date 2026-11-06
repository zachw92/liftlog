import { useEffect, useState } from 'react';

export type Route =
  | { kind: 'setup' }
  | { kind: 'home' }
  | { kind: 'session'; id: string }
  | { kind: 'history' }
  | { kind: 'settings' };

export function parseHash(hash: string): Route {
  const trimmed = hash.replace(/^#\/?/, '');
  if (trimmed === '' || trimmed === 'home') return { kind: 'home' };
  if (trimmed === 'setup') return { kind: 'setup' };
  if (trimmed === 'history') return { kind: 'history' };
  if (trimmed === 'settings') return { kind: 'settings' };
  const m = trimmed.match(/^session\/(.+)$/);
  if (m) return { kind: 'session', id: decodeURIComponent(m[1]!) };
  return { kind: 'home' };
}

export function toHash(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '#home';
    case 'setup':
      return '#setup';
    case 'history':
      return '#history';
    case 'settings':
      return '#settings';
    case 'session':
      return `#session/${encodeURIComponent(route.id)}`;
  }
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = (next: Route) => {
    window.location.hash = toHash(next);
  };
  return [route, navigate];
}
