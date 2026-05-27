import React, { useEffect, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion, PanInfo, Variants } from "framer-motion"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const prefersReducedMotion = useReducedMotion()

  /* Escape key close */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  /* Lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  /* Swipe-down to dismiss */
  const handleDragEnd = useCallback(
    (_: PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) onClose()
    },
    [onClose]
  )

  const sheetVariants: Variants = prefersReducedMotion
    ? {
        hidden:  { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
        exit:    { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden:  { y: "100%" },
        visible: {
          y: 0,
          transition: { type: "spring" as const, stiffness: 300, damping: 30 },
        },
        exit: {
          y: "100%",
          transition: { ease: ("easeOut" as any), duration: 0.2 },
        },
      }

  const backdropVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit:    { opacity: 0, transition: { duration: 0.15 } },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            className="fixed inset-0 z-40 bg-[#1A1A1A]/50 backdrop-blur-sm md:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Sheet ── */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation panel"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col md:hidden overflow-hidden"
            style={{ height: "82dvh" }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
          >
            {/* Rounded top surface */}
            <div className="flex flex-col h-full bg-surface rounded-t-2xl border-t border-border overflow-hidden">
              {/* Drag handle */}
              <div
                className="flex justify-center items-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
