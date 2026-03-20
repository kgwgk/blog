import {
  themeInitScript,
  headLinks,
  authStyles,
  siteHeader,
  nav,
  themeToggleScript,
  hashWasmScript,
} from "./login.js";

export async function adminPage(env, message = null) {
  const list = await env.HCENTNER_BLOG_AUTH_USERS.list({ prefix: "user:" });
  const users = [];
  for (const key of list.keys) {
    const val = await env.HCENTNER_BLOG_AUTH_USERS.get(key.name, "json");
    if (val) users.push(val);
  }

  const pending = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const disabled = users.filter((u) => u.status === "disabled");

  const messageHtml = message
    ? `<p class="auth-success">${escapeHtml(message)}</p>`
    : "";

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin - hcentner's blog</title>
    ${themeInitScript()}
    ${headLinks()}
    ${authStyles()}
    ${adminStyles()}
</head>
<body>
    ${siteHeader()}
    ${nav()}
    <main role="main">
        <div class="main-container">
            <h1>Admin Dashboard</h1>
            ${messageHtml}

            <h2>Pending Approvals (${pending.length})</h2>
            ${pending.length === 0 ? "<p>No pending registrations.</p>" : ""}
            ${pending.map((u) => pendingUserCard(u)).join("")}

            <h2>Approved Users (${approved.length})</h2>
            ${approved.length === 0 ? "<p>No approved users.</p>" : ""}
            ${approved.map((u) => approvedUserCard(u)).join("")}

            <h2>Disabled Users (${disabled.length})</h2>
            ${disabled.length === 0 ? "<p>No disabled users.</p>" : ""}
            ${disabled.map((u) => disabledUserCard(u)).join("")}
        </div>
    </main>
    ${themeToggleScript()}
    ${hashWasmScript()}
    ${adminResetPasswordScript()}
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } }
  );
}

function adminStyles() {
  return `<style>
      .user-card {
        border: 1px solid var(--border-color); border-radius: 4px;
        padding: 1rem; margin-bottom: 1rem;
      }
      .user-card p { font-size: 1.4rem; margin-bottom: 0.3rem; color: var(--dark-grey-color); }
      .user-card strong { font-weight: bold; }
      .user-card form { display: inline-block; margin-right: 0.5rem; margin-top: 0.5rem; }
      .user-card button {
        font-family: "Dosis", sans-serif; font-size: 1.3rem; text-transform: uppercase;
        padding: 0.3rem 1rem; border: 1px solid var(--primary-color); border-radius: 3px;
        background: none; color: var(--primary-color); cursor: pointer;
      }
      .user-card button:hover { text-decoration: underline; }
      .user-card button:disabled { opacity: 0.5; cursor: wait; }
      .user-card select {
        font-size: 1.3rem; padding: 0.3rem; border: 1px solid var(--border-color);
        border-radius: 3px; background: var(--bg-color); color: var(--text-color);
      }
    </style>`;
}

function pendingUserCard(user) {
  return `<div class="user-card">
      <p><strong>${escapeHtml(user.username)}</strong> — ${escapeHtml(user.email)}</p>
      ${user.phone ? `<p>Phone: ${escapeHtml(user.phone)}</p>` : ""}
      ${user.signalId ? `<p>Signal: ${escapeHtml(user.signalId)}</p>` : ""}
      <form method="POST" action="/admin/api/approve">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <label>Role:
          <select name="role">
            <option value="friend">Friend</option>
            <option value="family">Family</option>
          </select>
        </label>
        <button type="submit">Approve</button>
      </form>
      <form method="POST" action="/admin/api/disable">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <button type="submit">Reject</button>
      </form>
    </div>`;
}

function approvedUserCard(user) {
  return `<div class="user-card">
      <p><strong>${escapeHtml(user.username)}</strong> — ${escapeHtml(user.email)} — role: ${escapeHtml(user.role)}</p>
      <form method="POST" action="/admin/api/set-role">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <select name="role">
          <option value="friend" ${user.role === "friend" ? "selected" : ""}>Friend</option>
          <option value="family" ${user.role === "family" ? "selected" : ""}>Family</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
        <button type="submit">Set Role</button>
      </form>
      <form method="POST" action="/admin/api/disable">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <button type="submit">Disable</button>
      </form>
      <form class="reset-password-form" data-username="${escapeHtml(user.username)}">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <input type="hidden" name="clientHash" />
        <input type="password" name="password" placeholder="New password" required style="font-size:1.3rem;padding:0.3rem;width:12rem;" />
        <button type="submit">Reset Password</button>
      </form>
    </div>`;
}

function disabledUserCard(user) {
  return `<div class="user-card">
      <p><strong>${escapeHtml(user.username)}</strong> — ${escapeHtml(user.email)} — role: ${escapeHtml(user.role)}</p>
      <form method="POST" action="/admin/api/approve">
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <input type="hidden" name="role" value="${escapeHtml(user.role)}" />
        <button type="submit">Re-enable</button>
      </form>
    </div>`;
}

// Admin reset-password forms need client-side Argon2 hashing
function adminResetPasswordScript() {
  return `<script>
(function() {
  document.querySelectorAll('.reset-password-form').forEach(function(form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Hashing...';

      try {
        var username = form.dataset.username;
        var password = form.querySelector('[name="password"]').value;
        if (!password) { btn.disabled = false; btn.textContent = 'Reset Password'; return; }

        var enc = new TextEncoder();
        var saltBuf = await crypto.subtle.digest("SHA-256", enc.encode("hcentner.dev:" + username));
        var salt = new Uint8Array(saltBuf).slice(0, 16);

        var clientHash = await hashwasm.argon2id({
          password: password,
          salt: salt,
          parallelism: 4, iterations: 3, memorySize: 65536, hashLength: 32,
          outputType: "encoded"
        });

        form.querySelector('[name="clientHash"]').value = clientHash;
        form.querySelector('[name="password"]').value = '';

        var formData = new FormData(form);
        formData.delete('password');
        await fetch("/admin/api/reset-password", { method: "POST", body: formData });
        window.location.reload();
      } catch (err) {
        console.error('Hashing error:', err);
        btn.disabled = false;
        btn.textContent = 'Reset Password';
      }
    });
  });
})();
</script>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
