import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { UserModel as User } from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
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

        // Use 'as unknown' first to bypass the Mongoose method strictness
        return done(null, {
          ...user.toObject(),
          token,
        } as unknown as Express.User);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
