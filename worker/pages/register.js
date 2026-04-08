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

export function registerPage(success = false, error = null, supabaseUrl = "", supabaseAnonKey = "") {
  let messageHtml = "";
  if (success) {
    messageHtml = '<p class="auth-success">Registration submitted! Your account is pending admin approval.</p>';
  } else if (error) {
    messageHtml = '<p class="auth-error">' + escapeHtml(error) + "</p>";
  }

  const formHtml = success
    ? ""
    : '<form class="auth-form" id="register-form">' +
      '    <label for="email">Email</label>' +
      '    <input type="email" id="email" name="email" required autocomplete="email" />' +
      '    <label for="password">Password</label>' +
      '    <input type="password" id="password" name="password" required autocomplete="new-password" />' +
      '    <label for="phone">Phone (optional)</label>' +
      '    <input type="tel" id="phone" name="phone" autocomplete="tel" />' +
      '    <label for="signalId">Signal ID (optional)</label>' +
      '    <input type="text" id="signalId" name="signalId" />' +
      '    <label for="knowFrom">How do you know Harry?</label>' +
      '    <textarea id="knowFrom" name="knowFrom" required rows="3"></textarea>' +
      '    <button type="submit">Register</button>' +
      "</form>";

  const scripts = success
    ? ""
    : passwordToggleScript() +
      supabaseClientScript(supabaseUrl, supabaseAnonKey) +
      registerScript();

  return new Response(
    "<!doctype html>" +
      '<html lang="en">' +
      "<head>" +
      '    <meta charset="utf-8">' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1">' +
      "    <title>Register - hcentner's blog</title>" +
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
      "            <h1>Register</h1>" +
      messageHtml +
      formHtml +
      '            <p class="auth-link"><a href="/login">Already have an account? Login</a></p>' +
      "          </article>" +
      "        </div>" +
      "    </main>" +
      themeToggleScript() +
      scripts +
      "</body>" +
      "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );
}

function registerScript() {
  return (
    "<script>" +
    "(function() {" +
    "  var form = document.getElementById('register-form');" +
    "  if (!form) return;" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Registering...';" +
    "    try {" +
    "      var email = form.querySelector('[name=\"email\"]').value.trim();" +
    "      var password = form.querySelector('[name=\"password\"]').value;" +
    "      var phone = form.querySelector('[name=\"phone\"]').value.trim() || null;" +
    "      var signalId = form.querySelector('[name=\"signalId\"]').value.trim() || null;" +
    "      var knowFrom = form.querySelector('[name=\"knowFrom\"]').value.trim() || null;" +
    "      if (!email || !password) { btn.disabled = false; btn.textContent = origText; return; }" +
    "      var { data, error } = await _supabase.auth.signUp({" +
    "        email: email," +
    "        password: password," +
    "        options: { data: { phone: phone, signalId: signalId, knowFrom: knowFrom } }" +
    "      });" +
    "      if (error) {" +
    "        btn.disabled = false;" +
    "        btn.textContent = origText;" +
    "        var existing = form.parentElement.querySelector('.auth-error');" +
    "        if (existing) existing.remove();" +
    "        var err = document.createElement('p');" +
    "        err.className = 'auth-error';" +
    "        err.textContent = error.message;" +
    "        form.parentElement.insertBefore(err, form);" +
    "        return;" +
    "      }" +
    "      form.parentElement.innerHTML = " +
    "        '<h1>Register</h1>' +" +
    "        '<p class=\"auth-success\">Registration submitted! Your account is pending admin approval.</p>' +" +
    "        '<p class=\"auth-link\"><a href=\"/login\">Already have an account? Login</a></p>';" +
    "    } catch (err) {" +
    "      console.error('Registration error:', err);" +
    "      btn.disabled = false;" +
    "      btn.textContent = origText;" +
    "    }" +
    "  });" +
    "})();" +
    "</script>"
  );
}
