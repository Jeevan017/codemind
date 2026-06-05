import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  GitBranch,
  Upload,
  Filter,
  ChevronDown,
  Check,
  FileCode,
  AlertCircle,
  RotateCcw,
  Files,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import axios from "axios"
import { IngestState } from "../types"
import { FilterSkeleton } from "./SkeletonLoader"

const API = "https://jeevan017-codemind-backend.hf.space"

/* ── Detect touch device ─────────────────────────────────── */
const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: none)").matches

/* ── Props ───────────────────────────────────────────────── */
interface SidebarProps {
  ingestState: IngestState
  setIngestState: React.Dispatch<React.SetStateAction<IngestState>>
  language: string
  fileType: string
  onLanguageChange: (v: string) => void
  onFileTypeChange: (v: string) => void
  onReset: () => void
  isMobile?: boolean
}

/* ── Progress bar sub-component ──────────────────────────── */
function ProgressBar({ progress, status }: { progress: number; status: string }) {
  const color =
    status === "success" ? "bg-success" : status === "error" ? "bg-danger" : "bg-accent"
  return (
    <div className="h-0.5 w-full bg-border rounded-full overflow-hidden mt-2">
      <div
        className={`h-full ${color} progress-fill`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

/* ── Filter section (lazy-loaded feel) ───────────────────── */
function FiltersSection({
  language,
  fileType,
  onLanguageChange,
  onFileTypeChange,
}: {
  language: string
  fileType: string
  onLanguageChange: (v: string) => void
  onFileTypeChange: (v: string) => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 350)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filters-panel"
        className="flex items-center justify-between w-full text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1 hover:text-text-primary transition-colors min-h-[44px] px-1"
      >
        <span className="flex items-center gap-2">
          <Filter size={12} />
          Filters
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="filters-panel"
            key="filters"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {!loaded ? (
              <FilterSkeleton />
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    aria-label="Filter by language"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent transition-colors appearance-none cursor-pointer min-h-[44px]"
                  >
                    <option value="">All languages</option>
                    <option value="Python">Python</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Java">Java</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                    <option value="C++">C++</option>
                    <option value="C#">C#</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1.5 font-medium uppercase tracking-wider">
                    File Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => onFileTypeChange(e.target.value)}
                    aria-label="Filter by file type"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent transition-colors appearance-none cursor-pointer min-h-[44px]"
                  >
                    <option value="">All file types</option>
                    <option value="code">Code</option>
                    <option value="document">Document</option>
                    <option value="image">Image</option>
                  </select>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main Sidebar ─────────────────────────────────────────── */
export default function Sidebar({
  ingestState,
  setIngestState,
  language,
  fileType,
  onLanguageChange,
  onFileTypeChange,
  onReset,
  isMobile = false,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"github" | "local">("github")
  const [githubUrl, setGithubUrl] = useState("")
  const [droppedFiles, setDroppedFiles] = useState<{ name: string; size: number }[]>([])
  const [btnShake, setBtnShake] = useState(false)
  const [btnSuccess, setBtnSuccess] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const isTouch = isTouchDevice()

  const simulateProgress = useCallback(() => {
    progressIntervalRef.current = setInterval(() => {
      setIngestState((prev) => {
        if (prev.progress >= 88) return prev
        return { ...prev, progress: prev.progress + Math.random() * 4 + 1 }
      })
    }, 300)
  }, [setIngestState])

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  const handleGithubIngest = async () => {
    if (!githubUrl.trim() || ingestState.status === "indexing") return
    setIngestState({ status: "indexing", progress: 0, message: "Cloning…", indexedCount: ingestState.indexedCount })
    simulateProgress()
    try {
      const res = await axios.post(`${API}/ingest/github`, { github_url: githubUrl })
      stopProgress()
      setBtnSuccess(true)
      setIngestState({
        status: "success",
        progress: 100,
        message: `${res.data.files_processed} files · ${res.data.chunks_indexed} chunks`,
        indexedCount: ingestState.indexedCount + (res.data.files_processed || 0),
      })
      setGithubUrl("")
      setTimeout(() => {
        setBtnSuccess(false)
        setIngestState((p) => ({ ...p, status: "idle", progress: 0 }))
      }, 3000)
    } catch (e: any) {
      stopProgress()
      setBtnShake(true)
      setIngestState({
        status: "error",
        progress: 100,
        message: e.response?.data?.detail || e.message,
        indexedCount: ingestState.indexedCount,
      })
      setTimeout(() => setBtnShake(false), 500)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setDroppedFiles(acceptedFiles.map((f) => ({ name: f.name, size: f.size })))
      setIngestState({ status: "indexing", progress: 0, message: "Uploading…", indexedCount: ingestState.indexedCount })
      simulateProgress()
      try {
        const formData = new FormData()
        acceptedFiles.forEach((f) => formData.append("files", f))
        const res = await axios.post(`${API}/ingest/local`, formData)
        stopProgress()
        setBtnSuccess(true)
        setIngestState({
          status: "success",
          progress: 100,
          message: `${res.data.files_processed} files · ${res.data.chunks_indexed} chunks`,
          indexedCount: ingestState.indexedCount + (res.data.files_processed || 0),
        })
        setTimeout(() => {
          setBtnSuccess(false)
          setIngestState((p) => ({ ...p, status: "idle", progress: 0 }))
        }, 3000)
      } catch (e: any) {
        stopProgress()
        setBtnShake(true)
        setIngestState({
          status: "error",
          progress: 100,
          message: e.response?.data?.detail || e.message,
          indexedCount: ingestState.indexedCount,
        })
        setTimeout(() => setBtnShake(false), 500)
      }
    },
    [ingestState.indexedCount, setIngestState, simulateProgress, stopProgress]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: isTouch,
  })

  const isIndexing = ingestState.status === "indexing"

  const tabVariants = {
    hidden:  { opacity: 0, x: activeTab === "github" ? -8 : 8 },
    visible: { opacity: 1, x: 0, transition: { duration: prefersReducedMotion ? 0 : 0.2 } },
    exit:    { opacity: 0, x: activeTab === "github" ? 8 : -8, transition: { duration: 0.15 } },
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col gap-5 p-4 overflow-y-auto">

        {/* ── Source tabs ── */}
        <div>
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Files size={12} />
            Sources
          </p>
          <div className="relative flex bg-bg rounded-xl p-1 border border-border">
            {/* Sliding indicator */}
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-card border border-border shadow-sm"
              animate={{ x: activeTab === "github" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30, duration: prefersReducedMotion ? 0 : undefined }}
              style={{ left: 4 }}
            />
            <button
              onClick={() => setActiveTab("github")}
              aria-pressed={activeTab === "github"}
              className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium rounded-lg transition-colors duration-200 min-h-[44px]"
              style={{ color: activeTab === "github" ? "#1A1A1A" : "#6B6B6B" }}
            >
              <GitBranch size={13} />
              GitHub
            </button>
            <button
              onClick={() => setActiveTab("local")}
              aria-pressed={activeTab === "local"}
              className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium rounded-lg transition-colors duration-200 min-h-[44px]"
              style={{ color: activeTab === "local" ? "#1A1A1A" : "#6B6B6B" }}
            >
              <Upload size={13} />
              Local Files
            </button>
          </div>
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          {activeTab === "github" ? (
            <motion.div key="github" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex flex-col gap-2.5">
                <input
                  type="url"
                  placeholder="https://github.com/user/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGithubIngest()}
                  aria-label="GitHub repository URL"
                  className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text-primary placeholder-text-secondary outline-none focus:border-accent transition-colors font-mono min-h-[44px]"
                />
                <motion.button
                  onClick={handleGithubIngest}
                  disabled={isIndexing || !githubUrl.trim()}
                  aria-label="Index GitHub repository"
                  className={`relative w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white overflow-hidden min-h-[44px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${btnShake ? "animate-shake" : ""}`}
                  style={{
                    background: btnSuccess
                      ? "#2CA055"
                      : "linear-gradient(135deg, #E7473C 0%, #F06052 100%)",
                  }}
                  whileHover={prefersReducedMotion ? {} : { scale: isIndexing ? 1 : 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  {btnSuccess ? (
                    <>
                      <Check size={15} />
                      Indexed ✓
                    </>
                  ) : isIndexing ? (
                    <>
                      <RotateCcw size={14} className="animate-spin" />
                      Indexing… {Math.round(ingestState.progress)}%
                    </>
                  ) : (
                    <>
                      <GitBranch size={14} />
                      Index Repository
                    </>
                  )}
                </motion.button>
                {isIndexing && (
                  <ProgressBar progress={ingestState.progress} status={ingestState.status} />
                )}
                {ingestState.status === "error" && (
                  <p className="text-[11px] text-danger flex items-center gap-1.5 animate-fade-in">
                    <AlertCircle size={11} />
                    {ingestState.message}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="local" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <div className="flex flex-col gap-2.5">
                {isTouch ? (
                  /* Native file picker on touch */
                  <label
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 px-4 py-8 cursor-pointer transition-colors hover:border-accent/50 hover:bg-accent/10 min-h-[44px]"
                    aria-label="Pick files to upload"
                  >
                    <Upload size={24} className="text-accent opacity-70" />
                    <span className="text-[13px] text-text-secondary text-center">
                      Tap to pick files
                    </span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files) onDrop(Array.from(e.target.files))
                      }}
                    />
                  </label>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? "border-accent bg-accent/8 scale-[1.01]"
                        : "border-border hover:border-accent/50 hover:bg-accent/5"
                    }`}
                    aria-label="Drop files or click to upload"
                  >
                    <input {...getInputProps()} />
                    <motion.div animate={isDragActive && !prefersReducedMotion ? { scale: [1, 1.1, 1] } : {}}>
                      <Upload
                        size={24}
                        className={`transition-colors duration-200 ${isDragActive ? "text-accent" : "text-text-secondary"}`}
                      />
                    </motion.div>
                    <span className="text-[13px] text-text-secondary text-center">
                      {isDragActive ? (
                        <span className="text-accent font-medium">Drop to index</span>
                      ) : (
                        "Drag & drop files or click to browse"
                      )}
                    </span>
                  </div>
                )}

                {isIndexing && (
                  <ProgressBar progress={ingestState.progress} status={ingestState.status} />
                )}

                {/* Dropped file pills */}
                {droppedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {droppedFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-card border border-border text-text-secondary font-mono"
                      >
                        <FileCode size={9} />
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}

                {ingestState.status === "error" && (
                  <p className="text-[11px] text-danger flex items-center gap-1.5">
                    <AlertCircle size={11} />
                    {ingestState.message}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Indexed file count badge ── */}
        {ingestState.indexedCount > 0 && (
          <motion.div
            className="flex items-center gap-2"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success font-medium">
              <Check size={10} />
              {ingestState.indexedCount} files indexed
            </span>
          </motion.div>
        )}

        {/* ── Filters ── */}
        <FiltersSection
          language={language}
          fileType={fileType}
          onLanguageChange={onLanguageChange}
          onFileTypeChange={onFileTypeChange}
        />


      </div>

    </div>
  )
}
