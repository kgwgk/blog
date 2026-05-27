import { describe, it, expect } from "vitest";
import { pingSupabase } from "../keep-alive.js";

const ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-123",
};

describe("pingSupabase", () => {
  it("issues a keep_alive SELECT with anon key headers and returns ok on 200", async () => {
    let captured = null;
    const fetchImpl = async (url, init) => {
      captured = { url, init };
      return new Response("[]", { status: 200 });
    };

    const result = await pingSupabase(ENV, fetchImpl);

    expect(captured.url).toBe(
      "https://example.supabase.co/rest/v1/keep_alive?select=id&limit=1",
    );
    expect(captured.init.headers.apikey).toBe("anon-key-123");
    expect(captured.init.headers.Authorization).toBe("Bearer anon-key-123");
    expect(result).toEqual({ ok: true, status: 200 });
  });

  it("returns ok:false with the status on a non-2xx response and does not throw", async () => {
    const fetchImpl = async () => new Response("nope", { status: 401 });

    const result = await pingSupabase(ENV, fetchImpl);

    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("catches a network error and returns ok:false status:0 without throwing", async () => {
    const fetchImpl = async () => {
      throw new Error("network down");
    };

    const result = await pingSupabase(ENV, fetchImpl);

    expect(result).toEqual({ ok: false, status: 0 });
  });
});
