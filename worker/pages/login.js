export function loginPage(error = null, redirect = "/") {
  let errorHtml = "";
  if (error === "pending") {
    errorHtml = '<p class="auth-error">Your account is awaiting admin approval.</p>';
  } else if (error) {
    errorHtml = '<p class="auth-error">Invalid username or password.</p>';
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
    "            <h1>Login</h1>" +
    errorHtml +
    '            <form class="auth-form" id="login-form">' +
    '                <input type="hidden" name="redirect" value="' + escapeHtml(redirect) + '" />' +
    '                <input type="hidden" name="clientHash" id="clientHash" />' +
    '                <label for="username">Username</label>' +
    '                <input type="text" id="username" name="username" required autocomplete="username" />' +
    '                <label for="password">Password</label>' +
    '                <input type="password" id="password" name="password" required autocomplete="current-password" />' +
    '                <button type="submit">Login</button>' +
    "            </form>" +
    '            <p class="auth-link"><a href="/forgot-password">Forgot password?</a></p>' +
    '            <p class="auth-link"><a href="/register">Don\'t have an account? Register</a></p>' +
    "        </div>" +
    "    </main>" +
    themeToggleScript() +
    hashWasmScript() +
    clientHashScript("/auth/login") +
    "</body>" +
    "</html>",
    { status: error ? 401 : 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

// Shared HTML fragments

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function themeInitScript() {
  return '<script>(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)})()</script>';
}

export function headLinks() {
  return '<link rel="stylesheet" href="/css/default.css" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
    '<link href="https://fonts.googleapis.com/css?family=Dosis:400,500,700&display=swap" rel="stylesheet">';
}

export function authStyles() {
  return '<style>' +
    '.auth-form { max-width: 28rem; margin: 2rem auto; }' +
    '.auth-form label { display: block; font-size: 1.5rem; margin-bottom: 0.3rem; color: var(--dark-grey-color); }' +
    '.auth-form input[type="text"],' +
    '.auth-form input[type="password"],' +
    '.auth-form input[type="email"],' +
    '.auth-form input[type="tel"],' +
    '.auth-form select {' +
    '  width: 100%; padding: 0.5rem; font-size: 1.5rem; font-family: "Lora", serif;' +
    '  border: 1px solid var(--border-color); border-radius: 4px;' +
    '  background: var(--bg-color); color: var(--text-color);' +
    '  box-sizing: border-box; margin-bottom: 1rem;' +
    '}' +
    '.auth-form button {' +
    '  font-family: "Dosis", sans-serif; font-size: 1.6rem; text-transform: uppercase;' +
    '  padding: 0.5rem 1.5rem; border: 1px solid var(--primary-color); border-radius: 3px;' +
    '  background: none; color: var(--primary-color); cursor: pointer;' +
    '}' +
    '.auth-form button:hover { text-decoration: underline; }' +
    '.auth-form button:disabled { opacity: 0.5; cursor: wait; }' +
    '.auth-error { color: #c0392b; font-size: 1.4rem; margin-bottom: 1rem; }' +
    '.auth-success { color: #27ae60; font-size: 1.4rem; margin-bottom: 1rem; }' +
    '.auth-link { font-size: 1.4rem; margin-top: 1rem; }' +
    '</style>';
}

export function siteHeader() {
  return '<header class="logo">' +
    '    <div class="logo-container">' +
    '        <a href="/" aria-label="hcentner\'s blog">' +
    '        <img src="/images/kristofferson-transparent.png" alt="" class="logo-img"/>' +
    "        </a>" +
    "    </div>" +
    "</header>" +
    '<header class="blog-title">' +
    '    <div class="blog-title-container">' +
    '        <a href="/">hcentner\'s blog</a>' +
    "    </div>" +
    "</header>";
}

export function nav() {
  return "<nav>" +
    '    <div class="sidebar-container">' +
    '        <a href="/">Home</a>' +
    '        <a href="/about.html">About</a>' +
    '        <a href="/archive.html">Archive</a>' +
    '        <a href="/members/">Members</a>' +
    '        <button id="theme-toggle" aria-label="Toggle dark mode">Dark</button>' +
    "    </div>" +
    "</nav>";
}

export function themeToggleScript() {
  return "<script>" +
    "(function() {" +
    "    var toggle = document.getElementById('theme-toggle');" +
    "    var stored = localStorage.getItem('theme');" +
    "    function applyTheme(theme) {" +
    "        if (theme === 'dark') {" +
    "            document.documentElement.setAttribute('data-theme', 'dark');" +
    "            toggle.textContent = 'Light';" +
    "        } else if (theme === 'light') {" +
    "            document.documentElement.setAttribute('data-theme', 'light');" +
    "            toggle.textContent = 'Dark';" +
    "        } else {" +
    "            document.documentElement.removeAttribute('data-theme');" +
    "            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;" +
    "            toggle.textContent = prefersDark ? 'Light' : 'Dark';" +
    "        }" +
    "    }" +
    "    applyTheme(stored);" +
    "    toggle.addEventListener('click', function() {" +
    "        var current = document.documentElement.getAttribute('data-theme');" +
    "        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;" +
    "        var next = !current ? (prefersDark ? 'light' : 'dark') : (current === 'dark' ? 'light' : 'dark');" +
    "        localStorage.setItem('theme', next);" +
    "        applyTheme(next);" +
    "    });" +
    "})();" +
    "</script>";
}

export function hashWasmScript() {
  return '<script src="https://cdn.jsdelivr.net/npm/hash-wasm@4/dist/argon2.umd.min.js"></script>';
}

export function clientHashScript(action) {
  return "<script>" +
    "(function() {" +
    "  var form = document.querySelector('.auth-form');" +
    "  form.addEventListener('submit', async function(e) {" +
    "    e.preventDefault();" +
    "    var btn = form.querySelector('button[type=\"submit\"]');" +
    "    var origText = btn.textContent;" +
    "    btn.disabled = true;" +
    "    btn.textContent = 'Hashing...';" +
    "    try {" +
    "      var username = form.querySelector('[name=\"username\"]') ?" +
    "        form.querySelector('[name=\"username\"]').value.trim().toLowerCase() : '';" +
    "      var passwordEl = form.querySelector('[name=\"password\"]');" +
    "      var password = passwordEl ? passwordEl.value : '';" +
    "      if (!password || !username) { btn.disabled = false; btn.textContent = origText; return; }" +
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
    "      if (passwordEl) passwordEl.value = '';" +
    "      var formData = new FormData(form);" +
    "      formData.delete('password');" +
    "      var resp = await fetch('" + action + "', {" +
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

export { escapeHtml };
