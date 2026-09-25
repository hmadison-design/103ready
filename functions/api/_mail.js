// Transactional mail. Resend when RESEND_API_KEY is set. Otherwise, and only
// when DEV_MAIL_ECHO is also set (previews, local tests), the caller may
// echo the link and code in the response. In production with neither set,
// sending fails closed and start.js reports it plainly.

export async function sendSignInMail(env, to, link, code) {
  if (!env.RESEND_API_KEY) { return { sent: false, reason: "no mail provider configured" }; }
  const from = env.MAIL_FROM || "103 Ready <signin@103ready.com>";
  const text =
`Your 103 Ready sign-in

Click this link to sign in:
${link}

Or enter this code on the sign-in page:
${code}

Both expire in fifteen minutes. If you did not ask for this, ignore it; nothing happens unless the link is opened or the code is entered.`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: "Your 103 Ready sign-in link and code", text })
    });
    if (!r.ok) { return { sent: false, reason: "mail provider error " + r.status }; }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: "mail provider unreachable" };
  }
}
