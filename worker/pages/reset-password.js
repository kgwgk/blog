import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  hashWasmScript,
  escapeHtml,
} from "./login.js";

export function resetPasswordPage(token, username, error = null) {
  let errorHtml = "";
  if (error) {
    errorHtml = '<p class="auth-error">' + escapeHtml(error) + "</p>";
  }

  return new Response(
    "<!doctype html>" +
    '<html lang="en">' +
    "<head>" +
    '    <meta charset="utf-8">' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
    "    <title>Reset Password - hcentner's blog</title>" +
    themeInitScript() +
    headLinks() +
    authStyles() +
    "</head>" +
    "<body>" +
    siteHeader() +
    nav() +
    '    <main role="main">' +
    '        <div class="main-container">' +
    "            <h1>Reset Password</h1>" +
    errorHtml +
    '            <form class="auth-form" id="reset-form">' +
    '                <input type="hidden" name="token" value="' + escapeHtml(token) + '" />' +
    '                <input type="hidden" name="username" value="' + escapeHtml(username) + '" />' +
    '                <input type="hidden" name="clientHash" id="clientHash" />' +
    '                <p style="font-size: 1.4rem; color: var(--dark-grey-color); margin-bottom: 1rem;">Resetting password for <strong>' + escapeHtml(username) + "</strong></p>" +
    '                <label for="password">New Password</label>' +
    '                <input type="password" id="password" name="password" required autocomplete="new-password" />' +
    '                <label for="confirmPassword">Confirm New Password</label>' +
    '                <input type="password" id="confirmPassword" name="confirmPassword" required autocomplete="new-password" />' +
    '                <button type="submit">Reset Password</button>' +
    "            </form>" +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    hashWasmScript() +
    resetHashScript() +
    "</body>" +
    "</html>",
    { status: error ? 400 : 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

export function resetPasswordExpiredPage() {
  return new Response(
    "<!doctype html>" +
    '<html lang="en">' +
    "<head>" +
    '    <meta charset="utf-8">' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
    "    <title>Reset Password - hcentner's blog</title>" +
    themeInitScript() +
    headLinks() +
    authStyles() +
    "</head>" +
    "<body>" +
    siteHeader() +
    nav() +
    '    <main role="main">' +
    '        <div class="main-container">' +
    "            <h1>Reset Password</h1>" +
    '            <p class="auth-error">This reset link is invalid or has expired.</p>' +
    '            <p class="auth-link"><a href="/forgot-password">Request a new reset link</a></p>' +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    "</body>" +
    "</html>",
    { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

export function resetPasswordSuccessPage() {
  return new Response(
    "<!doctype html>" +
    '<html lang="en">' +
    "<head>" +
    '    <meta charset="utf-8">' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
    "    <title>Password Reset - hcentner's blog</title>" +
    themeInitScript() +
    headLinks() +
    authStyles() +
    "</head>" +
    "<body>" +
    siteHeader() +
    nav() +
    '    <main role="main">' +
    '        <div class="main-container">' +
    "            <h1>Password Reset</h1>" +
    '            <p class="auth-success">Your password has been reset successfully.</p>' +
    '            <p class="auth-link"><a href="/login">Go to login</a></p>' +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    "</body>" +
    "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

function resetHashScript() {
  return "<script>" +
    "(function() {" +
    "  var form = document.getElementById('reset-form');" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    var passwordEl = document.getElementById('password');" +
    "    var confirmEl = document.getElementById('confirmPassword');" +
    "    if (passwordEl.value !== confirmEl.value) {" +
    "      var existing = form.querySelector('.auth-error');" +
    "      if (existing) existing.remove();" +
    "      var err = document.createElement('p');" +
    "      err.className = 'auth-error';" +
    "      err.textContent = 'Passwords do not match.';" +
    "      form.insertBefore(err, form.firstChild);" +
    "      return;" +
    "    }" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Hashing...';" +
    "    try {" +
    "      var username = form.querySelector('[name=\"username\"]').value;" +
    "      var password = passwordEl.value;" +
    "      if (!password) { btn.disabled = false; btn.textContent = origText; return; }" +
    "      var enc = new TextEncoder();" +
    "      var saltInput = enc.encode('hcentner.dev:' + username);" +
    "      var saltBuf = await crypto.subtle.digest('SHA-256', saltInput);" +
    "      var salt = new Uint8Array(saltBuf).slice(0, 16);" +
    "      var clientHash = await hashwasm.argon2id({" +
    "        password: password," +
    "        salt: salt," +
    "        parallelism: 4, iterations: 3, memorySize: 65536, hashLength: 32," +
    "        outputType: 'encoded'" +
    "      });" +
    "      form.querySelector('[name=\"clientHash\"]').value = clientHash;" +
    "      passwordEl.value = '';" +
    "      confirmEl.value = '';" +
    "      var formData = new FormData(form);" +
    "      formData.delete('password');" +
    "      formData.delete('confirmPassword');" +
    "      var resp = await fetch('/auth/reset-password', {" +
    "        method: 'POST'," +
    "        body: formData," +
    "        redirect: 'follow'" +
    "      });" +
    "      if (resp.redirected) {" +
    "        window.location.href = resp.url;" +
    "      } else {" +
    "        document.open();" +
    "        document.write(await resp.text());" +
    "        document.close();" +
    "      }" +
    "    } catch (err) {" +
    "      console.error('Hashing error:', err);" +
    "      btn.disabled = false;" +
    "      btn.textContent = origText;" +
    "    }" +
    "  });" +
    "})();" +
    "</script>";
}
