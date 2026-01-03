import type { NextAuthConfig } from 'next-auth';
import Twitter from 'next-auth/providers/twitter';
import { authLogger } from './lib/logger';

export default {
  providers: [
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
      profile(profile) {
        authLogger.debug(
          {
            profileData: profile.data,
            profileId: profile.data?.id,
            profileUsername: profile.data?.username,
          },
          'Twitter profile received'
        );

        return {
          id: profile.data.id,
          name: profile.data.name,
          // TODO: Add email support when privacy policy & terms of service URLs are provided
          // Twitter OAuth 2.0 requires these URLs to request email from users
          image: profile.data.profile_image_url,
          username: profile.data.username,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
