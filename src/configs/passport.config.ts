import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { User, IUser } from "../apis/users/user.model";
import { ENV } from "./env.config";

export class PassportConfig {
  public static init(): void {
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    // Google Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const user = await PassportConfig.upsertUser(profile, "google");
              done(null, user);
            } catch (error) {
              done(error as Error, undefined);
            }
          }
        )
      );
    }

  }

  private static async upsertUser(profile: any, provider: "google"): Promise<IUser> {
    const email = profile.emails?.[0]?.value || `${profile.username}@${provider}.com`;
    const name = profile.displayName || profile.username || "User";

    let user = await User.findOne({ email });

    if (user) {
      // Link provider if not already linked
      if (user.provider !== provider) {
        user.provider = provider;
        user.providerId = profile.id;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        provider,
        providerId: profile.id,
      });
    }

    return user;
  }
}
