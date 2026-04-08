import {
  escapeHtml,
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  passwordToggleScript,
  supabaseClientScript,
} from "./shared.js";

export function loginPage(error = null, redirect = "/", supabaseUrl = "", supabaseAnonKey = "") {
  let errorHtml = "";
  if (error === "pending") {
    errorHtml =
      '<p class="auth-error">Your account is awaiting admin approval.</p>';
  } else if (error) {
    errorHtml = '<p class="auth-error">Invalid email or password.</p>';
  }

  return new Response(
    "<!doctype html>" +
      '<html lang="en">' +
      "<head>" +
      '    <meta charset="utf-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
      "    <title>Login - hcentner's blog</title>" +
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
      "            <h1>Login</h1>" +
      errorHtml +
      '            <form class="auth-form" id="login-form">' +
      '                <input type="hidden" name="redirect" value="' +
      escapeHtml(redirect) +
      '" />' +
      '                <label for="email">Email</label>' +
      '                <input type="email" id="email" name="email" required autocomplete="email" />' +
      '                <label for="password">Password</label>' +
      '                <input type="password" id="password" name="password" required autocomplete="current-password" />' +
      '                <button type="submit">Login</button>' +
      "            </form>" +
      '            <p class="auth-link"><a href="/forgot-password">Forgot password?</a></p>' +
      '            <p class="auth-link"><a href="/register">Don\'t have an account? Register</a></p>' +
      "          </article>" +
      "        </div>" +
      "    </main>" +
      themeToggleScript() +
      passwordToggleScript() +
      supabaseClientScript(supabaseUrl, supabaseAnonKey) +
      loginScript() +
      "</body>" +
      "</html>",
    {
      status: error ? 401 : 200,
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    },
  );
}

function loginScript() {
  return (
    "<script>" +
    "(function() {" +
    "  var form = document.getElementById('login-form');" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Signing in...';" +
    "    try {" +
    "      var email = form.querySelector('[name=\"email\"]').value.trim();" +
    "      var password = form.querySelector('[name=\"password\"]').value;" +
    "      var redir = form.querySelector('[name=\"redirect\"]').value;" +
    "      if (!email || !password) { btn.disabled = false; btn.textContent = origText; return; }" +
    "      var { data, error } = await _supabase.auth.signInWithPassword({ email: email, password: password });" +
    "      if (error) {" +
    "        btn.disabled = false;" +
    "        btn.textContent = origText;" +
    "        var existing = form.parentElement.querySelector('.auth-error');" +
    "        if (existing) existing.remove();" +
    "        var err = document.createElement('p');" +
    "        err.className = 'auth-error';" +
    "        err.textContent = error.message || 'Invalid email or password.';" +
    "        form.parentElement.insertBefore(err, form);" +
    "        return;" +
    "      }" +
    "      var callbackForm = document.createElement('form');" +
    "      callbackForm.method = 'POST';" +
    "      callbackForm.action = '/auth/callback';" +
    "      var fields = {" +
    "        access_token: data.session.access_token," +
    "        refresh_token: data.session.refresh_token," +
    "        redirect: redir" +
    "      };" +
    "      for (var key in fields) {" +
    "        var input = document.createElement('input');" +
    "        input.type = 'hidden';" +
    "        input.name = key;" +
    "        input.value = fields[key];" +
    "        callbackForm.appendChild(input);" +
    "      }" +
    "      document.body.appendChild(callbackForm);" +
    "      callbackForm.submit();" +
    "    } catch (err) {" +
    "      console.error('Login error:', err);" +
    "      btn.disabled = false;" +
    "      btn.textContent = origText;" +
    "    }" +
    "  });" +
    "})();" +
    "</script>"
  );
}
