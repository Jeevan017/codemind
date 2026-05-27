import React, { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Copy, Check, FileCode, FileText, Image } from "lucide-react"
import { Message, Source } from "../types"

/* ── Source pill ──────────────────────────────────────────── */
function SourcePill({ src }: { src: Source }) {
  const isCode = src.file_type === "code"
  const isImage = src.file_type === "image"
  const style = isCode
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
    : isImage
    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
    : "bg-success/10 text-success border-success/20"
  const Icon = isCode ? FileCode : isImage ? Image : FileText

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-medium ${style}`}
      title={src.filepath}
    >
      <Icon size={10} />
      <span className="font-mono">{src.filename}</span>
    </span>
  )
}

/* ── Copy button ──────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      aria-label="Copy message"
      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors"
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  )
}

/* ── Typing indicator ─────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full bg-accent"
                style={{
                  animation: `pulse 1.4s infinite`,
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-[12px] text-text-secondary">Thinking…</span>
        </div>
      </div>
    </div>
  )
}

/* ── Message bubble ───────────────────────────────────────── */
interface MessageBubbleProps {
  msg: Message
}
function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.role === "user"
  const timeStr = msg.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {isUser ? (
        <div className="max-w-[80%] md:max-w-[60%]">
          <div className="rounded-2xl rounded-tr-sm border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-[13px] text-text-primary whitespace-pre-wrap">{msg.content}</p>
          </div>
          <p className="text-[10px] text-text-secondary mt-1 text-right pr-1">{timeStr}</p>
        </div>
      ) : (
        <div className="max-w-[80%] md:max-w-[65%]">
          <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
              <CopyButton text={msg.content} />
            </div>

            {/* Sources */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-2">
                  Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((src, j) => (
                    <SourcePill key={j} src={src} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-text-secondary mt-1 pl-1">{timeStr}</p>
        </div>
      )}
    </motion.div>
  )
}

/* ── Chat area ──────────────────────────────────────────────── */
interface ChatAreaProps {
  messages: Message[]
  loading: boolean
}

export default function ChatArea({ messages, loading }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  return (
    <div
      className="flex-1 overflow-y-auto px-4 md:px-6 py-6 flex flex-col gap-4"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <motion.div
          className="flex-1 flex flex-col items-center justify-center text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-3xl font-semibold text-text-primary mb-3">
            Ask your codebase anything
          </h2>
          <div className="text-text-secondary text-sm flex items-center gap-1">
            <span className="text-lg">👈</span>
            Start by uploading files or a repository
          </div>
        </motion.div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}

      {/* Loading */}
      {loading && <TypingDots />}

      <div ref={bottomRef} />
    </div>
  )
}
