// src/utils/sendEmail.ts
import nodemailer from "nodemailer";
import { google } from "googleapis";

const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground",
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = accessTokenResponse.token;

  if (!accessToken) {
    throw new Error(
      "Failed to obtain Gmail access token. Check your OAuth2 credentials on Render.",
    );
  }

  // ✅ Force port 587 + TLS + IPv4 family to bypass Render's IPv6/port 465 block
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  } as nodemailer.TransportOptions);

  return transporter;
};

// ─── Verification Email ──────────────────────────────────────────────────────
export const sendVerificationEmail = async (
  userEmail: string,
  otp: string,
): Promise<void> => {
  const transporter = await createTransporter();

  const result = await transporter.sendMail({
    from: `"DOPE" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: "Verify your DOPE account",
    html: `
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

  console.log(
    `✅ [sendVerificationEmail] Sent to ${userEmail} — Message ID: ${result.messageId}`,
  );
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
  const transporter = await createTransporter();

  const fmt = (n: number) => n.toLocaleString("tr-TR");
  const drop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

  const result = await transporter.sendMail({
    from: `"DOPE" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: `↓ ${drop}% drop — ${productName} is now ${fmt(newPrice)} ${currency}`,
    html: `
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

  console.log(
    `✅ [sendPriceAlertEmail] Sent to ${userEmail} — Message ID: ${result.messageId}`,
  );
};
