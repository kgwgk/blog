import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  passwordToggleScript,
  supabaseClientScript,
} from "./shared.js";

export function resetPasswordPage(supabaseUrl = "", supabaseAnonKey = "") {
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
      "          <article>" +
      '            <div id="reset-container">' +
      '              <p class="auth-error" style="display:none" id="reset-error"></p>' +
      '              <p style="font-size:1.4rem; color:var(--dark-grey-color);">Loading...</p>' +
      "            </div>" +
      "          </article>" +
      "        </div>" +
      "    </main>" +
      themeToggleScript() +
      passwordToggleScript() +
      supabaseClientScript(supabaseUrl, supabaseAnonKey) +
      resetScript() +
      "</body>" +
      "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );
}

function resetScript() {
  return (
    "<script>" +
    "(async function() {" +
    "  var container = document.getElementById('reset-container');" +
    // Supabase redirects with tokens in the URL hash fragment
    "  var hash = window.location.hash.substring(1);" +
    "  var params = new URLSearchParams(hash);" +
    "  var accessToken = params.get('access_token');" +
    "  var refreshToken = params.get('refresh_token');" +
    "  var type = params.get('type');" +
    "  if (!accessToken || type !== 'recovery') {" +
    "    container.innerHTML = " +
    "      '<h1>Reset Password</h1>' +" +
    "      '<p class=\"auth-error\">This reset link is invalid or has expired.</p>' +" +
    "      '<p class=\"auth-link\"><a href=\"/forgot-password\">Request a new reset link</a></p>';" +
    "    return;" +
    "  }" +
    "  var { error } = await _supabase.auth.setSession({" +
    "    access_token: accessToken," +
    "    refresh_token: refreshToken" +
    "  });" +
    "  if (error) {" +
    "    container.innerHTML = " +
    "      '<h1>Reset Password</h1>' +" +
    "      '<p class=\"auth-error\">This reset link is invalid or has expired.</p>' +" +
    "      '<p class=\"auth-link\"><a href=\"/forgot-password\">Request a new reset link</a></p>';" +
    "    return;" +
    "  }" +
    "  container.innerHTML = " +
    "    '<h1>Reset Password</h1>' +" +
    "    '<form class=\"auth-form\" id=\"reset-form\">' +" +
    "    '  <label for=\"password\">New Password</label>' +" +
    "    '  <input type=\"password\" id=\"password\" name=\"password\" required autocomplete=\"new-password\" />' +" +
    "    '  <label for=\"confirmPassword\">Confirm New Password</label>' +" +
    "    '  <input type=\"password\" id=\"confirmPassword\" name=\"confirmPassword\" required autocomplete=\"new-password\" />' +" +
    "    '  <button type=\"submit\">Reset Password</button>' +" +
    "    '</form>';" +
    // Re-run password toggle for newly created inputs
    "  document.querySelectorAll('#reset-form input[type=\"password\"]').forEach(function(input) {" +
    "    var wrapper = document.createElement('div');" +
    "    wrapper.className = 'password-wrapper';" +
    "    input.parentNode.insertBefore(wrapper, input);" +
    "    wrapper.appendChild(input);" +
    "    var btn = document.createElement('button');" +
    "    btn.type = 'button';" +
    "    btn.className = 'password-toggle';" +
    "    btn.setAttribute('aria-label', 'Toggle password visibility');" +
    "    var eyeClosed = '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/></svg>';" +
    "    var eyeOpen = '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>';" +
    "    btn.innerHTML = eyeClosed;" +
    "    btn.addEventListener('click', function() {" +
    "      if (input.type === 'password') { input.type = 'text'; btn.innerHTML = eyeOpen; }" +
    "      else { input.type = 'password'; btn.innerHTML = eyeClosed; }" +
    "    });" +
    "    btn.style.height = input.offsetHeight + 'px';" +
    "    wrapper.appendChild(btn);" +
    "  });" +
    "  var form = document.getElementById('reset-form');" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    var passwordEl = document.getElementById('password');" +
    "    var confirmEl = document.getElementById('confirmPassword');" +
    "    var existing = container.querySelector('.auth-error');" +
    "    if (existing) existing.remove();" +
    "    if (passwordEl.value !== confirmEl.value) {" +
    "      var err = document.createElement('p');" +
    "      err.className = 'auth-error';" +
    "      err.textContent = 'Passwords do not match.';" +
    "      container.insertBefore(err, container.querySelector('h1').nextSibling);" +
    "      return;" +
    "    }" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Resetting...';" +
    "    try {" +
    "      var { error } = await _supabase.auth.updateUser({ password: passwordEl.value });" +
    "      if (error) {" +
    "        btn.disabled = false;" +
    "        btn.textContent = origText;" +
    "        var err = document.createElement('p');" +
    "        err.className = 'auth-error';" +
    "        err.textContent = error.message;" +
    "        container.insertBefore(err, container.querySelector('h1').nextSibling);" +
    "        return;" +
    "      }" +
    "      container.innerHTML = " +
    "        '<h1>Password Reset</h1>' +" +
    "        '<p class=\"auth-success\">Your password has been reset successfully.</p>' +" +
    "        '<p class=\"auth-link\"><a href=\"/login\">Go to login</a></p>';" +
    "    } catch (err) {" +
    "      console.error('Reset error:', err);" +
    "      btn.disabled = false;" +
    "      btn.textContent = origText;" +
    "    }" +
    "  });" +
    "})();" +
    "</script>"
  );
}
