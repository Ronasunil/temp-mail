import jwt from "jsonwebtoken";
import { User, IUser } from "../users/user.model";
import { ENV } from "../../configs/env.config";

export class AuthService {
  public static async generateTokens(user: IUser) {
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      ENV.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Update user with new refresh token
    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  }

  public static async verifyRefreshToken(token: string): Promise<IUser | null> {
    try {
      const decoded = jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== token) {
        // Token reuse or invalid token detected
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  public static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: undefined });
  }
}
