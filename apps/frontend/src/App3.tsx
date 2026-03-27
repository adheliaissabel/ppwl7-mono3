import { useEffect, useState } from "react"
import type { Course, CourseWorkWithSubmission, SubmissionAttachmentItem } from "shared"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDueDate(dueDate?: { year: number; month: number; day: number }) {
  if (!dueDate) return "Tidak ada deadline"
  // Gunakan template literal untuk keamanan parsing tanggal
  return new Date(dueDate.year, dueDate.month - 1, dueDate.day).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  })
}

function stateLabel(state?: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    TURNED_IN: { label: "Dikumpulkan", variant: "default" },
    RETURNED: { label: "Dinilai", variant: "secondary" },
    CREATED: { label: "Belum Dikumpulkan", variant: "destructive" },
    NEW: { label: "Belum Dimulai", variant: "outline" },
    RECLAIMED_BY_STUDENT: { label: "Ditarik Kembali", variant: "outline" },
  }
  return map[state ?? ""] ?? { label: state ?? "–", variant: "outline" }
}

// ─────────────────────────────────────────────
// Sub-komponen: satu kartu tugas
// ─────────────────────────────────────────────

function AttachmentLink({ att }: { att: SubmissionAttachmentItem }) {
  if (att.driveFile) {
    return (
      <a href={att.driveFile.alternateLink} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline text-sm truncate">
        📄 {att.driveFile.title}
      </a>
    )
  }
  if (att.link) {
    return (
      <a href={att.link.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline text-sm truncate">
        🔗 {att.link.title || att.link.url}
      </a>
    )
  }
  if (att.youtubeVideo) {
    return (
      <a href={att.youtubeVideo.alternateLink} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-red-600 hover:underline text-sm truncate">
        ▶ {att.youtubeVideo.title}
      </a>
    )
  }
  if (att.form) {
    return (
      <a href={att.form.responseUrl || att.form.formUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-green-600 hover:underline text-sm truncate">
        📝 {att.form.title}
      </a>
    )
  }
  return null
}

function CourseWorkCard({ item }: { item: CourseWorkWithSubmission }) {
  const { courseWork, submission } = item
  const { label, variant } = stateLabel(submission?.state)

  const attachments = submission?.assignmentSubmission?.attachments ?? []
  const score = submission?.assignedGrade ?? submission?.draftGrade

  return (
    // Perbaikan: Hapus w-150 agar responsif mengikuti grid
    <Card className="flex flex-col h-[400px] shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug break-words min-w-0 line-clamp-2">
            {courseWork.title}
          </CardTitle>
          <Badge variant={variant} className="shrink-0 whitespace-nowrap">
            {label}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          🗓 {formatDueDate(courseWork.dueDate)}
        </CardDescription>
      </CardHeader>

      <Separator className="shrink-0" />

      <ScrollArea className="flex-1">
        <CardContent className="flex flex-col gap-3 pt-3 pb-4">
          {courseWork.description && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deskripsi</p>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-4">
                {courseWork.description}
              </p>
            </div>
          )}

          {courseWork.materials && courseWork.materials.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lampiran Tugas</p>
              <div className="flex flex-col gap-1">
                {courseWork.materials.map((mat, i) => {
                  const att: SubmissionAttachmentItem = {
                    driveFile: mat.driveFile?.driveFile,
                    link: mat.link,
                    youtubeVideo: mat.youtubeVideo,
                    form: mat.form ? { formUrl: mat.form.formUrl, title: mat.form.title, responseUrl: "" } : undefined,
                  }
                  return <AttachmentLink key={i} att={att} />
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skor:</p>
            {score !== undefined ? (
              <span className="text-sm font-bold text-primary">
                {score} / {courseWork.maxPoints ?? "–"}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic">Belum dinilai</span>
            )}
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-col gap-1 pt-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Submisi Kamu</p>
              <div className="flex flex-col gap-1">
                {attachments.map((att, i) => <AttachmentLink key={i} att={att} />)}
              </div>
            </div>
          )}

          {submission?.late && (
            <Badge variant="destructive" className="w-fit text-[10px] py-0 px-2 mt-2">
              ⚠ Terlambat
            </Badge>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [items, setItems] = useState<CourseWorkWithSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Cek status login
  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false))
  }, [BACKEND_URL])

  // Load daftar courses setelah login
  useEffect(() => {
    if (!loggedIn) return
    fetch(`${BACKEND_URL}/classroom/courses`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCourses(d.data ?? []))
      .catch(() => setError("Gagal mengambil daftar kelas"))
  }, [loggedIn, BACKEND_URL])

  const loadSubmissions = async (courseId: string) => {
    setSelectedCourse(courseId)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/classroom/courses/${courseId}/submissions`, { credentials: "include" })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setItems(d.data ?? [])
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan saat memuat tugas")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    // Perbaikan: Jangan pakai localhost, gunakan VITE_BACKEND_URL
    window.location.href = `${BACKEND_URL}/auth/login`
  }

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { method: "POST", credentials: "include" })
    } finally {
      setLoggedIn(false)
      setCourses([])
      setItems([])
      setSelectedCourse(null)
    }
  }

  if (loggedIn === null) return <div className="flex h-screen items-center justify-center">Memuat...</div>

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Google Classroom Viewer</h1>
          <p className="text-muted-foreground">Kelola tugas kuliahmu dalam satu tampilan bersih</p>
        </div>
        <Button onClick={handleLogin} size="lg" className="px-8 shadow-lg">
          🎓 Login dengan Akun Kampus
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">📚 My Classroom</h1>
            <p className="text-sm text-muted-foreground">Pilih mata kuliah untuk melihat daftar tugas.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-fit">Logout</Button>
        </header>

        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <Button
                key={c.id}
                variant={selectedCourse === c.id ? "default" : "secondary"}
                size="sm"
                className="rounded-full"
                onClick={() => loadSubmissions(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </section>

        <Separator className="mb-8" />

        {error && (
          <div className="mb-6 p-4 border border-destructive/20 bg-destructive/5 text-destructive rounded-lg text-sm">
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[300px] rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <CourseWorkCard key={item.courseWork.id} item={item} />
            ))}
          </div>
        )}

        {!loading && selectedCourse && items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-white rounded-xl border border-dashed">
            Tidak ada tugas ditemukan di mata kuliah ini.
          </div>
        )}
      </div>
    </div>
  )
}