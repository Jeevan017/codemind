import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  Suspense,
  lazy,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Menu, X, Upload, Filter, GitBranch, Trash2 } from "lucide-react"
import axios from "axios"

import { Message, IngestState } from "./types"
import BottomSheet from "./components/BottomSheet"
import ChatArea from "./components/ChatArea"
import InputBar from "./components/InputBar"
import { SidebarSkeleton } from "./components/SkeletonLoader"

/* Lazy-load the heavy Sidebar */
const Sidebar = lazy(() => import("./components/Sidebar"))

const API = "http://127.0.0.1:8000"

let msgCounter = 0
const newId = () => `msg-${++msgCounter}-${Date.now()}`

/* ── Toast ───────────────────────────────────────────────── */
interface ToastProps {
  message: string
  type: "success" | "error"
  onDismiss: () => void
}
function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <motion.div
      className={`fixed bottom-28 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium shadow-2xl max-w-[320px] ${
        type === "success"
          ? "bg-success/10 border-success/30 text-success"
          : "bg-danger/10 border-danger/30 text-danger"
      }`}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      role="alert"
      aria-live="assertive"
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="opacity-60 hover:opacity-100 transition-opacity min-w-[24px] min-h-[24px] flex items-center justify-center"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ── Tablet Icon Rail ─────────────────────────────────────── */
interface IconRailProps {
  onExpand: () => void
  activeIcon: string | null
}
function IconRail({ onExpand, activeIcon }: IconRailProps) {
  const icons = [
    { id: "github", Icon: GitBranch, label: "GitHub" },
    { id: "local",  Icon: Upload, label: "Local Files" },
    { id: "filter", Icon: Filter, label: "Filters" },
  ]
  return (
    <div
      className="hidden md:flex lg:hidden flex-col items-center py-4 gap-2 w-[60px] flex-shrink-0 bg-surface border-r border-border"
      aria-label="Navigation rail"
    >
      {icons.map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={onExpand}
          aria-label={label}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-150 ${
            activeIcon === id
              ? "bg-accent/15 text-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-card"
          }`}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  )
}

/* ── Reset confirm button ─────────────────────────────────── */
interface ResetConfirmButtonProps {
  onConfirm: () => void
}
function ResetConfirmButton({ onConfirm }: ResetConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const openPopover = () => {
    setOpen(true)
    setTick(5)
    timerRef.current = setInterval(() => {
      setTick((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setOpen(false)
          return 5
        }
        return t - 1
      })
    }, 1000)
  }

  const cancel = () => {
    clearInterval(timerRef.current!)
    setOpen(false)
    setTick(5)
  }

  const confirm = () => {
    clearInterval(timerRef.current!)
    setOpen(false)
    setTick(5)
    onConfirm()
  }

  useEffect(() => () => clearInterval(timerRef.current!), [])

  return (
    <div className="relative">
      <button
        onClick={openPopover}
        aria-label="Reset index"
        className="flex items-center gap-2 px-3 h-10 rounded-lg border border-border bg-danger/5 text-danger hover:bg-danger/10 hover:border-danger/30 transition-colors text-[12px] font-medium"
        title="Reset index"
      >
        <Trash2 size={16} />
        <span>Reset index</span>
      </button>
      {open && (
        <motion.div
          className="absolute right-0 top-12 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-48"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <div className="p-3 border-b border-border">
            <p className="text-[12px] font-medium text-text-primary">Clear all indexed files?</p>
            <p className="text-[11px] text-text-secondary mt-1">This cannot be undone.</p>
          </div>
          <div className="flex gap-2 p-3">
            <button
              onClick={cancel}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-card transition-colors text-[12px] font-medium text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirm}
              className="flex-1 px-3 py-2 rounded-lg bg-danger/20 border border-danger/30 hover:bg-danger/30 transition-colors text-[12px] font-medium text-danger"
            >
              Clear ({tick}s)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ── App ──────────────────────────────────────────────────── */
export default function App() {
  /* ── State ── */
  const [messages,     setMessages]     = useState<Message[]>([])
  const [loading,      setLoading]      = useState(false)
  const [ingestState,  setIngestState]  = useState<IngestState>({
    status: "idle", progress: 0, message: "", indexedCount: 0,
  })
  const [language,     setLanguage]     = useState("")
  const [fileType,     setFileType]     = useState("")
  const [sheetOpen,    setSheetOpen]    = useState(false)   // mobile bottom sheet
  const [drawerOpen,   setDrawerOpen]   = useState(false)   // tablet drawer
  const [toast,        setToast]        = useState<{ message: string; type: "success" | "error" } | null>(null)

  /* ── Swipe-right gesture (mobile) ────────────────────────── */
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
      const startedNearEdge = touchStartX.current < 40
      if (dx > 50 && dy < 80 && startedNearEdge && !sheetOpen) {
        setSheetOpen(true)
      }
    },
    [sheetOpen]
  )

  /* ── Keyboard shortcuts ───────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetOpen(false)
        setDrawerOpen(false)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  /* ── Ask API ──────────────────────────────────────────────── */
  const handleAsk = useCallback(
    async (question: string) => {
      const userMsg: Message = {
        id: newId(), role: "user", content: question, timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const payload: Record<string, string> = { question }
        if (language) payload.language = language
        if (fileType)  payload.file_type = fileType

        const res = await axios.post(`${API}/ask`, payload)
        const assistantMsg: Message = {
          id:        newId(),
          role:      "assistant",
          content:   res.data.answer,
          sources:   res.data.sources,
          decision:  res.data.decision,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (e: any) {
        const detail = e.response?.data?.detail
        const errText =
          typeof detail === "string" ? detail : JSON.stringify(detail) || e.message
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: `Error: ${errText}`, timestamp: new Date() },
        ])
      } finally {
        setLoading(false)
      }
    },
    [language, fileType]
  )

  /* ── Reset API ────────────────────────────────────────────── */
  const handleReset = useCallback(async () => {
    try {
      await axios.delete(`${API}/reset`)
      setMessages([])
      setIngestState({ status: "idle", progress: 0, message: "", indexedCount: 0 })
      setToast({ message: "index reset done", type: "success" })
    } catch {
      setToast({ message: "Reset failed — is the backend running?", type: "error" })
    }
  }, [])

  /* ── Sidebar props (shared) ───────────────────────────────── */
  const sidebarProps = {
    ingestState,
    setIngestState,
    language,
    fileType,
    onLanguageChange: setLanguage,
    onFileTypeChange: setFileType,
    onReset:          handleReset,
  }

  return (
    <div
      className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* ══════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════ */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-5 py-3 bg-surface border-b border-border z-30">
        <div className="flex items-center gap-3">
          {/* Mobile FAB-style menu button */}
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sheetOpen}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            <Menu size={17} />
          </button>

          {/* Tablet drawer toggle */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Toggle sidebar"
            aria-expanded={drawerOpen}
            className="hidden md:flex lg:hidden items-center justify-center w-9 h-9 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            {drawerOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <Brain size={16} className="text-accent" />
            </div>
            <div className="leading-none">
              <p className="text-[15px] font-semibold text-text-primary tracking-tight">CodeMind</p>
              <p className="text-[10px] text-text-secondary mt-0.5 hidden sm:block">Universal Project Intelligence</p>
            </div>
          </div>
        </div>

        {/* Status pill + Reset button */}
        <div className="flex items-center gap-3">
          {ingestState.indexedCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {ingestState.indexedCount} files indexed
            </span>
          )}
          <ResetConfirmButton onConfirm={handleReset} />
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          MAIN BODY
      ══════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Desktop Sidebar (lg+) ── */}
        <aside
          className="hidden lg:flex flex-col w-sidebar flex-shrink-0 bg-surface border-r border-border overflow-hidden"
          aria-label="Sidebar"
        >
          <Suspense fallback={<SidebarSkeleton />}>
            <Sidebar {...sidebarProps} />
          </Suspense>
        </aside>

        {/* ── Tablet Icon Rail (md–lg) ── */}
        <IconRail onExpand={() => setDrawerOpen(true)} activeIcon={null} />

        {/* ── Tablet Slide-in Drawer (md–lg) ── */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                className="hidden md:block lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <motion.aside
                className="hidden md:flex lg:hidden flex-col fixed left-0 top-0 bottom-0 z-40 w-sidebar bg-surface border-r border-border overflow-hidden pt-[57px]"
                role="dialog"
                aria-modal="true"
                aria-label="Sidebar"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Suspense fallback={<SidebarSkeleton />}>
                  <Sidebar {...sidebarProps} />
                </Suspense>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Chat + Input (always visible) ── */}
        <main className="flex flex-col flex-1 min-w-0 overflow-hidden" aria-label="Chat area">
          <ChatArea messages={messages} loading={loading} />
          <InputBar onSend={handleAsk} loading={loading} />
        </main>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE BOTTOM SHEET
      ══════════════════════════════════════════════ */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar {...sidebarProps} isMobile />
        </Suspense>
      </BottomSheet>

      {/* ══════════════════════════════════════════════
          TOAST
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
