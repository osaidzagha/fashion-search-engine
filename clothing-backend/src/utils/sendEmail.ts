import nodemailer from "nodemailer";

// ─── Shared transporter factory ───────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ─── Verification email (Updated for OTP) ────────────────────────────────────
export const sendVerificationEmail = async (userEmail: string, otp: string) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Verify your DOPE account",
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
          <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 28px; letter-spacing: 0.1em; margin: 0 0 24px; text-transform: uppercase;">DOPE</h1>
          <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 32px;">
            Welcome. Please enter the verification code below to activate your account.
          </p>
          <div style="background: #f5f5f5; border: 1px solid #e8e4dc; padding: 24px; text-align: center; margin-bottom: 32px;">
            <p style="font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #a0a0a0; margin: 0 0 12px;">Your Verification Code</p>
            <p style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 600; letter-spacing: 0.2em; color: #1a1a1a; margin: 0;">
              ${otp}
            </p>
          </div>
          <p style="font-size: 11px; color: #bbb; margin-top: 40px;">
            This code expires in 15 minutes. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 OTP Verification email sent to", userEmail);
  } catch (error) {
    console.error("Verification email failed:", error);
    throw new Error("Could not send verification email.");
  }
};

// ─── Price alert email ────────────────────────────────────────────────────────
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

    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    const saving = (oldPrice - newPrice).toLocaleString("tr-TR");
    const formattedNew = newPrice.toLocaleString("tr-TR");
    const formattedOld = oldPrice.toLocaleString("tr-TR");

    const mailOptions = {
      from: `"DOPE" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Price drop: ${productName} is now ${formattedNew} ${currency}`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; background: #faf9f6;">
          <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 28px; letter-spacing: 0.1em; margin: 0 0 8px; text-transform: uppercase;">DOPE</h1>
          <p style="font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #aaa; margin: 0 0 40px;">Price Alert</p>

          <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 8px;">
            A product you're tracking just dropped in price.
          </p>

          <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 22px; color: #1a1a1a; margin: 0 0 24px; line-height: 1.3;">
            ${productName}
          </h2>

          <div style="background: #fff; border: 1px solid #e8e4dc; padding: 24px; margin-bottom: 32px;">
            <div style="display: flex; align-items: baseline; gap: 16px; margin-bottom: 8px;">
              <span style="font-size: 26px; font-family: 'Cormorant Garamond', Georgia, serif; color: #b94040;">${formattedNew} ${currency}</span>
              <span style="font-size: 16px; font-family: 'Cormorant Garamond', Georgia, serif; color: #bbb; text-decoration: line-through;">${formattedOld} ${currency}</span>
            </div>
            <p style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #1a1a1a; margin: 0;">
              −${discount}% · You save ${saving} ${currency}
            </p>
          </div>

          <a href="${productLink}"
            style="display: inline-block; background: #1a1a1a; color: #fff; padding: 14px 32px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; text-decoration: none; margin-bottom: 40px;">
            View product →
          </a>

          <p style="font-size: 11px; color: #bbb; border-top: 1px solid #e8e4dc; padding-top: 24px;">
            You're receiving this because you added this item to your DOPE watchlist.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Price alert sent to ${userEmail} for "${productName}"`);
  } catch (error) {
    console.error("Price alert email failed:", error);
    // Don't throw — a failed alert email should not crash anything
  }
};
