import { useEffect, useState } from 'react';

/* Minimal fetch-JSON hook. In-flight requests are aborted when `url`
   changes, so switching districts quickly can't let a slow earlier
   response overwrite a newer one. */

export default function useJson(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    // A null url means "nothing to ask for yet" — not an error state.
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ data: null, error: err.message, loading: false });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
