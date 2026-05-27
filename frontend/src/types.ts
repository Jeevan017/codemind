export interface Source {
  filename: string
  filepath: string
  file_type: "code" | "document" | "image" | string
  rerank_score: number
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  decision?: string
  timestamp: Date
}

export type IngestStatus = "idle" | "indexing" | "success" | "error"

export interface IngestState {
  status: IngestStatus
  progress: number
  message: string
  indexedCount: number
}
