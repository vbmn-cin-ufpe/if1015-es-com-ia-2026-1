import { FormEvent, useState } from "react"

import { askQuestion, type ChatAskResponse } from "./services/chatApi"
import { getRepositoryStatus, indexRepository } from "./services/repoApi"

export default function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("")
  const [repositoryId, setRepositoryId] = useState("")
  const [status, setStatus] = useState("")
  const [question, setQuestion] = useState("")
  const [chat, setChat] = useState<ChatAskResponse | null>(null)
  const [error, setError] = useState("")

  async function onIndex(e: FormEvent) {
    e.preventDefault()
    setError("")
    setChat(null)
    const result = await indexRepository(repositoryUrl)
    setRepositoryId(result.repository_id)
    setStatus(result.job_status)
  }

  async function onRefreshStatus() {
    if (!repositoryId) return
    setError("")
    const result = await getRepositoryStatus(repositoryId)
    setStatus(result.index_status)
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    if (!repositoryId) return
    setError("")
    try {
      const result = await askQuestion(repositoryId, question)
      setChat(result)
    } catch {
      setError("Falha ao consultar chat")
    }
  }

  return (
    <div>
    <main>
      <h1>CodeCompass</h1>
      <form onSubmit={onIndex}>
        <input
          value={repositoryUrl}
          onChange={(e) => setRepositoryUrl(e.target.value)}
          placeholder="URL ou caminho do repositório"
        />
        <button type="submit">Indexar</button>
      </form>
      <p>Repository ID: {repositoryId || "-"}</p>
      <p>Status: {status || "-"}</p>
      <button type="button" onClick={onRefreshStatus} disabled={!repositoryId}>
        Atualizar status
      </button>
      <form onSubmit={onAsk}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pergunta sobre o código"
        />
        <button type="submit" disabled={status !== "completed"}>
          Perguntar
        </button>
      </form>
      {chat && (
        <section>
          <p>{chat.answer}</p>
          <ul>
            {chat.sources.map((source) => (
              <li key={source.chunk_id}>
                {source.file_path}:{source.start_line}-{source.end_line}
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <p>{error}</p>}
    </main>
    </div>
    
  )
}