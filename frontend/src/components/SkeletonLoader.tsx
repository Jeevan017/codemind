import React from "react"

/* ── Base Pulse Block ─────────────────────────────────────── */
function Block({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />
}

/* ── Sidebar Skeleton ─────────────────────────────────────── */
export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4" aria-busy="true" aria-label="Loading sidebar">
      {/* Tab buttons */}
      <div className="flex gap-2">
        <Block className="h-9 flex-1 rounded-lg" />
        <Block className="h-9 flex-1 rounded-lg" />
      </div>
      {/* URL input */}
      <Block className="h-10 w-full rounded-lg" />
      {/* CTA button */}
      <Block className="h-10 w-full rounded-xl" />
      {/* Dropzone */}
      <Block className="h-28 w-full rounded-xl" />
      {/* File badge */}
      <Block className="h-6 w-32 rounded-full" />
      {/* Divider label */}
      <div className="flex items-center gap-2">
        <Block className="h-4 w-16 rounded" />
        <Block className="flex-1 h-px rounded" />
      </div>
      {/* Filter rows */}
      <Block className="h-4 w-20 rounded" />
      <Block className="h-9 w-full rounded-lg" />
      <Block className="h-4 w-20 rounded" />
      <Block className="h-9 w-full rounded-lg" />
    </div>
  )
}

/* ── Chat Message Skeleton ────────────────────────────────── */
export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-4 py-2" aria-busy="true" aria-label="Loading messages">
      {/* User message */}
      <div className="flex justify-end">
        <Block className="h-10 w-52 rounded-2xl" />
      </div>
      {/* Assistant response */}
      <div className="flex justify-start">
        <div className="flex flex-col gap-2 w-[65%]">
          <Block className="h-4 w-full rounded" />
          <Block className="h-4 w-5/6 rounded" />
          <Block className="h-4 w-4/6 rounded" />
          <div className="flex gap-2 mt-2">
            <Block className="h-6 w-20 rounded-full" />
            <Block className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Filter Section Skeleton ──────────────────────────────── */
export function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading filters">
      <Block className="h-[11px] w-20 rounded" />
      <Block className="h-9 w-full rounded-lg" />
      <Block className="h-[11px] w-24 rounded" />
      <Block className="h-9 w-full rounded-lg" />
    </div>
  )
}

/* ── Icon Rail Skeleton (tablet) ──────────────────────────── */
export function IconRailSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      {[1, 2, 3, 4].map((i) => (
        <Block key={i} className="w-9 h-9 rounded-xl" />
      ))}
    </div>
  )
}
