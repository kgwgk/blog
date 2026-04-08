// Shared HTML fragments for auth pages

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function themeInitScript() {
  return '<script>(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)})()</script>';
}

export function headLinks() {
  return (
    '<link rel="stylesheet" href="/css/default.css" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">' +
    '<link href="https://fonts.googleapis.com/css?family=Dosis:400,500,700&display=swap" rel="stylesheet">'
  );
}

export function authStyles() {
  return (
    "<style>" +
    ".auth-form { max-width: 28rem; margin: 2rem auto; }" +
    ".auth-form label { display: block; font-size: 1.5rem; margin-bottom: 0.3rem; color: var(--dark-grey-color); }" +
    '.auth-form input[type="text"],' +
    '.auth-form input[type="password"],' +
    '.auth-form input[type="email"],' +
    '.auth-form input[type="tel"],' +
    ".auth-form select {" +
    '  width: 100%; padding: 0.5rem; font-size: 1.5rem; font-family: "Lora", serif;' +
    "  border: 1px solid var(--border-color); border-radius: 4px;" +
    "  background: var(--bg-color); color: var(--text-color);" +
    "  box-sizing: border-box; margin-bottom: 1rem;" +
    "}" +
    ".auth-form textarea {" +
    '  width: 100%; padding: 0.5rem; font-size: 1.5rem; font-family: "Lora", serif;' +
    "  border: 1px solid var(--border-color); border-radius: 4px;" +
    "  background: var(--bg-color); color: var(--text-color);" +
    "  box-sizing: border-box; margin-bottom: 1rem; resize: vertical;" +
    "}" +
    '.auth-form button[type="submit"] {' +
    '  font-family: "Dosis", sans-serif; font-size: 1.6rem; text-transform: uppercase;' +
    "  padding: 0.5rem 1.5rem; border: 1px solid var(--primary-color); border-radius: 3px;" +
    "  background: none; color: var(--primary-color); cursor: pointer;" +
    "}" +
    '.auth-form button[type="submit"]:hover { text-decoration: underline; }' +
    '.auth-form button[type="submit"]:disabled { opacity: 0.5; cursor: wait; }' +
    ".auth-error { color: #c0392b; font-size: 1.4rem; margin-bottom: 1rem; }" +
    ".auth-success { color: #27ae60; font-size: 1.4rem; margin-bottom: 1rem; }" +
    ".auth-link { font-size: 1.4rem; margin-top: 1rem; }" +
    ".password-wrapper { position: relative; margin-bottom: 1rem; }" +
    ".password-wrapper input { padding-right: 3rem; margin-bottom: 0; }" +
    ".password-toggle {" +
    "  position: absolute; right: 0.5rem; top: 0;" +
    "  background: none; border: none; cursor: pointer; padding: 0;" +
    "  color: var(--light-grey-color);" +
    "  display: flex; align-items: center;" +
    "}" +
    ".password-toggle:hover { color: var(--dark-grey-color); }" +
    "</style>"
  );
}

export function siteHeader() {
  return (
    '<header class="logo">' +
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
    "</header>"
  );
}

export function nav() {
  return (
    "<nav>" +
    '    <div class="sidebar-container">' +
    '        <a href="/">Home</a>' +
    '        <a href="/about.html">About</a>' +
    '        <a href="/archive.html">Archive</a>' +
    '        <button id="theme-toggle" aria-label="Toggle dark mode">Dark</button>' +
    "    </div>" +
    "</nav>"
  );
}

export function themeToggleScript() {
  return (
    "<script>" +
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
    "</script>"
  );
}

export function passwordToggleScript() {
  return (
    "<script>" +
    "(function() {" +
    "  document.querySelectorAll('.auth-form input[type=\"password\"]').forEach(function(input) {" +
    "    var wrapper = document.createElement('div');" +
    "    wrapper.className = 'password-wrapper';" +
    "    input.parentNode.insertBefore(wrapper, input);" +
    "    wrapper.appendChild(input);" +
    "    var btn = document.createElement('button');" +
    "    btn.type = 'button';" +
    "    btn.className = 'password-toggle';" +
    "    btn.setAttribute('aria-label', 'Toggle password visibility');" +
    "    var eyeOpen = '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>';" +
    "    var eyeClosed = '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/></svg>';" +
    "    btn.innerHTML = eyeClosed;" +
    "    btn.addEventListener('click', function() {" +
    "      if (input.type === 'password') {" +
    "        input.type = 'text';" +
    "        btn.innerHTML = eyeOpen;" +
    "      } else {" +
    "        input.type = 'password';" +
    "        btn.innerHTML = eyeClosed;" +
    "      }" +
    "    });" +
    "    btn.style.height = input.offsetHeight + 'px';" +
    "    wrapper.appendChild(btn);" +
    "  });" +
    "})();" +
    "</script>"
  );
}

export function supabaseClientScript(supabaseUrl, supabaseAnonKey) {
  return (
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>' +
    "<script>" +
    "var _supabase = supabase.createClient(" +
    "'" + supabaseUrl + "'," +
    "'" + supabaseAnonKey + "'" +
    ");" +
    "</script>"
  );
}
