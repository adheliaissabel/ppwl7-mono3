import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import App2 from "./App2"
import App3 from "./App3" 
import { Button } from "@/components/ui/button"

function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-screen">
      <h1 className="text-3xl font-bold">Monorepo Phase 4</h1>
      <div className="flex gap-4">
        <Link to="/users">
          <Button variant="default">Lihat User List (App2)</Button>
        </Link>
        <Link to="/classroom">
          <Button variant="secondary">Lihat Classroom (App3)</Button>
        </Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        {/* Navigasi Sederhana (Opsional) */}
        <nav className="p-4 border-b flex gap-4 justify-center bg-white">
          <Link to="/" className="text-blue-500 hover:underline">Home</Link>
          <Link to="/users" className="text-blue-500 hover:underline">Users</Link>
          <Link to="/classroom" className="text-blue-500 hover:underline">Classroom</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/users" element={<App2 />} />
          <Route path="/classroom" element={<App3 />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App