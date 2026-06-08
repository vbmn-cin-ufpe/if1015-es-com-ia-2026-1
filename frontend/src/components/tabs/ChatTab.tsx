import { FormEvent, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { askQuestion, type ChatAskResponse } from "../../services/chatApi"
import { Card, ThinkingDots, EmptyState, btnPrimary, inputCls } from "../ui"

interface Props {
  repositoryId: string
  status: string
}

// ── VS Code-style code block ────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
  ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX",
  py: "Python", python: "Python", typescript: "TypeScript",
  javascript: "JavaScript", java: "Java", go: "Go", rust: "Rust",
  cpp: "C++", c: "C", cs: "C#", rb: "Ruby", php: "PHP",
  sh: "Shell", bash: "Bash", sql: "SQL", json: "JSON",
  yaml: "YAML", yml: "YAML", html: "HTML", css: "CSS",
  kotlin: "Kotlin", scala: "Scala", swift: "Swift",
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const label = (LANG_LABELS[lang.toLowerCase()] ?? lang.toUpperCase()) || "Código"

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#3c3c3c] shadow-lg">
      {/* Title bar */}
      <div className="flex items-center justify-between bg-[#323233] px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Window dots */}
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs text-[#cccccc] font-mono opacity-80">{label}</span>
        </div>
        <button
          onClick={copy}
          className="text-xs text-[#cccccc] hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10"
        >
          {copied ? "✅ Copiado!" : "⧉ Copiar"}
        </button>
      </div>
      {/* Code */}
      <SyntaxHighlighter
        language={lang || "text"}
        style={vscDarkPlus}
        showLineNumbers
        lineNumberStyle={{ color: "#858585", minWidth: "2.5em", fontSize: "0.75rem" }}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8rem",
          lineHeight: "1.6",
          padding: "1rem 1rem 1rem 0.5rem",
          background: "#1e1e1e",
        }}
        codeTagProps={{ style: { fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" } }}
      >
        {code.trimEnd()}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  // Split on fenced code blocks first
  const segments = text.split(/(```[\w]*\n[\s\S]*?```)/g)

  return (
    <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
      {segments.map((seg, idx) => {
        const codeMatch = seg.match(/^```([\w]*)\n([\s\S]*)```$/)
        if (codeMatch) {
          const lang = codeMatch[1] || "text"
          const code = codeMatch[2]
          return <CodeBlock key={idx} lang={lang} code={code} />
        }
        // Regular markdown lines
        return <MarkdownBlock key={idx} text={seg} />
      })}
    </div>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null

  function flushList() {
    if (!listBuffer) return
    if (listBuffer.type === "ul") {
      elements.push(
        <ul key={elements.length} className="my-1 space-y-0.5 ml-1">
          {listBuffer.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    } else {
      elements.push(
        <ol key={elements.length} className="my-1 space-y-0.5 ml-1 list-none">
          {listBuffer.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-500 dark:text-indigo-400 font-medium shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )
    }
    listBuffer = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList()
      elements.push(<hr key={elements.length} className="my-3 border-gray-200 dark:border-gray-700" />)
      continue
    }

    // Headers
    if (line.startsWith("#### ")) {
      flushList()
      elements.push(<h4 key={elements.length} className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-3 mb-0.5">{renderInline(line.slice(5))}</h4>)
      continue
    }
    if (line.startsWith("### ")) {
      flushList()
      elements.push(<h3 key={elements.length} className="text-base font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1">{renderInline(line.slice(4))}</h3>)
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      elements.push(<h2 key={elements.length} className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">{renderInline(line.slice(3))}</h2>)
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      elements.push(<h1 key={elements.length} className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1">{renderInline(line.slice(2))}</h1>)
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList()
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-indigo-300 dark:border-indigo-600 pl-3 py-0.5 my-1 text-gray-600 dark:text-gray-400 italic bg-indigo-50 dark:bg-indigo-900/20 rounded-r">
          {renderInline(line.slice(2))}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList()
        listBuffer = { type: "ul", items: [] }
      }
      listBuffer.items.push(renderInline(line.slice(2)))
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList()
        listBuffer = { type: "ol", items: [] }
      }
      listBuffer.items.push(renderInline(line.replace(/^\d+\.\s/, "")))
      continue
    }

    // Blank line
    if (line.trim() === "") {
      flushList()
      elements.push(<div key={elements.length} className="h-1.5" />)
      continue
    }

    // Normal paragraph
    flushList()
    elements.push(<p key={elements.length} className="leading-relaxed">{renderInline(line)}</p>)
  }

  flushList()
  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="font-mono text-[0.8em] bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#9cdcfe] px-1.5 py-0.5 rounded border border-[#3c3c3c]">
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

// ── Thinking labels ──────────────────────────────────────────────────────────

const THINKING_LABELS = [
  "Buscando trechos relevantes…",
  "Analisando o contexto…",
  "Consultando o LLM…",
  "Formulando resposta…",
]

// ── ChatTab ──────────────────────────────────────────────────────────────────

export function ChatTab({ repositoryId, status }: Props) {
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatAskResponse | null>(null)
  const [lastQuestion, setLastQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [thinkLabel, setThinkLabel] = useState(THINKING_LABELS[0])
  const [error, setError] = useState("")

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    if (!repositoryId || !question.trim()) return
    setError("")
    setLoading(true)
    setChat(null)
    setLastQuestion(question.trim())

    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % THINKING_LABELS.length
      setThinkLabel(THINKING_LABELS[idx])
    }, 1800)

    try {
      setChat(await askQuestion(repositoryId, question.trim()))
    } catch {
      setError("Falha ao consultar o modelo. Tente novamente.")
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  if (status !== "completed") {
    return (
      <Card>
        <EmptyState
          icon="💬"
          title="Repositório não indexado"
          description="Indexe um repositório na aba Repositório para usar o chat."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card title="Perguntar sobre o código">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Faça perguntas em linguagem natural sobre qualquer aspecto do repositório indexado.
        </p>
        <form onSubmit={onAsk} className="flex gap-3">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ex: Como funciona o serviço de autenticação? Quais são os principais módulos?"
            disabled={loading}
            className={`${inputCls} flex-1`}
          />
          <button type="submit" disabled={loading || !question.trim()} className={btnPrimary}>
            {loading ? "…" : "💬 Perguntar"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      </Card>

      {loading && (
        <Card>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <ThinkingDots label={thinkLabel} />
            <div className="flex gap-1.5 mt-2">
              {THINKING_LABELS.map((l, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    l === thinkLabel ? "w-8 bg-indigo-500" : "w-2 bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {chat && !loading && (
        <Card>
          {/* Question */}
          <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold">
              ?
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium pt-0.5">{lastQuestion}</p>
          </div>

          {/* Answer */}
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm">
              🧭
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Resposta</p>
              <MarkdownText text={chat.answer} />
            </div>
          </div>

          {/* Sources */}
          {chat.sources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                📎 {chat.sources.length} fonte(s) consultada(s)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {chat.sources.map(src => (
                  <div
                    key={src.chunk_id}
                    className="flex items-center gap-2 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-indigo-400">📄</span>
                    <span className="truncate">{src.file_path}</span>
                    <span className="text-gray-400 shrink-0">:{src.start_line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

