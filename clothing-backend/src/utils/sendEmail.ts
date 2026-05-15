// src/utils/sendEmail.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Verification Email ──────────────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail: string, otp: string) => {
  try {
    const response = await resend.emails.send({
      from: "DOPE <onboarding@resend.dev>",
      to: userEmail,
      subject: "Verify your DOPE account",

      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">
            DOPE
          </h1>

          <p>Your verification code is:</p>

          <div style="
            background: #eee;
            padding: 20px;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 5px;
          ">
            ${otp}
          </div>

          <p style="font-size: 10px; color: #888; margin-top: 20px;">
            Expires in 15 minutes.
          </p>
        </div>
      `,
    });

    console.log("Verification email sent:", response);
  } catch (error) {
    console.error("Resend Error:", error);
    throw new Error("Could not send verification email.");
  }
};

// ─── Price Alert Email ───────────────────────────────────────────────────────
export const sendPriceAlertEmail = async (
  userEmail: string,
  productName: string,
  productLink: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
) => {
  try {
    const formattedNew = newPrice.toLocaleString("tr-TR");

    const response = await resend.emails.send({
      from: "DOPE <onboarding@resend.dev>",
      to: userEmail,
      subject: `Price drop: ${productName} is now ${formattedNew} ${currency}`,

      html: `
        <div style="font-family: sans-serif;">
          <h1>Price Alert</h1>

          <p>
            ${productName} is now
            <strong>${formattedNew} ${currency}</strong>
          </p>

          <a href="${productLink}">
            View Product
          </a>
        </div>
      `,
    });

    console.log("Price alert sent:", response);
  } catch (error) {
    console.error("Price alert failed:", error);
  }
};
