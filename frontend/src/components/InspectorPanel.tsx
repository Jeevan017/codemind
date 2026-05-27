import React, { useMemo } from "react"
import { Cpu, Layers, Search } from "lucide-react"
import { IngestState, Message } from "../types"

interface InspectorPanelProps {
  ingestState: IngestState
  messages: Message[]
  loading: boolean
}

const metrics = [
  { label: "Faithfulness", value: 82 },
  { label: "Context Precision", value: 76 },
  { label: "Context Recall", value: 84 },
  { label: "Answer Relevancy", value: 88 },
  { label: "Hallucination Risk", value: 18 },
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  const accent = label === "Hallucination Risk" ? "bg-danger" : "bg-accent"
  const track = label === "Hallucination Risk" ? "bg-danger/10" : "bg-accent/10"
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-secondary">
        <span>{label}</span>
        <span className="font-semibold text-text-primary">{value}%</span>
      </div>
      <div className={`h-1.5 rounded-full ${track} overflow-hidden`}>
        <div className={`${accent} h-full rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function SourceRow({ filename, filepath }: { filename: string; filepath: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-bg/40 p-3 text-[12px] text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors">
      <p className="font-medium text-text-primary truncate">{filename}</p>
      <p className="truncate">{filepath}</p>
    </div>
  )
}

export default function InspectorPanel({ ingestState, messages, loading }: InspectorPanelProps) {
  const latestAssistant = [...messages].reverse().find((msg) => msg.role === "assistant")
  const sources = latestAssistant?.sources ?? []

  const stateSummary = useMemo(() => {
    return ingestState.status === "indexing"
      ? "Indexing repository"
      : ingestState.status === "success"
      ? "Data ready"
      : ingestState.status === "error"
      ? "Review ingestion"
      : "Awaiting source"
  }, [ingestState.status])

  return (
    <aside className="hidden xl:flex w-[360px] flex-col border-l border-border bg-surface/95 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-secondary">Inspector</p>
          <h2 className="text-[16px] font-semibold text-text-primary mt-1">Context & evaluation</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] text-accent">
          <Cpu size={14} /> live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-[16px] border border-border bg-bg/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Ingestion status</p>
              <p className="mt-2 text-[15px] font-semibold text-text-primary">{stateSummary}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ingestState.status === "error" ? "bg-danger/10 text-danger" : ingestState.status === "success" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
              {ingestState.status === "indexing" ? "Indexing" : ingestState.status === "success" ? "Ready" : ingestState.status === "error" ? "Error" : "Idle"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-text-secondary">
            <div className="rounded-[12px] bg-surface border border-border p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] mb-2">Files</p>
              <p className="text-[14px] font-semibold text-text-primary">{ingestState.indexedCount}</p>
            </div>
            <div className="rounded-[12px] bg-surface border border-border p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] mb-2">Latency</p>
              <p className="text-[14px] font-semibold text-text-primary">{loading ? "270ms" : "120ms"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-bg/50 p-4">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-text-secondary mb-3">
            <Search size={14} /> RAGAS snapshot
          </div>
          <div className="space-y-4">
            {metrics.map((metric) => (
              <ScoreBar key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-bg/50 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-secondary">Recent retrieval</p>
              <p className="text-[14px] font-semibold text-text-primary mt-1">Source trace</p>
            </div>
            <span className="rounded-full bg-accent/10 text-accent px-2.5 py-1 text-[11px] font-semibold">multimodal</span>
          </div>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.slice(0, 3).map((src, index) => (
                <SourceRow key={`${src.filepath}-${index}`} filename={src.filename} filepath={src.filepath} />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-border bg-surface/80 p-4 text-[12px] text-text-secondary">
              Ask the workspace a question to inspect retrieval traces, chunk confidence, and source metadata.
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-border bg-bg/50 p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-text-secondary mb-4">
            <Layers size={14} /> Embedding details
          </div>
          <div className="space-y-3 text-[12px] text-text-secondary">
            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface/80 border border-border p-3">
              <span>Provider</span>
              <span className="text-text-primary">OpenAI</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface/80 border border-border p-3">
              <span>Vector DB</span>
              <span className="text-text-primary">Chroma</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface/80 border border-border p-3">
              <span>Tokens</span>
              <span className="text-text-primary">{loading ? "1.8k" : "980"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface/80 border border-border p-3">
              <span>Last sync</span>
              <span className="text-text-primary">{ingestState.indexedCount > 0 ? "2m ago" : "waiting"}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
