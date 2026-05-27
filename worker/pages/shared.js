// Shared HTML fragments for auth pages.
//
// The auth UI itself is rendered by the miso/WASM app under /wasm/auth.wasm.
// This file only emits the tiny HTML shell each auth page needs: meta tags,
// the pre-paint theme init, the Supabase SDK + bootstrap, and the WASM loader.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Runs synchronously before paint so the page never flashes the wrong theme.
// Must stay inline JS — WASM loads asynchronously and would always be too late.
export function themeInitScript() {
  return '<script>(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)})()</script>';
}

export function headLinks() {
  return (
    '<link rel="stylesheet" href="/css/default.css" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
    '<link href="https://fonts.googleapis.com/css?family=Dosis:400,500,700&display=swap" rel="stylesheet">'
  );
}

export function supabaseSdkScript() {
  return '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>';
}

// Reads URL/key from <meta> tags and exposes the client as the global
// `supabase` consumed by /wasm/supabase-ffi.js and the WASM auth app.
export function supabaseBootstrapScript() {
  return (
    "<script>" +
    "(function(){" +
    "var url = document.querySelector('meta[name=\"supabase-url\"]').content;" +
    "var key = document.querySelector('meta[name=\"supabase-anon-key\"]').content;" +
    "globalThis.supabase = window.supabase.createClient(url, key);" +
    "})();" +
    "</script>"
  );
}

export function supabaseFfiShim() {
  return '<script src="/wasm/supabase-ffi.js"></script>';
}

// The site's miso-loader.js auto-discovers [data-miso-component="..."] divs
// and loads /wasm/<name>.wasm into them. Auth pages emit
// `<div data-miso-component="auth" id="auth-app">`.
export function wasmAuthScripts() {
  return '<script src="/js/miso-loader.js" type="module"></script>';
}

export function authMetaTags(supabaseUrl, supabaseAnonKey, extra = {}) {
  const lines = [
    '<meta name="supabase-url" content="' + escapeHtml(supabaseUrl) + '">',
    '<meta name="supabase-anon-key" content="' + escapeHtml(supabaseAnonKey) + '">',
  ];
  for (const [name, value] of Object.entries(extra)) {
    lines.push('<meta name="' + escapeHtml(name) + '" content="' + escapeHtml(value) + '">');
  }
  return lines.join("");
}
