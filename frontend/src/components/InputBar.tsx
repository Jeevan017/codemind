import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Send } from "lucide-react"

interface InputBarProps {
  onSend: (question: string) => void
  loading: boolean
}

export default function InputBar({ onSend, loading }: InputBarProps) {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !loading

  // Auto-resize textarea to fit content
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  useEffect(() => {
    if (!loading) textareaRef.current?.focus()
  }, [loading])

  const handleSend = () => {
    if (!canSend) return
    const question = value.trim()
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    onSend(question)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-shrink-0 px-6 md:px-10 pt-6 pb-[34px] mb-8 bg-bg safe-bottom">
      <div className="max-w-5xl mx-auto">
        <div
          className={`relative flex items-end gap-3 bg-surface rounded-[14px] px-4 py-3 border transition-all duration-300 ${
            focused ? "border-accent" : "border-border"
          }`}
          style={{
            boxShadow: focused
              ? "0 2px 12px rgba(231,71,60,0.18), 0 1px 3px rgba(0,0,0,0.05)"
              : "0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              resize()
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask about your codebase…"
            aria-label="Ask a question"
            disabled={loading}
            rows={1}
            className="w-full bg-transparent text-[14px] text-text-primary placeholder-text-secondary outline-none disabled:opacity-40 resize-none min-h-[24px] max-h-[200px] overflow-y-auto leading-relaxed"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          />

          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`
              flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[11px]
              transition-all duration-150 mb-[2px]
              ${canSend
                ? "bg-accent text-white"
                : "bg-card text-text-secondary border border-border"
              }
            `}
            whileHover={canSend ? { scale: 1.06 } : {}}
            whileTap={canSend ? { scale: 0.92 } : {}}
          >
            <Send size={13} strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}