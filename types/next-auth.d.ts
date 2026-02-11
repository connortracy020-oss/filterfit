import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      orgId: string;
      role: UserRole;
    };
  }

  interface User {
    orgId?: string;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId?: string;
    role?: UserRole;
  }
}
