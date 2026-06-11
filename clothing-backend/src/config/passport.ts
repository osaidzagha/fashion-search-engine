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
          // Brand-new user — create a Google account
          user = await User.create({
            name: profile.displayName,
            email,
            password: "", // no password for OAuth users
            isVerified: true,
            authProvider: "google",
            googleId: profile.id,
          });
        } else if (user.authProvider === "local") {
          // Existing email/password account — do NOT silently hijack it.
          // Redirect to the frontend with a clear error so the user is informed.
          return done(null, { __error: "account_exists" } as any);
        } else if (!user.googleId) {
          // Google user without a googleId stored yet — backfill it
          user.googleId = profile.id;
          await user.save();
        }

        // Attach a signed JWT — include role so auth middleware works correctly
        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET!,
          { expiresIn: "7d" },
        );

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
