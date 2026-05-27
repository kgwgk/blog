import {
  themeInitScript,
  headLinks,
  authMetaTags,
  wasmAuthScripts,
} from "./shared.js";

export function membersPage(email) {
  return new Response(
    "<!doctype html>" +
      '<html lang="en">' +
      "<head>" +
      '    <meta charset="utf-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
      "    <title>Members - hcentner's blog</title>" +
      // Members doesn't use Supabase — only injects the email for miso to render.
      authMetaTags("", "", { "member-email": email }) +
      themeInitScript() +
      headLinks() +
      "</head>" +
      "<body>" +
      '    <div id="auth-app" data-miso-component="auth"></div>' +
      wasmAuthScripts() +
      "</body>" +
      "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );
}
