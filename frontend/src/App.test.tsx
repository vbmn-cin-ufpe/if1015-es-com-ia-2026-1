import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { expect, test, vi } from "vitest"

import App from "./App"

vi.mock("./services/repoApi", () => ({
  indexRepository: () => Promise.resolve({ repository_id: "repo-1", job_status: "completed" }),
  getRepositoryStatus: () => Promise.resolve({ repository_id: "repo-1", index_status: "completed", stats: {} })
}))

vi.mock("./services/chatApi", () => ({
  askQuestion: () =>
    Promise.resolve({
      answer: "ok",
      sources: [{ chunk_id: "c1", file_path: "app/main.py", start_line: 1, end_line: 10, score: 0.9 }]
    })
}))

test("renders and performs index + ask flow", async () => {
  render(<App />)
  fireEvent.change(screen.getByPlaceholderText("URL ou caminho do repositório"), {
    target: { value: "https://github.com/example/repo" }
  })
  fireEvent.click(screen.getByText("Indexar"))
  await waitFor(() => expect(screen.getByText(/Repository ID: repo-1/)).toBeTruthy())

  fireEvent.change(screen.getByPlaceholderText("Pergunta sobre o código"), { target: { value: "o que faz?" } })
  fireEvent.click(screen.getByText("Perguntar"))
  await waitFor(() => expect(screen.getByText("ok")).toBeTruthy())
})