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
  /**
   * Nothing here is worth keeping: drops the rows and any request in flight.
   *
   * Reset deliberately writes no state of its own, so the caller owns clearing
   * `loading` alongside the rows — a `reset()` that forgets to does it leaves a
   * list that never stops loading.
   */
  reset: () => void;
}

/**
 * A cached list of rows: ask for it once, reuse it for a few minutes, and say
 * out loud when a fetch failed instead of leaving stale rows looking current.
 *
 * Two callers arriving together share one request, because the freshness stamp
 * is only written once the request comes back.
 *
 * Every request remembers the epoch it started in, and only writes if that is
 * still the current one. A response that was already on its way describes the
 * world as it was when it left, so it must not overwrite what has happened
 * since: a sign-out or a sign-in means those rows belong to someone else, and a
 * write means the snapshot is missing it. Both of those bump the epoch, and a
 * fetch started after them bumps it too, so an older response can never land
 * last.
 */
export function createListQuery<T>({ set, get, load, replace }: ListQueryOptions<T>): ListQuery {
  let inFlight: Promise<void> | null = null;
  let epoch = 0;

  return {
    initial: { loading: false, error: null, lastFetched: 0 },

    async fetch(force) {
      // A forced fetch is meant to go to the server now, so it cannot be served
      // by a request that was started for other reasons.
      if (inFlight && !force) return inFlight;

      const { lastFetched } = get();
      if (!force && lastFetched && Date.now() - lastFetched < STALE_TIME) return;

      const mine = ++epoch;
      // Declared first so the finally block below can compare against it: the
      // promise exists by the time it settles, but not before it is assigned.
      let request: Promise<void> | null = null;
      request = (async () => {
        set({ loading: true, error: null });
        try {
          const rows = await load();
          if (epoch === mine) {
            replace(rows);
            set({ lastFetched: Date.now() });
          }
        } catch (e) {
          // A failure stamps nothing, so the rows are a guess again and the next
          // caller retries. Leaving the previous stamp in place would keep
          // serving them without ever asking, with the error still on screen.
          if (epoch === mine) set({ error: getErrorMessage(e), lastFetched: 0 });
        } finally {
          // Only the newest request gets to say the list has stopped loading.
          if (inFlight === request) {
            inFlight = null;
            set({ loading: false });
          }
        }
      })();
      inFlight = request;
      return request;
    },

    invalidate() {
      // A write landed while a request was in flight, so that request's snapshot
      // predates the write and would drop the row the store just patched in.
      epoch += 1;
      set({ lastFetched: 0 });
    },

    reset() {
      epoch += 1;
      inFlight = null;
    },
  };
}
