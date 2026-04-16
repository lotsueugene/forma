import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { getDefaultWorkspace, createPersonalWorkspace } from './workspace-auth';
import { auditLog, securityLog } from './audit';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          securityLog({ action: 'auth.login_failed', details: { email: credentials.email, reason: 'user_not_found' } });
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          securityLog({ action: 'auth.login_failed', userId: user.id, details: { reason: 'wrong_password' } });
          throw new Error('Invalid credentials');
        }

        auditLog({ action: 'auth.login_success', userId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
  },
  events: {
    // Create workspace for OAuth users (credentials users get it in /api/auth/register)
    async createUser({ user }) {
      if (user.id && user.email) {
        await createPersonalWorkspace(user.id, user.name || undefined, user.email);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.image = user.image;
        // Get user's default workspace on login
        const workspace = await getDefaultWorkspace(user.id);
        token.workspaceId = workspace?.id;
      }

      // Allow updating workspaceId through session update
      if (trigger === 'update' && token.id) {
        const workspace = await getDefaultWorkspace(token.id as string);
        token.workspaceId = workspace?.id;
        // Refresh image from database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true },
        });
        if (dbUser) {
          token.image = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string | undefined;
        session.user.image = token.image as string | undefined;
      }
      return session;
    },
  },
};
