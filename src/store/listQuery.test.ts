import { describe, expect, it, vi } from "vite-plus/test";
import { createListQuery, STALE_TIME, type ListQueryState } from "./listQuery";

/** A stand-in store: the query only ever reads and writes its own slice. */
function harness(load: () => Promise<string[]>) {
  const state: ListQueryState = { loading: false, error: null, lastFetched: 0 };
  let rows: string[] = [];
  const query = createListQuery<string>({
    set: (partial) => Object.assign(state, partial),
    get: () => state,
    load,
    replace: (next) => {
      rows = next;
    },
  });
  return { state, query, rows: () => rows };
}

describe("createListQuery", () => {
  it("loads rows and stamps the fetch", async () => {
    const { state, query, rows } = harness(async () => ["a", "b"]);
    await query.fetch();
    expect(rows()).toEqual(["a", "b"]);
    expect(state.lastFetched).toBeGreaterThan(0);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("reuses a warm cache instead of asking again", async () => {
    const load = vi.fn(async () => ["a"]);
    const { query } = harness(load);
    await query.fetch();
    await query.fetch();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("asks again once the cache has gone stale", async () => {
    const load = vi.fn(async () => ["a"]);
    const { state, query } = harness(load);
    await query.fetch();
    state.lastFetched = Date.now() - STALE_TIME - 1;
    await query.fetch();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores the cache when forced", async () => {
    const load = vi.fn(async () => ["a"]);
    const { query } = harness(load);
    await query.fetch();
    await query.fetch(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one request between callers that arrive together", async () => {
    let release: (rows: string[]) => void = () => {};
    const load = vi.fn(() => new Promise<string[]>((resolve) => (release = resolve)));
    const { query } = harness(load);

    const first = query.fetch();
    const second = query.fetch();
    expect(load).toHaveBeenCalledTimes(1);

    release(["a"]);
    await Promise.all([first, second]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lets a later fetch through once the first one settles", async () => {
    const load = vi.fn(async () => ["a"]);
    const { query } = harness(load);
    await Promise.all([query.fetch(), query.fetch()]);
    await query.fetch(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reports a failed fetch instead of swallowing it", async () => {
    const { state, query, rows } = harness(async () => {
      throw new Error("boom");
    });
    await query.fetch();
    expect(state.error).toBe("操作失敗，請稍後再試");
    expect(state.loading).toBe(false);
    // A failed fetch leaves whatever was already there, and does not claim to
    // have refreshed it.
    expect(rows()).toEqual([]);
    expect(state.lastFetched).toBe(0);
  });

  it("keeps the previous rows when a refetch fails", async () => {
    let shouldFail = false;
    const { state, query, rows } = harness(async () => {
      if (shouldFail) throw new Error("boom");
      return ["a"];
    });
    await query.fetch();
    shouldFail = true;
    await query.fetch(true);
    expect(rows()).toEqual(["a"]);
    expect(state.error).not.toBeNull();
  });

  it("clears a previous error once a fetch succeeds", async () => {
    let shouldFail = true;
    const { state, query } = harness(async () => {
      if (shouldFail) throw new Error("boom");
      return ["a"];
    });
    await query.fetch();
    expect(state.error).not.toBeNull();
    shouldFail = false;
    await query.fetch(true);
    expect(state.error).toBeNull();
  });

  it("retries after a failure, because a failure stamps nothing", async () => {
    const load = vi.fn(async () => ["a"]);
    const { state, query } = harness(load);
    await query.fetch();
    state.lastFetched = 0;
    await query.fetch();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("marks the rows as a guess when invalidated", async () => {
    const load = vi.fn(async () => ["a"]);
    const { state, query } = harness(load);
    await query.fetch();
    query.invalidate();
    expect(state.lastFetched).toBe(0);
    await query.fetch();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("says nothing while a fetch is in flight", async () => {
    let release: (rows: string[]) => void = () => {};
    const { state, query } = harness(() => new Promise<string[]>((r) => (release = r)));
    const pending = query.fetch();
    expect(state.loading).toBe(true);
    release(["a"]);
    await pending;
    expect(state.loading).toBe(false);
  });
});
