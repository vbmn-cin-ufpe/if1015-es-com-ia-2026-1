import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Card,
  EmptyState,
  ThinkingDots,
  ErrorBanner,
  Icon,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "../ui"
import { useI18n } from "../../i18n"
import { generateModuleDoc } from "../../services/docGeneratorApi"
import { fadeUp, fadeUpTransition } from "../../animations"

interface Props {
  repositoryId: string
  status: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className={btnSecondary + " text-xs"}
    >
      <Icon name={copied ? "check" : "copy"} />
      {copied ? "Copiado!" : "Copiar Markdown"}
    </button>
  )
}

export function DocGeneratorTab({ repositoryId, status }: Props) {
  const { t } = useI18n()
  const [modulePath, setModulePath] = useState("")
  const [doc, setDoc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!modulePath.trim()) return
    setLoading(true)
    setError(null)
    setDoc(null)
    try {
      const result = await generateModuleDoc(repositoryId, modulePath.trim())
      setDoc(result.documentation)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao gerar documentação")
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    "app/services/auth_service.py",
    "app/services/chat_service.py",
    "app/controllers",
    "services",
  ]

  if (status !== "completed") {
    return (
      <EmptyState
        icon="book-open"
        title="Repositório não indexado"
        description="Indexe o repositório primeiro para gerar documentação."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="book-open" className="text-2xl" />
          <h2 className="text-xl font-bold">Gerador de Documentação</h2>
        </div>
        <p className="text-teal-100 text-sm">
          Gera um README.md detalhado para um módulo usando os chunks de código indexados +
          histórico de commits, via LLM.
        </p>
      </div>

      {/* Input */}
      <Card>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Módulo ou caminho a documentar
            </label>
            <div className="flex gap-2">
              <input
                value={modulePath}
                onChange={(e) => setModulePath(e.target.value)}
                placeholder="ex: app/services/auth_service.py"
                className={`${inputCls} flex-1`}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !modulePath.trim()}
                className={btnPrimary}
              >
                {loading ? <ThinkingDots label="Gerando" /> : (
                  <><Icon name="wand-magic-sparkles" /> Gerar</>
                )}
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setModulePath(s)}
                className="text-[11px] font-mono bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      {loading && (
        <Card>
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <ThinkingDots label="O LLM está escrevendo a documentação…" />
            <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {doc && !loading && (
          <motion.div
            key="doc"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={fadeUpTransition}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="file-lines" className="text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
                    {modulePath}
                  </span>
                </div>
                <CopyButton text={doc} />
              </div>

              {/* Rendered documentation preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-auto max-h-[70vh]">
                <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {doc}
                </pre>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
