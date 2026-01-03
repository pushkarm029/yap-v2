import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { db } from './lib/database';
import { authLogger } from './lib/logger';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'twitter') {
        authLogger.debug(
          {
            userId: user.id,
            userUsername: user.username,
            accountProvider: account.provider,
            accountProviderAccountId: account.providerAccountId,
            accountType: account.type,
          },
          'SignIn callback - examining user and account objects'
        );

        if (!account.providerAccountId) {
          authLogger.error({ user, account }, 'No providerAccountId found in account object');
          return false;
        }

        // Check if user already exists
        const existingUser = await db.findUserById(account.providerAccountId);

        if (existingUser) {
          // Existing user - allow signin
          authLogger.info({ userId: existingUser.id }, 'Existing user signing in');

          const userData = {
            id: account.providerAccountId,
            name: user.name || '',
            image: user.image || '',
            username: user.username || null,
          };

          await db.upsertUser(userData);
          return true;
        }

        // New user - create account (invite will be required later for actions)
        const userData = {
          id: account.providerAccountId,
          name: user.name || '',
          image: user.image || '',
          username: user.username || null,
        };

        try {
          // Create user WITHOUT invite link (invited_by_user_id will be null)
          await db.upsertUser(userData);

          authLogger.info(
            {
              userId: account.providerAccountId,
            },
            'New user created - invite code required for actions'
          );

          return true;
        } catch (error) {
          authLogger.error({ error, userData }, 'Failed to create user');
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // On initial sign-in, populate token with user data
      if (account?.provider === 'twitter' && account.providerAccountId) {
        const dbUser = await db.findUserById(account.providerAccountId);
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          authLogger.debug(
            {
              tokenId: token.id,
              username: token.username,
            },
            'JWT token populated from database'
          );
        } else {
          authLogger.warn(
            { providerAccountId: account.providerAccountId },
            'User not found in database during JWT callback'
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // Always fetch fresh invitedBy status from database
        // This ensures dynamic data like invite redemption is immediately reflected
        const dbUser = await db.findUserById(token.id as string);

        session.user.id = token.id as string;
        session.user.username = token.username as string | null;
        session.user.invitedBy = dbUser?.invited_by_user_id || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirect errors to login page instead of default error page
  },
});

declare module 'next-auth' {
  interface User {
    username?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      invitedBy?: string | null;
    };
  }
}
