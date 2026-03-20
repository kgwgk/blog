import {
  themeInitScript,
  headLinks,
  siteHeader,
  nav,
  themeToggleScript,
} from "./login.js";

export function membersPage(username) {
  return new Response(
    "<!doctype html>" +
    '<html lang="en">' +
    "<head>" +
    '    <meta charset="utf-8">' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
    "    <title>Members - hcentner's blog</title>" +
    themeInitScript() +
    headLinks() +
    "<style>" +
    ".members-page { max-width: 40rem; margin: 2rem auto; }" +
    ".members-page p { font-size: 1.5rem; font-family: 'Lora', serif; margin-bottom: 0.75rem; color: var(--dark-grey-color); }" +
    ".logout-link { font-size: 1.4rem; }" +
    "</style>" +
    "</head>" +
    "<body>" +
    siteHeader() +
    nav() +
    '    <main role="main">' +
    '        <div class="main-container">' +
    '            <div class="members-page">' +
    "            <h1>Members</h1>" +
    "            <p>Welcome, " + escapeHtml(username) + "!</p>" +
    '            <p class="logout-link"><a href="/auth/logout">Logout</a></p>' +
    "            </div>" +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    "</body>" +
    "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
