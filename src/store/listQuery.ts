import { getErrorMessage } from "../lib/errors";

/** How long a fetched list is reused before a page asks for it again. */
export const STALE_TIME = 5 * 60 * 1000;

export interface ListQueryState {
  loading: boolean;
  /** Why the last fetch failed, or null. Cleared as soon as one succeeds. */
  error: string | null;
  lastFetched: number;
}

interface ListQueryOptions<T> {
  set: (partial: Partial<ListQueryState>) => void;
  get: () => ListQueryState;
  load: () => Promise<T[]>;
  /** Hands freshly fetched rows back to the store that owns them. */
  replace: (rows: T[]) => void;
}

export interface ListQuery {
  initial: ListQueryState;
  fetch: (force?: boolean) => Promise<void>;
  /** Marks the rows as a guess: the next fetch goes to the server. */
  invalidate: () => void;
}

/**
 * A cached list of rows: ask for it once, reuse it for a few minutes, and say
 * out loud when a fetch failed instead of leaving stale rows looking current.
 *
 * Two callers arriving together share one request, because the freshness stamp
 * is only written once the request comes back.
 */
export function createListQuery<T>({ set, get, load, replace }: ListQueryOptions<T>): ListQuery {
  let inFlight: Promise<void> | null = null;

  return {
    initial: { loading: false, error: null, lastFetched: 0 },

    async fetch(force) {
      if (inFlight) return inFlight;

      const { lastFetched } = get();
      if (!force && lastFetched && Date.now() - lastFetched < STALE_TIME) return;

      inFlight = (async () => {
        set({ loading: true, error: null });
        try {
          replace(await load());
          set({ lastFetched: Date.now() });
        } catch (e) {
          set({ error: getErrorMessage(e) });
        } finally {
          set({ loading: false });
          inFlight = null;
        }
      })();
      return inFlight;
    },

    invalidate() {
      set({ lastFetched: 0 });
    },
  };
}
