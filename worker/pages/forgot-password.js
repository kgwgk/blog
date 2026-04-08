import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  supabaseClientScript,
} from "./shared.js";

export function forgotPasswordPage(supabaseUrl = "", supabaseAnonKey = "") {
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
      "          <article>" +
      "            <h1>Forgot Password</h1>" +
      '            <form class="auth-form" id="forgot-form">' +
      '                <label for="email">Email</label>' +
      '                <input type="email" id="email" name="email" required autocomplete="email" />' +
      '                <button type="submit">Send Reset Email</button>' +
      "            </form>" +
      '            <p class="auth-link"><a href="/login">Back to login</a></p>' +
      "          </article>" +
      "        </div>" +
      "    </main>" +
      themeToggleScript() +
      supabaseClientScript(supabaseUrl, supabaseAnonKey) +
      forgotScript() +
      "</body>" +
      "</html>",
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } },
  );
}

function forgotScript() {
  return (
    "<script>" +
    "(function() {" +
    "  var form = document.getElementById('forgot-form');" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Sending...';" +
    "    try {" +
    "      var email = form.querySelector('[name=\"email\"]').value.trim();" +
    "      if (!email) { btn.disabled = false; btn.textContent = origText; return; }" +
    "      await _supabase.auth.resetPasswordForEmail(email, {" +
    "        redirectTo: window.location.origin + '/reset-password'" +
    "      });" +
    "      form.parentElement.innerHTML = " +
    "        '<h1>Forgot Password</h1>' +" +
    "        '<p class=\"auth-success\">If an account with that email exists, a password reset email has been sent.</p>' +" +
    "        '<p class=\"auth-link\"><a href=\"/login\">Back to login</a></p>';" +
    "    } catch (err) {" +
    "      console.error('Reset request error:', err);" +
    "      btn.disabled = false;" +
    "      btn.textContent = origText;" +
    "    }" +
    "  });" +
    "})();" +
    "</script>"
  );
}
