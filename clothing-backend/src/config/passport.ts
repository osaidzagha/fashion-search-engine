import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { UserModel as User } from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), undefined);

        // Find existing user or create one
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            password: "", // no password for OAuth users
            isVerified: true,
            authProvider: "google",
            googleId: profile.id,
          });
        } else if (!user.googleId) {
          // Existing email/password account — link the Google ID
          user.googleId = profile.id;
          user.authProvider = "google";
          user.isVerified = true;
          await user.save();
        }

        // Attach a signed JWT so the callback route can forward it to the frontend
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
          expiresIn: "7d",
        });

        return done(null, { ...user.toObject(), token });
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
