// src/utils/sendEmail.ts
import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY as string,
});

const SENDER_EMAIL = process.env.GMAIL_USER as string;
const SENDER_NAME = "DOPE";

// ─── Verification Email ──────────────────────────────────────────────────────
export const sendVerificationEmail = async (
  userEmail: string,
  otp: string,
): Promise<void> => {
  const response = await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: userEmail }],
    subject: "Verify your DOPE account",
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f5f5f5; border-radius: 8px;">
        <h1 style="font-size: 28px; letter-spacing: 8px; text-transform: uppercase; margin: 0 0 24px; color: #ffffff;">
          DOPE
        </h1>
        <p style="color: #aaa; margin: 0 0 16px;">
          Use the code below to verify your account. It expires in
          <strong style="color:#f5f5f5;">15 minutes</strong>.
        </p>
        <div style="
          background: #1a1a1a;
          border: 1px solid #333;
          padding: 24px;
          text-align: center;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 10px;
          color: #ffffff;
          border-radius: 4px;
          margin: 24px 0;
        ">
          ${otp}
        </div>
        <p style="font-size: 11px; color: #555; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`✅ [sendVerificationEmail] Sent to ${userEmail}`, response);
};

// ─── Price Alert Email ───────────────────────────────────────────────────────
export const sendPriceAlertEmail = async (
  userEmail: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
): Promise<void> => {
  const fmt = (n: number) => n.toLocaleString("tr-TR");
  const drop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

  const response = await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: userEmail }],
    subject: `↓ ${drop}% drop — ${productName} is now ${fmt(newPrice)} ${currency}`,
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f5f5f5; border-radius: 8px;">
        <h1 style="font-size: 24px; letter-spacing: 8px; text-transform: uppercase; margin: 0 0 24px; color: #ffffff;">
          DOPE
        </h1>
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin: 0 0 8px;">Price Alert</p>
        <h2 style="font-size: 20px; margin: 0 0 24px; color: #ffffff;">${productName}</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td width="48%" style="background: #1a1a1a; border: 1px solid #333; padding: 16px; border-radius: 4px; text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Was</div>
              <div style="font-size: 20px; color: #666; text-decoration: line-through;">${fmt(oldPrice)} ${currency}</div>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background: #1a1a1a; border: 1px solid #ffffff33; padding: 16px; border-radius: 4px; text-align: center;">
              <div style="font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Now</div>
              <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${fmt(newPrice)} ${currency}</div>
            </td>
          </tr>
        </table>
        <div style="background: #ffffff; padding: 10px; border-radius: 4px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 13px; font-weight: 700; color: #0a0a0a; letter-spacing: 2px;">↓ ${drop}% PRICE DROP</span>
        </div>
        <a href="${productLink}" style="
          display: block; background: #ffffff; color: #0a0a0a;
          text-decoration: none; text-align: center; padding: 14px;
          font-weight: 700; font-size: 13px; letter-spacing: 3px;
          text-transform: uppercase; border-radius: 4px;
        ">VIEW PRODUCT →</a>
        <p style="font-size: 11px; color: #444; margin-top: 24px;">
          You're receiving this because you added this item to your DOPE watchlist.
        </p>
      </div>
    `,
  });

  console.log(`✅ [sendPriceAlertEmail] Sent to ${userEmail}`, response);
};

// ─── Weekly Deal Digest ───────────────────────────────────────────────────────
export const sendWeeklyDigestEmail = async (
  userEmail: string,
  deals: Array<{
    name: string;
    brand: string;
    link: string;
    price: number;
    originalPrice: number;
    currency: string;
  }>,
): Promise<void> => {
  const fmt = (n: number) => n.toLocaleString("tr-TR");

  const dealRows = deals
    .map((d) => {
      const drop = Math.round(((d.originalPrice - d.price) / d.originalPrice) * 100);
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #1a1a1a;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="65%">
                <p style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px;">${d.brand}</p>
                <p style="font-size: 14px; color: #f5f5f5; margin: 0 0 6px;">${d.name}</p>
                <p style="margin: 0;">
                  <span style="font-size: 17px; font-weight: 700; color: #fff;">${fmt(d.price)} ${d.currency}</span>
                  <span style="font-size: 11px; color: #555; text-decoration: line-through; margin-left: 8px;">${fmt(d.originalPrice)}</span>
                </p>
              </td>
              <td width="35%" style="text-align: right; vertical-align: middle;">
                <span style="background:#fff; color:#0a0a0a; font-size:10px; font-weight:700; letter-spacing:2px; padding:5px 10px;">&darr; ${drop}%</span><br/><br/>
                <a href="${d.link}" style="font-size:10px; color:#666; text-decoration:none; letter-spacing:2px; text-transform:uppercase;">View &rarr;</a>
              </td>
            </tr></table>
          </td>
        </tr>`;
    })
    .join("");

  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: userEmail }],
    subject: `Your weekly digest — ${deals.length} drops worth knowing`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f5f5f5;">
        <h1 style="font-size:22px;letter-spacing:8px;text-transform:uppercase;margin:0 0 6px;color:#fff;">DOPE</h1>
        <p style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:3px;margin:0 0 28px;">Weekly Price Digest</p>
        <h2 style="font-size:17px;font-weight:300;color:#f5f5f5;margin:0 0 20px;">Best drops this week.</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${dealRows}</table>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1a1a1a;">
          <a href="https://dopewear.app/collection/sale" style="display:inline-block;background:#fff;color:#0a0a0a;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:11px 22px;">SEE ALL DEALS &rarr;</a>
        </div>
        <p style="font-size:10px;color:#333;margin-top:20px;">You're receiving this because you have a Dope account. Sent weekly.</p>
      </div>`,
  });

  console.log(`✅ [sendWeeklyDigestEmail] Sent to ${userEmail}`);
};
