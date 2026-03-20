const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "noreply@hcentner.dev";
const FROM_NAME = "hcentner's blog";

export async function sendResetEmail(toAddress, username, resetToken, resendApiKey) {
  const resetUrl = `https://hcentner.dev/reset-password?token=${resetToken}`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: [toAddress],
      subject: "Password Reset Request",
      html:
        "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto;\">" +
        "<h2>Password Reset</h2>" +
        "<p>Hi <strong>" + escapeHtml(username) + "</strong>,</p>" +
        "<p>A password reset was requested for your account. Click the link below to set a new password:</p>" +
        '<p><a href="' + resetUrl + '" style="display: inline-block; padding: 10px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a></p>' +
        "<p>Or copy this URL into your browser:</p>" +
        "<p style=\"word-break: break-all; color: #666;\">" + resetUrl + "</p>" +
        "<p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>" +
        "</div>",
    }),
  });

  return response.ok;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
