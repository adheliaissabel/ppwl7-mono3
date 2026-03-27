import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { cookie } from "@elysiajs/cookie";
import { prisma } from "../prisma/db";
import { createOAuthClient, getAuthUrl } from "./auth";
import { getCourses, getCourseWorks, getSubmissions } from "./classroom";
import type { ApiResponse, HealthCheck } from "shared";
import fs from "fs";
import path from "path";

// ✅ Fungsi pendeteksi request dari browser langsung (tanpa fetch)
const isBrowserRequest = (request: Request): boolean => {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const accept = request.headers.get("accept") ?? "";

  const acceptsHtml = accept.includes("text/html");
  return acceptsHtml && !origin && !referer;
};

// Simple in-memory token store
const tokenStore = new Map<string, { access_token: string; refresh_token?: string }>();

const app = new Elysia()
  // ✅ CORS Dinamis: Mengizinkan Frontend Utama & Semua URL Preview Vercel
  .use(cors({
    origin: (request) => {
      const origin = request.headers.get("origin");
      const frontendUrl = process.env.FRONTEND_URL;
      
      // Izinkan jika origin cocok dengan env atau berasal dari domain vercel.app
      if (!origin || origin === frontendUrl || origin.endsWith(".vercel.app")) {
        return true;
      }
      return false;
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }))

  // ✅ Middleware Proteksi /users
  .onRequest(({ request, set }) => {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/users")) {
      const origin = request.headers.get("origin");
      const frontendUrl = process.env.FRONTEND_URL ?? "";

      // 1. Izinkan jika request datang dari Frontend (via Fetch)
      if (origin && (origin === frontendUrl || origin.endsWith(".vercel.app"))) return;

      // 2. Jika diakses langsung via Browser (URL Bar), cek API_KEY
      if (isBrowserRequest(request)) {
        const key = url.searchParams.get("key");

        if (!key || key !== process.env.API_KEY) {
          set.status = 401;
          return { message: "Unauthorized: missing or invalid key" };
        }
      }
    }
  })

  .use(swagger())
  .use(cookie())

  // Health check
  .get("/", (): ApiResponse<HealthCheck> => ({
    data: { status: "ok" },
    message: "server running",
  }))

  // Users List
  .get("/users", async () => {
    const users = await prisma.user.findMany();
    return {
      data: users,
      message: "User list retrieved",
    };
  })

  // --- AUTH ENTRIES ---

  .get("/auth/login", ({ redirect }) => {
    const oauth2Client = createOAuthClient();
    const url = getAuthUrl(oauth2Client);
    return redirect(url);
  })

  .get("/auth/callback", async ({ query, set, cookie: { session }, redirect }) => {
    const { code } = query as { code: string };

    if (!code) {
      set.status = 400;
      return { error: "Missing authorization code" };
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    const sessionId = crypto.randomUUID();
    tokenStore.set(sessionId, {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
    });

    // ✅ PERBAIKAN: Konfigurasi Cookie untuk Vercel (Cross-Origin)
    if (session) {
        session.value = sessionId;
        session.maxAge = 60 * 60 * 24;
        session.path = "/";
        session.sameSite = "none"; // Wajib untuk beda domain (Frontend Vercel ke Backend Vercel)
        session.secure = true;     // Wajib karena Vercel menggunakan HTTPS
        session.httpOnly = true;   // Keamanan tambahan agar tidak bisa dibaca JS Frontend
    }

    // ✅ Redirect kembali ke halaman Classroom di Frontend
    return redirect(`${process.env.FRONTEND_URL}/classroom`);
  })

  .get("/auth/me", ({ cookie: { session } }) => {
    const sessionId = session?.value as string;
    if (!sessionId || !tokenStore.has(sessionId)) {
      return { loggedIn: false };
    }
    return { loggedIn: true, sessionId };
  })

  .post("/auth/logout", ({ cookie: { session } }) => {
    if (!session) return { success: false };

    const sessionId = session.value as string;
    if (sessionId) {
      tokenStore.delete(sessionId);
      session.remove();
    }
    return { success: true };
  })

  // --- GOOGLE CLASSROOM API ---

  .get("/classroom/courses", async ({ cookie: { session }, set }) => {
    const sessionId = session?.value as string;
    const tokens = sessionId ? tokenStore.get(sessionId) : null;

    if (!tokens) {
      set.status = 401;
      return { error: "Unauthorized. Silakan login terlebih dahulu." };
    }

    const courses = await getCourses(tokens.access_token);
    return { data: courses, message: "Courses retrieved" };
  })

  .get("/classroom/courses/:courseId/submissions", async ({ params, cookie: { session }, set }) => {
    const sessionId = session?.value as string;
    const tokens = sessionId ? tokenStore.get(sessionId) : null;

    if (!tokens) {
      set.status = 401;
      return { error: "Unauthorized. Silakan login terlebih dahulu." };
    }

    const { courseId } = params;

    const [courseWorks, submissions] = await Promise.all([
      getCourseWorks(tokens.access_token, courseId),
      getSubmissions(tokens.access_token, courseId),
    ]);

    const submissionMap = new Map(submissions.map((s) => [s.courseWorkId, s]));

    const result = courseWorks.map((cw) => ({
      courseWork: cw,
      submission: submissionMap.get(cw.id) ?? null,
    }));

    return { data: result, message: "Course submissions retrieved" };
  })

  // ✅ DEBUG PRISMA UNTUK VERCEL
  .get("/debug-prisma", () => {
    const generatedPath = path.resolve(__dirname, "../src/generated/prisma/client");
    const exists = fs.existsSync(generatedPath);

    return {
      path: generatedPath,
      exists,
      files: exists ? fs.readdirSync(generatedPath) : []
    };
  });

// ✅ Jalankan Server (Local Only)
if (process.env.NODE_ENV !== "production") {
  app.listen(3000);
  console.log(`🦊 Backend Running → http://localhost:3000`);
}

// ✅ Export untuk Vercel
export default app;
export type App = typeof app;