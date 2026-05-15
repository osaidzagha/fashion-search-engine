import nodemailer from "nodemailer";

function createTransporter() {
  // ✅ Cast to 'any' allows us to use 'family: 4' which forces IPv4
  // and prevents Render's network from timing out on IPv6 lookups.
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4,
    greetingTimeout: 20000,
    connectionTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
      servername: "smtp.gmail.com",
    },
  } as any);
}

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
    console.log(`📧 OTP email delivered to ${userEmail}`);
  } catch (error) {
    console.error("Nodemailer failed:", error);
    throw new Error("SMTP Connection Error");
  }
};
