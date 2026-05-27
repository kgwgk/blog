import {
  themeInitScript,
  headLinks,
  authMetaTags,
  supabaseSdkScript,
  supabaseBootstrapScript,
  supabaseFfiShim,
  wasmAuthScripts,
} from "./shared.js";

export function registerPage(_success = false, _error = null, supabaseUrl = "", supabaseAnonKey = "") {
  return new Response(
    "<!doctype html>" +
      '<html lang="en">' +
      "<head>" +
      '    <meta charset="utf-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
      "    <title>Register - hcentner's blog</title>" +
      authMetaTags(supabaseUrl, supabaseAnonKey) +
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
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );
}
