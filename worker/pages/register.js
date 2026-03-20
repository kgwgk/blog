import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  hashWasmScript,
  clientHashScript,
} from "./login.js";

export function registerPage(success = false, error = null) {
  let messageHtml = "";
  if (success) {
    messageHtml = `<p class="auth-success">Registration submitted! Your account is pending admin approval.</p>`;
  } else if (error) {
    messageHtml = `<p class="auth-error">${escapeHtml(error)}</p>`;
  }

  const formHtml = success
    ? ""
    : `<form class="auth-form" id="register-form">
                <input type="hidden" name="clientHash" id="clientHash" />
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autocomplete="username" />
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required autocomplete="email" />
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="new-password" />
                <label for="phone">Phone (optional)</label>
                <input type="tel" id="phone" name="phone" autocomplete="tel" />
                <label for="signalId">Signal ID (optional)</label>
                <input type="text" id="signalId" name="signalId" />
                <button type="submit">Register</button>
            </form>`;

  const scripts = success
    ? ""
    : `${hashWasmScript()}${clientHashScript("/auth/register")}`;

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Register - hcentner's blog</title>
    ${themeInitScript()}
    ${headLinks()}
    ${authStyles()}
</head>
<body>
    ${siteHeader()}
    ${nav()}
    <main role="main">
        <div class="main-container">
            <h1>Register</h1>
            ${messageHtml}
            ${formHtml}
            <p class="auth-link"><a href="/login">Already have an account? Login</a></p>
        </div>
    </main>
    ${themeToggleScript()}
    ${scripts}
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
