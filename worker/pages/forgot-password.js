import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
} from "./login.js";

export function forgotPasswordPage(success = false, error = null) {
  let messageHtml = "";
  if (success) {
    messageHtml = '<p class="auth-success">If an account with that username exists, a password reset email has been sent.</p>';
  } else if (error) {
    messageHtml = '<p class="auth-error">' + escapeHtml(error) + "</p>";
  }

  const formHtml = success
    ? ""
    : '<form class="auth-form" method="POST" action="/auth/forgot-password">' +
      '    <label for="username">Username</label>' +
      '    <input type="text" id="username" name="username" required autocomplete="username" />' +
      '    <button type="submit">Send Reset Email</button>' +
      "</form>";

  return new Response(
    "<!doctype html>" +
    '<html lang="en">' +
    "<head>" +
    '    <meta charset="utf-8">' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
    "    <title>Forgot Password - hcentner's blog</title>" +
    themeInitScript() +
    headLinks() +
    authStyles() +
    "</head>" +
    "<body>" +
    siteHeader() +
    nav() +
    '    <main role="main">' +
    '        <div class="main-container">' +
    "            <h1>Forgot Password</h1>" +
    messageHtml +
    formHtml +
    '            <p class="auth-link"><a href="/login">Back to login</a></p>' +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    "</body>" +
    "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
