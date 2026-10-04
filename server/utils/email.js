// Sends emails through SMTP when SMTP_HOST is set (e.g. Resend, Brevo, Gmail SMTP).
// Without SMTP settings, emails are printed in the server console instead, so links
// (password reset, email verification) can still be used while developing.
const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;
// In tests, sent emails are collected here so tests can read the links.
const sentEmails = [];

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const layout = (title, bodyHtml) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2d3748">
    <h2 style="color:#7c0034;margin-bottom:4px">FLAGZEN</h2>
    <h3 style="margin-top:0">${escapeHtml(title)}</h3>
    ${bodyHtml}
    <p style="color:#718096;font-size:12px;margin-top:32px">You received this email because of your Flagzen account.</p>
  </div>`;

const button = (href, label) =>
  `<p><a href="${escapeHtml(href)}" style="background:#7c0034;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(label)}</a></p>
   <p style="font-size:12px;color:#718096">Or open this link: ${escapeHtml(href)}</p>`;

async function sendEmail({ to, subject, html, text }) {
  if (config.isTest) {
    sentEmails.push({ to, subject, html, text });
    return;
  }
  if (!config.email.enabled) {
    console.log(`\n[email] To: ${to}\n[email] Subject: ${subject}\n${text}\n`);
    return;
  }
  try {
    transporter ||= nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    });
    await transporter.sendMail({ from: config.email.from, to, subject, html, text });
  } catch (err) {
    // An email problem should never break the action that triggered it.
    console.error("Email could not be sent:", err.message);
  }
}

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const emails = {
  verifyEmail: (user, link) =>
    sendEmail({
      to: user.email,
      subject: "Confirm your email for Flagzen",
      text: `Hi ${user.username}, confirm your email by opening: ${link}`,
      html: layout("Confirm your email", `<p>Hi ${escapeHtml(user.username)},</p><p>Please confirm your email address.</p>${button(link, "Confirm email")}`),
    }),

  resetPassword: (user, link) =>
    sendEmail({
      to: user.email,
      subject: "Reset your Flagzen password",
      text: `Hi ${user.username}, reset your password here (valid for 1 hour): ${link}`,
      html: layout("Reset your password", `<p>Hi ${escapeHtml(user.username)},</p><p>Use this link within 1 hour to choose a new password. If you didn't ask for this, you can ignore this email.</p>${button(link, "Choose a new password")}`),
    }),

  orderConfirmation: (user, orderId, lines, amount) =>
    sendEmail({
      to: user.email,
      subject: `Your Flagzen order ${orderId}`,
      text: `Thanks for your order ${orderId}. Total paid: ${money(amount)}. ` +
        lines.map((l) => `${l.quantity} x ${l.productName}`).join(", "),
      html: layout(
        `Thanks for your order!`,
        `<p>Order <b>${escapeHtml(orderId)}</b></p>
         <ul>${lines.map((l) => `<li>${l.quantity} × ${escapeHtml(l.productName)} (${money(l.unitPrice)} each)</li>`).join("")}</ul>
         <p>Total paid: <b>${money(amount)}</b></p>
         ${button(`${config.clientUrl}/orders`, "Track your order")}`
      ),
    }),

  sellerNewOrder: (seller, orderId, lines) =>
    sendEmail({
      to: seller.email,
      subject: `New order ${orderId} on Flagzen`,
      text: `You have a new order ${orderId}: ` + lines.map((l) => `${l.quantity} x ${l.productName}`).join(", "),
      html: layout(
        "You have a new order",
        `<p>Order <b>${escapeHtml(orderId)}</b></p>
         <ul>${lines.map((l) => `<li>${l.quantity} × ${escapeHtml(l.productName)}${l.designId ? " (custom design)" : ""}</li>`).join("")}</ul>
         ${button(`${config.clientUrl}/retailer/orders`, "Open your orders")}`
      ),
    }),

  orderStatusChanged: (user, line) =>
    sendEmail({
      to: user.email,
      subject: `Your order ${line.orderId} is ${line.status}`,
      text: `${line.productName} (order ${line.orderId}) is now ${line.status}.` +
        (line.trackingId ? ` Courier: ${line.courier || ""} Tracking ID: ${line.trackingId}` : ""),
      html: layout(
        `Order update: ${line.status}`,
        `<p>${escapeHtml(line.productName)} from order <b>${escapeHtml(line.orderId)}</b> is now <b>${escapeHtml(line.status)}</b>.</p>
         ${line.trackingId ? `<p>Courier: ${escapeHtml(line.courier || "-")}<br/>Tracking ID: <b>${escapeHtml(line.trackingId)}</b></p>` : ""}
         ${button(`${config.clientUrl}/orders`, "View your orders")}`
      ),
    }),
};

module.exports = { sendEmail, emails, sentEmails };
