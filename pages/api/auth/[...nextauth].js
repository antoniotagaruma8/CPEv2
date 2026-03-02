// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Pwede magdagdag ng iba pang providers dito (e.g. GitHub, Facebook)
  ],
  secret: process.env.NEXTAUTH_SECRET, // Ito yung random string na ginawa mo sa .env.local
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
      }
      return session
    },
  },
}

export default NextAuth(authOptions)
