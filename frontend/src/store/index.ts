/**
 * Global Zustand store — persists across tab changes via sessionStorage.
 *
 * Slices:
 *  - chat: full conversation history per repository
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatAskResponse } from "../services/chatApi";

// ── Chat slice ───────────────────────────────────────────────────────────────

export interface ChatEntry {
    id: string;
    question: string;
    response: ChatAskResponse;
    timestamp: number;
}

interface ChatState {
    /** question currently in the input field */
    input: string;
    /** full conversation history */
    history: ChatEntry[];
    /** which repo the current history belongs to */
    repositoryId: string;

    setInput: (input: string) => void;
    addEntry: (
        question: string,
        response: ChatAskResponse,
        repositoryId: string,
    ) => void;
    /** Clear history when a different repo is selected */
    resetForRepo: (repositoryId: string) => void;
    clearHistory: () => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            input: "",
            history: [],
            repositoryId: "",

            setInput: (input) => set({ input }),

            addEntry: (question, response, repositoryId) => {
                // Auto-clear if repo changed
                const prev = get().repositoryId;
                set((state) => ({
                    repositoryId,
                    history:
                        prev && prev !== repositoryId
                            ? [
                                  {
                                      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                      question,
                                      response,
                                      timestamp: Date.now(),
                                  },
                              ]
                            : [
                                  ...state.history,
                                  {
                                      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                      question,
                                      response,
                                      timestamp: Date.now(),
                                  },
                              ],
                    input: "",
                }));
            },

            resetForRepo: (repositoryId) => {
                if (get().repositoryId !== repositoryId) {
                    set({ repositoryId, history: [], input: "" });
                }
            },

            clearHistory: () => set({ history: [], input: "" }),
        }),
        {
            name: "codecompass-chat-v1",
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
);
