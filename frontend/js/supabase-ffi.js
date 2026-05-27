// Bridge between miso/WASM and the @supabase/supabase-js SDK.
// The supabase client is created by the worker page bootstrap and exposed
// as globalThis.supabase. This shim wraps each auth call into a uniform
// {ok, data, error} JSON-string response so the Haskell side only has to
// decode a single shape, regardless of the underlying SDK signature.
//
// Most supabase-js auth methods take a single options object, but
// resetPasswordForEmail takes two positional args: (email, opts). We
// special-case it here so the Haskell side can stay uniform (always one
// JSON object in, always one JSON object out).
globalThis.supabaseAuthCall = async function (method, argsJson) {
  try {
    const args = JSON.parse(argsJson);
    let result;
    if (method === "resetPasswordForEmail") {
      result = await globalThis.supabase.auth.resetPasswordForEmail(
        args.email,
        args.options
      );
    } else {
      result = await globalThis.supabase.auth[method](args);
    }
    return JSON.stringify({
      ok: !result.error,
      data: result.data ?? null,
      error: result.error?.message ?? null,
    });
  } catch (e) {
    return JSON.stringify({ ok: false, data: null, error: String(e) });
  }
};
