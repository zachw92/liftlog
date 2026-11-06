import { useEffect, useState } from 'react';
import { isFirstRun } from './data/repo';
import { useRoute, type Route } from './router';
import { SetupScreen } from './screens/Setup';
import { HomeScreen } from './screens/Home';
import { SessionScreen } from './screens/Session';
import { HistoryScreen } from './screens/History';
import { SettingsScreen } from './screens/Settings';
import { CycleCompleteScreen } from './screens/CycleComplete';
import { usePwaUpdate } from './pwa';
import { Banner } from './components/Banner';

type Status = 'loading' | 'first-run' | 'ready';

export default function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [route, navigate] = useRoute();
  const pwa = usePwaUpdate();

  useEffect(() => {
    isFirstRun()
      .then((first) => setStatus(first ? 'first-run' : 'ready'))
      .catch(() => setStatus('ready'));
  }, []);

  if (status === 'loading') {
    return <p className="p-6 text-muted">Loading…</p>;
  }

  if (status === 'first-run' && route.kind !== 'setup') {
    navigate({ kind: 'setup' });
    return null;
  }

  return (
    <>
      <RouteBody
        route={route}
        navigate={navigate}
        onSetupDone={() => {
          setStatus('ready');
          navigate({ kind: 'home' });
        }}
      />
      {pwa.needRefresh ? (
        <div className="fixed left-0 right-0 bottom-0 p-3 z-50">
          <div className="max-w-md mx-auto">
            <Banner tone="info">
              <div className="flex items-center justify-between gap-3">
                <span>Update ready.</span>
                <button
                  type="button"
                  onClick={() => pwa.update()}
                  className="h-10 px-4 rounded-lg bg-accent text-bg font-semibold"
                >
                  Reload
                </button>
              </div>
            </Banner>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface BodyProps {
  route: Route;
  navigate: (route: Route) => void;
  onSetupDone: () => void;
}

function RouteBody({ route, navigate, onSetupDone }: BodyProps) {
  switch (route.kind) {
    case 'setup':
      return <SetupScreen onDone={onSetupDone} />;
    case 'home':
      return <HomeScreen navigate={navigate} />;
    case 'session':
      return <SessionScreen sessionId={route.id} navigate={navigate} />;
    case 'history':
      return <HistoryScreen navigate={navigate} />;
    case 'settings':
      return <SettingsScreen navigate={navigate} />;
    case 'cycle-complete':
      return <CycleCompleteScreen navigate={navigate} />;
  }
}
