import type { PlatformRole } from "@/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      platformRole?: PlatformRole | null;
    };
  }

  interface User {
    platformRole?: PlatformRole | null;
  }
}
