import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Bank, DepositWithBank } from "../types";

const mock = vi.hoisted(() => {
  const state: {
    session: { user: { id: string; email?: string } } | null;
    signUpResult?: unknown;
    signInResult?: unknown;
    insertedBanks: { user_id: string; name: string }[];
  } = {
    session: null,
    signUpResult: undefined,
    signInResult: undefined,
    insertedBanks: [],
  };

  const chain = (result: unknown) => {
    const resolved = () => Promise.resolve(result);
    const c: Record<string, unknown> = {
      select: () => c,
      order: () => c,
      eq: () => c,
      // oxlint-disable-next-line unicorn/no-thenable -- the Supabase query builder is thenable by design
      then: (f?: (v: unknown) => unknown, r?: (e: unknown) => unknown) => resolved().then(f, r),
    };
    c.single = () => resolved();
    return c;
  };

  const from = vi.fn(() => ({
    select: () => chain({ data: [], error: null }),
    insert: (payload: { user_id: string; name: string }) => {
      state.insertedBanks.push(payload);
      return chain({ data: payload, error: null });
    },
  }));

  return { state, from };
});

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mock.from,
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mock.state.session } })),
      signUp: vi.fn(async () => mock.state.signUpResult),
      signInWithPassword: vi.fn(async () => mock.state.signInResult),
      signOut: vi.fn(async () => ({})),
    },
  },
}));

const { useAuthStore } = await import("./auth");
const { useDepositsStore } = await import("./deposits");
const { useBanksStore } = await import("./banks");

/** Only the identity of a cached row matters here: it stands for one account's data. */
const oldDeposit = { id: "old" } as unknown as DepositWithBank;
const oldBank = { id: "old" } as unknown as Bank;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mock.state.session = null;
  mock.state.signUpResult = undefined;
  mock.state.signInResult = undefined;
  mock.state.insertedBanks = [];
  useAuthStore.setState({ user: null, loading: true });
  useDepositsStore.setState({ deposits: [], loading: true, lastFetched: 123 });
  useBanksStore.setState({ banks: [], loading: true, lastFetched: 123 });
});

describe("signUp", () => {
  it("is closed unless VITE_ENABLE_REGISTRATION is true", async () => {
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "false");
    expect(await useAuthStore.getState().signUp("a@b.com", "pw")).toBe("註冊已關閉");
  });

  it("sets the user and seeds default banks", async () => {
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "true");
    mock.state.signUpResult = {
      data: { user: { id: "new-user", email: "a@b.com" }, session: { user: { id: "new-user" } } },
      error: null,
    };
    expect(await useAuthStore.getState().signUp("a@b.com", "pw")).toBeNull();
    expect(useAuthStore.getState().user).toEqual({ id: "new-user", email: "a@b.com" });
    expect(mock.state.insertedBanks.map((b) => b.name)).toEqual([
      "HSBC 匯豐銀行",
      "Standard Chartered 渣打銀行",
      "Bank of China 中國銀行",
      "Hang Seng Bank 恒生銀行",
      "ZA Bank",
      "Mox Bank",
    ]);
    // user_id is stamped from the session, matching banks.ts / deposits.ts.
    expect(mock.state.insertedBanks.every((b) => b.user_id === "new-user")).toBe(true);
  });

  it("returns the supabase error message", async () => {
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "true");
    mock.state.signUpResult = { data: null, error: { message: "already registered" } };
    expect(await useAuthStore.getState().signUp("a@b.com", "pw")).toBe("already registered");
  });

  it("asks the user to confirm email when there is no session", async () => {
    vi.stubEnv("VITE_ENABLE_REGISTRATION", "true");
    mock.state.signUpResult = {
      data: { user: { id: "new-user", email: "a@b.com" }, session: null },
      error: null,
    };
    expect(await useAuthStore.getState().signUp("a@b.com", "pw")).toBe(
      "請檢查電郵以確認註冊，然後登入",
    );
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("signIn", () => {
  it("sets the user on success", async () => {
    mock.state.signInResult = { data: { user: { id: "u1", email: "a@b.com" } }, error: null };
    expect(await useAuthStore.getState().signIn("a@b.com", "pw")).toBeNull();
    expect(useAuthStore.getState().user).toEqual({ id: "u1", email: "a@b.com" });
  });

  it("returns the error message and leaves the user null", async () => {
    mock.state.signInResult = { data: null, error: { message: "invalid login" } };
    expect(await useAuthStore.getState().signIn("a@b.com", "pw")).toBe("invalid login");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("drops the previous account's cache", async () => {
    useDepositsStore.setState({ deposits: [oldDeposit], lastFetched: Date.now() });
    useBanksStore.setState({ banks: [oldBank], lastFetched: Date.now() });
    mock.state.signInResult = { data: { user: { id: "u2", email: "b@b.com" } }, error: null };
    await useAuthStore.getState().signIn("b@b.com", "pw");
    // A warm cache would otherwise be served to the new account without a query.
    expect(useDepositsStore.getState().lastFetched).toBe(0);
    expect(useBanksStore.getState().lastFetched).toBe(0);
  });
});

describe("signOut", () => {
  it("clears the user and resets cached stores", async () => {
    useAuthStore.setState({ user: { id: "u1", email: "a@b.com" } });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useDepositsStore.getState()).toMatchObject({
      deposits: [],
      loading: false,
      lastFetched: 0,
    });
    expect(useBanksStore.getState()).toMatchObject({ banks: [], loading: false, lastFetched: 0 });
  });
});

describe("getSession", () => {
  it("restores the user when a session exists", async () => {
    mock.state.session = { user: { id: "u1", email: "a@b.com" } };
    await useAuthStore.getState().getSession();
    expect(useAuthStore.getState().user).toEqual({ id: "u1", email: "a@b.com" });
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("leaves the user null and clears loading when there is no session", async () => {
    mock.state.session = null;
    await useAuthStore.getState().getSession();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it("drops a lapsed session's cache, so the next login cannot read it", async () => {
    mock.state.session = null;
    useDepositsStore.setState({ deposits: [oldDeposit], lastFetched: Date.now() });
    useBanksStore.setState({ banks: [oldBank], lastFetched: Date.now() });
    await useAuthStore.getState().getSession();
    expect(useDepositsStore.getState().deposits).toEqual([]);
    expect(useBanksStore.getState().banks).toEqual([]);
    expect(useDepositsStore.getState().lastFetched).toBe(0);
    expect(useBanksStore.getState().lastFetched).toBe(0);
  });
});
