// src/utils/sendEmail.ts

import nodemailer from "nodemailer";
import dns from "node:dns";

// Force IPv4 first globally
dns.setDefaultResultOrder("ipv4first");

function createTransporter() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS on port 587
    requireTLS: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    // VERY IMPORTANT FOR RENDER
    family: 4,

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,

    tls: {
      rejectUnauthorized: false,
      family: 4,
      servername: "smtp.gmail.com",
    },
  } as any);

  return transporter;
}

// ─── Verification Email ──────────────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail: string, otp: string) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Verify your DOPE account",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">DOPE</h1>

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

    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error("Could not connect to email server.");
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
    const transporter = createTransporter();

    const formattedNew = newPrice.toLocaleString("tr-TR");

    await transporter.sendMail({
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Price drop: ${productName} is now ${formattedNew} ${currency}`,
      html: `
        <h1>Price Alert</h1>

        <p>
          ${productName} is now
          <strong>${formattedNew} ${currency}</strong>
        </p>

        <a href="${productLink}">
          View Product
        </a>
      `,
    });

    console.log("Price alert email sent");
  } catch (error) {
    console.error("Price alert failed:", error);
  }
};
