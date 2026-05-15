import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail", // ✅ Let Nodemailer handle host/port/family logic
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Prevent hanging on slow connections
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  } as any);
}

// ─── 1. Verification Email ───────────────────────────────────────────────────
export const sendVerificationEmail = async (userEmail: string, otp: string) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Verify your DOPE account",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h1 style="text-transform: uppercase; letter-spacing: 2px;">DOPE</h1>
          <p>Your verification code is:</p>
          <div style="background: #eee; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="font-size: 10px; color: #888; margin-top: 20px;">Expires in 15 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error("Could not connect to email server.");
  }
};

// ─── 2. Price Alert Email (RESTORING THIS FOR THE WORKER) ─────────────────────
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

    const mailOptions = {
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Price drop: ${productName} is now ${formattedNew} ${currency}`,
      html: `<h1>Price Alert</h1><p>${productName} is now ${formattedNew} ${currency}</p><a href="${productLink}">View Product</a>`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Price alert failed:", error);
  }
};
