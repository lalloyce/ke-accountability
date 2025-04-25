import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await dbConnect();

        // Find user by email
        const user = await User.findOne({ email: credentials.email }).select('+password');

        if (!user) {
          throw new Error('No user found with this email');
        }

        // Check password
        const isPasswordValid = await user.comparePassword(credentials.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        // Return user without password
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-for-development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
