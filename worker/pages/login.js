import {
  themeInitScript,
  headLinks,
  authMetaTags,
  supabaseSdkScript,
  supabaseBootstrapScript,
  supabaseFfiShim,
  wasmAuthScripts,
} from "./shared.js";

export function loginPage(error = null, redirect = "/", supabaseUrl = "", supabaseAnonKey = "") {
  const extra = {};
  if (error) extra["auth-error"] = error;
  if (redirect) extra["auth-redirect"] = redirect;

  return new Response(
    "<!doctype html>" +
      '<html lang="en">' +
      "<head>" +
      '    <meta charset="utf-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
      "    <title>Login - hcentner's blog</title>" +
      authMetaTags(supabaseUrl, supabaseAnonKey, extra) +
      themeInitScript() +
      headLinks() +
      "</head>" +
      "<body>" +
      '    <div id="auth-app" data-miso-component="auth"></div>' +
      supabaseSdkScript() +
      supabaseBootstrapScript() +
      supabaseFfiShim() +
      wasmAuthScripts() +
      "</body>" +
      "</html>",
    {
      status: error ? 401 : 200,
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    },
  );
}
