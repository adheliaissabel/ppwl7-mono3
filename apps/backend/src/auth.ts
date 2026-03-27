import { google } from "googleapis";

export function createOAuthClient() {
  // Ambil ID dan Secret dari Env
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const redirectUri = "https://monorepo-be-eosin.vercel.app/auth/callback";

  console.log("DEBUG: Menggunakan Redirect URI ->", redirectUri);

  if (!clientId || !clientSecret) {
    throw new Error("Google Client ID atau Secret tidak ditemukan di Environment Variables!");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(oauth2Client: InstanceType<typeof google.auth.OAuth2>) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
      "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"
    ],
    prompt: "consent",
  });
}