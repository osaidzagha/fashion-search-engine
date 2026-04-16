import nodemailer from "nodemailer";

export const sendVerificationEmail = async (
  userEmail: string,
  verificationUrl: string,
) => {
  try {
    // 1. Create the Transporter (The Delivery Truck)
    const transporter = nodemailer.createTransport({
      service: "gmail", // Or whatever provider you use
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define the Email Content (The Letter)
    const mailOptions = {
      from: `"Fashion Engine" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: "Welcome to the VIP List - Verify Your Email",
      // We can use standard text, or write actual HTML to make it look high-end!
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Welcome to Fashion Engine</h2>
            <p>Please click the button below to verify your account.</p>
            <a href="${verificationUrl}" style="background-color: black; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Verify Account
            </a>
        </div>
      `,
    };

    // 3. Send the email!
    await transporter.sendMail(mailOptions);
    console.log("📧 Real email dispatched successfully to", userEmail);
  } catch (error) {
    console.error("Email Delivery Failed:", error);
    // If the email fails to send, we should probably know about it!
    throw new Error("Could not send verification email.");
  }
};
