// Lightweight Supabase keep-alive: a single PostgREST SELECT against the
// dedicated `keep_alive` table. A real DB read resets the free-tier 7-day
// inactivity timer. Pure + fetch-injectable so it can be unit tested without
// the Worker runtime.
export async function pingSupabase(env, fetchImpl = fetch) {
  const url = `${env.SUPABASE_URL}/rest/v1/keep_alive?select=id&limit=1`;
  try {
    const resp = await fetchImpl(url, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });
    return { ok: resp.ok, status: resp.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
