import { useEffect, useState } from 'react';

import { getRecent311Cases, type Recent311 } from '@/lib/boston-311';

export function useBoston311() {
  const [data, setData] = useState<Recent311 | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    getRecent311Cases()
      .then((result) => active && setData(result))
      .catch((e: Error) => active && setError(e));
    return () => {
      active = false;
    };
  }, []);

  return { data, error };
}
