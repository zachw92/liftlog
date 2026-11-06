import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface PwaUpdateState {
  needRefresh: boolean;
  update: () => Promise<void>;
}

export function usePwaUpdate(): PwaUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFn, setUpdateFn] = useState<() => Promise<void>>(
    () => () => Promise.resolve(),
  );

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
    setUpdateFn(() => async () => {
      await update(true);
    });
  }, []);

  return {
    needRefresh,
    update: async () => updateFn(),
  };
}
