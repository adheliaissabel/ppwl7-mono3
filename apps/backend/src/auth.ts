import { google } from "googleapis";

// Function untuk membuat OAuth2 client
export function createOAuthClient() {
  // 🔍 DEBUG ENV (penting untuk cek error invalid_client)
  console.log("CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
  console.log("CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
  console.log("REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URL);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
  );
}

// Function untuk generate URL login Google
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