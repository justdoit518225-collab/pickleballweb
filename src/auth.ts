import { AuthError } from "next-auth";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Provider } from "next-auth/providers";
import { linkLineFromProvider } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@/generated/prisma/client";

/** LINE Login OAuth 2.1（需於 LINE Developers 建立 Channel） */
function LineProvider(): Provider {
  return {
    id: "line",
    name: "LINE",
    type: "oauth",
    clientId: process.env.LINE_CLIENT_ID,
    clientSecret: process.env.LINE_CLIENT_SECRET,
    authorization: {
      url: "https://access.line.me/oauth2/v2.1/authorize",
      params: {
        // 未申請 email 權限時勿要求 email，避免 LINE 授權失敗
        scope: "profile openid",
        response_type: "code",
      },
    },
    token: "https://api.line.me/oauth2/v2.1/token",
    userinfo: {
      url: "https://api.line.me/oauth2/v2.1/userinfo",
      async request(context: { tokens: { access_token?: string } }) {
        const accessToken = context.tokens.access_token;
        if (!accessToken) {
          throw new Error("LINE access_token missing");
        }
        const headers = { Authorization: `Bearer ${accessToken}` };

        const oidcRes = await fetch("https://api.line.me/oauth2/v2.1/userinfo", { headers });
        if (oidcRes.ok) {
          const profile = (await oidcRes.json()) as {
            sub: string;
            name?: string;
            picture?: string;
            email?: string;
          };
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          };
        }

        const profileRes = await fetch("https://api.line.me/v2/profile", { headers });
        if (!profileRes.ok) {
          throw new Error(`LINE profile failed: ${profileRes.status}`);
        }
        const profile = (await profileRes.json()) as {
          userId: string;
          displayName: string;
          pictureUrl?: string;
        };
        return {
          id: profile.userId,
          name: profile.displayName,
          image: profile.pictureUrl,
        };
      },
    },
    profile(profile) {
      return {
        id: profile.id as string,
        name: profile.name as string,
        email: profile.email as string | undefined,
        image: profile.image as string | undefined,
      };
    },
  };
}

const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // 同一 Neon 若曾用開發信箱登入，允許以相同 email 連結 Google
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
  providers.push(LineProvider());
}

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  allowDangerousEmailAccountLinking: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.platformRole = user.platformRole as PlatformRole | null;
      }
      return session;
    },
  },
  session: {
    strategy: "database",
  },
  events: {
    async signIn({ user, account }) {
      const userId = user.id;
      if (!userId) return;

      if (account?.provider === "line" && account.providerAccountId) {
        try {
          await linkLineFromProvider(userId, account.providerAccountId);
        } catch (err) {
          console.error("[auth] linkLineFromProvider failed", err);
        }
      }

      // 同步 OAuth 顯示名稱與頭像至 User（LINE pictureUrl、Google 頭像等）
      if (
        account?.provider === "line" ||
        account?.provider === "google"
      ) {
        const data: { name?: string; image?: string } = {};
        if (user.name?.trim()) data.name = user.name.trim();
        if (user.image?.trim()) data.image = user.image.trim();
        if (Object.keys(data).length > 0) {
          await prisma.user.update({ where: { id: userId }, data });
        }
      }
    },
  },
  trustHost: true,
  logger: {
    error(error) {
      if (error instanceof AuthError && error.type === "JWTSessionError") {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[auth] 登入 cookie 已失效（例如 AUTH_SECRET 變更），請重新登入",
          );
        }
        return;
      }
      console.error(error);
    },
    warn(code) {
      console.warn(`[auth][warn] ${code}`);
    },
    debug(message, metadata) {
      if (process.env.AUTH_DEBUG === "true") {
        console.debug(`[auth][debug] ${message}`, metadata ?? "");
      }
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

/** 無效或過期 JWT cookie（例如 AUTH_SECRET 變更後）視為未登入，避免整頁 500 */
export async function auth() {
  try {
    return await nextAuth.auth();
  } catch (error) {
    if (error instanceof AuthError && error.type === "JWTSessionError") {
      return null;
    }
    throw error;
  }
}
