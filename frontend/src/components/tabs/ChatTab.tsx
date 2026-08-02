import { FormEvent, useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion, AnimatePresence } from "framer-motion";
import {
    slideInRight, slideInLeft, chatBubbleTransition,
    staggerContainer, scaleIn, scaleInTransition,
    fadeUp, fadeUpTransition,
} from "../../animations";
import { askQuestion } from "../../services/chatApi";
import { submitAnswerFeedback } from "../../services/chatFeedbackApi";
import { useChatStore } from "../../store";
import { useAuthStore } from "../../store/authStore";
import {
    Card,
    ThinkingDots,
    EmptyState,
    btnPrimary,
    btnSecondary,
    inputCls,
    Icon,
} from "../ui";
import { useI18n } from "../../i18n";

interface Props {
    repositoryId: string;
    status: string;
}

// ── VS Code-style code block ────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TSX",
    js: "JavaScript",
    jsx: "JSX",
    py: "Python",
    python: "Python",
    typescript: "TypeScript",
    javascript: "JavaScript",
    java: "Java",
    go: "Go",
    rust: "Rust",
    cpp: "C++",
    c: "C",
    cs: "C#",
    rb: "Ruby",
    php: "PHP",
    sh: "Shell",
    bash: "Bash",
    sql: "SQL",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    html: "HTML",
    css: "CSS",
    kotlin: "Kotlin",
    scala: "Scala",
    swift: "Swift",
};

function CodeBlock({ lang, code }: { lang: string; code: string }) {
    const [copied, setCopied] = useState(false);
    const label =
        (LANG_LABELS[lang.toLowerCase()] ?? lang.toUpperCase()) || "Código";

    function copy() {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
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
                    <span className="ml-3 text-xs text-[#cccccc] font-mono opacity-80">
                        {label}
                    </span>
                </div>
                <button
                    onClick={copy}
                    className="text-xs text-[#cccccc] hover:text-white transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10"
                >
                    {copied ? (
                        <>
                            <Icon name="check" className="text-green-400" />{" "}
                            Copiado!
                        </>
                    ) : (
                        <>
                            <Icon name="copy" /> Copiar
                        </>
                    )}
                </button>
            </div>
            {/* Code */}
            <SyntaxHighlighter
                language={lang || "text"}
                style={vscDarkPlus}
                showLineNumbers
                lineNumberStyle={{
                    color: "#858585",
                    minWidth: "2.5em",
                    fontSize: "0.75rem",
                }}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: "0.8rem",
                    lineHeight: "1.6",
                    padding: "1rem 1rem 1rem 0.5rem",
                    background: "#1e1e1e",
                }}
                codeTagProps={{
                    style: {
                        fontFamily:
                            "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    },
                }}
            >
                {code.trimEnd()}
            </SyntaxHighlighter>
        </div>
    );
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
    // Split on fenced code blocks first
    const segments = text.split(/(```[\w]*\n[\s\S]*?```)/g);

    return (
        <div className="space-y-1 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            {segments.map((seg, idx) => {
                const codeMatch = seg.match(/^```([\w]*)\n([\s\S]*)```$/);
                if (codeMatch) {
                    const lang = codeMatch[1] || "text";
                    const code = codeMatch[2];
                    return <CodeBlock key={idx} lang={lang} code={code} />;
                }
                // Regular markdown lines
                return <MarkdownBlock key={idx} text={seg} />;
            })}
        </div>
    );
}

function MarkdownBlock({ text }: { text: string }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null =
        null;

    function flushList() {
        if (!listBuffer) return;
        if (listBuffer.type === "ul") {
            elements.push(
                <ul key={elements.length} className="my-1 space-y-0.5 ml-1">
                    {listBuffer.items.map((item, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0">
                                •
                            </span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>,
            );
        } else {
            elements.push(
                <ol
                    key={elements.length}
                    className="my-1 space-y-0.5 ml-1 list-none"
                >
                    {listBuffer.items.map((item, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="text-indigo-500 dark:text-indigo-400 font-medium shrink-0">
                                {i + 1}.
                            </span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ol>,
            );
        }
        listBuffer = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            flushList();
            elements.push(
                <hr
                    key={elements.length}
                    className="my-3 border-gray-200 dark:border-gray-700"
                />,
            );
            continue;
        }

        // Headers
        if (line.startsWith("#### ")) {
            flushList();
            elements.push(
                <h4
                    key={elements.length}
                    className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-3 mb-0.5"
                >
                    {renderInline(line.slice(5))}
                </h4>,
            );
            continue;
        }
        if (line.startsWith("### ")) {
            flushList();
            elements.push(
                <h3
                    key={elements.length}
                    className="text-base font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1"
                >
                    {renderInline(line.slice(4))}
                </h3>,
            );
            continue;
        }
        if (line.startsWith("## ")) {
            flushList();
            elements.push(
                <h2
                    key={elements.length}
                    className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1 border-b border-gray-200 dark:border-gray-700 pb-1"
                >
                    {renderInline(line.slice(3))}
                </h2>,
            );
            continue;
        }
        if (line.startsWith("# ")) {
            flushList();
            elements.push(
                <h1
                    key={elements.length}
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1"
                >
                    {renderInline(line.slice(2))}
                </h1>,
            );
            continue;
        }

        // Blockquote
        if (line.startsWith("> ")) {
            flushList();
            elements.push(
                <blockquote
                    key={elements.length}
                    className="border-l-4 border-indigo-300 dark:border-indigo-600 pl-3 py-0.5 my-1 text-gray-600 dark:text-gray-400 italic bg-indigo-50 dark:bg-indigo-900/20 rounded-r"
                >
                    {renderInline(line.slice(2))}
                </blockquote>,
            );
            continue;
        }

        // Unordered list
        if (line.startsWith("- ") || line.startsWith("* ")) {
            if (!listBuffer || listBuffer.type !== "ul") {
                flushList();
                listBuffer = { type: "ul", items: [] };
            }
            listBuffer.items.push(renderInline(line.slice(2)));
            continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(line)) {
            if (!listBuffer || listBuffer.type !== "ol") {
                flushList();
                listBuffer = { type: "ol", items: [] };
            }
            listBuffer.items.push(renderInline(line.replace(/^\d+\.\s/, "")));
            continue;
        }

        // Blank line
        if (line.trim() === "") {
            flushList();
            elements.push(<div key={elements.length} className="h-1.5" />);
            continue;
        }

        // Normal paragraph
        flushList();
        elements.push(
            <p key={elements.length} className="leading-relaxed">
                {renderInline(line)}
            </p>,
        );
    }

    flushList();
    return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
            return (
                <strong
                    key={i}
                    className="font-semibold text-gray-900 dark:text-gray-100"
                >
                    {part.slice(2, -2)}
                </strong>
            );
        if (part.startsWith("*") && part.endsWith("*"))
            return (
                <em key={i} className="italic">
                    {part.slice(1, -1)}
                </em>
            );
        if (part.startsWith("`") && part.endsWith("`"))
            return (
                <code
                    key={i}
                    className="font-mono text-[0.8em] bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#9cdcfe] px-1.5 py-0.5 rounded border border-[#3c3c3c]"
                >
                    {part.slice(1, -1)}
                </code>
            );
        return part;
    });
}

// ── Thinking labels ──────────────────────────────────────────────────────────

const THINKING_LABELS = [
    "Buscando trechos relevantes…",
    "Analisando o contexto do código…",
    "Consultando o modelo de linguagem…",
    "Formulando resposta detalhada…",
    "Organizando informações…",
];

const THINKING_ICONS = [
    "magnifying-glass",
    "brain",
    "microchip",
    "pen-nib",
    "list-check",
];

// ── ChatTab ──────────────────────────────────────────────────────────────────

export function ChatTab({ repositoryId, status }: Props) {
    const { t, locale } = useI18n();
    const THINKING_LABELS = [
        t('chat_thinking_1'), t('chat_thinking_2'), t('chat_thinking_3'),
        t('chat_thinking_4'), t('chat_thinking_5'),
    ];
    // ── Zustand store ──────────────────────────────────────────────────────
    const { input, history, setInput, addEntry, resetForRepo, clearHistory } =
        useChatStore();
    const token = useAuthStore((s) => s.token) ?? "";

    // ── Local (transient) state ────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [thinkLabel, setThinkLabel] = useState(THINKING_LABELS[0]);
    const [thinkIcon, setThinkIcon] = useState(THINKING_ICONS[0]);
    const [error, setError] = useState("");
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    // Track per-entry feedback: entry.id → "up" | "down"
    const [feedbackSent, setFeedbackSent] = useState<Record<string, "up" | "down">>({});
    // Track response time per entry
    const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});

    // Auto-scroll ref
    const bottomRef = useRef<HTMLDivElement>(null);

    // When repo changes, clear old history
    useEffect(() => {
        if (repositoryId) resetForRepo(repositoryId);
    }, [repositoryId]);

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history.length, loading]);

    async function onAsk(e: FormEvent) {
        e.preventDefault();
        if (!repositoryId || !input.trim()) return;
        setError("");
        setLoading(true);
        setElapsedMs(null);
        const q = input.trim();
        setInput("");
        const t0 = Date.now();

        let idx = 0;
        const interval = setInterval(() => {
            idx = (idx + 1) % THINKING_LABELS.length;
            setThinkLabel(THINKING_LABELS[idx]);
            setThinkIcon(THINKING_ICONS[idx]);
        }, 1800);

        try {
            const response = await askQuestion(repositoryId, q, token, locale);
            const ms = Date.now() - t0;
            setElapsedMs(ms);
            addEntry(q, response, repositoryId);
            // Grab the id of the entry just added
            const entries = useChatStore.getState().history;
            const lastEntry = entries[entries.length - 1];
            if (lastEntry?.id) {
                setResponseTimes((prev) => ({ ...prev, [lastEntry.id]: ms }));
            }
        } catch {
            setError("Falha ao consultar o modelo. Tente novamente.");
            setInput(q); // restore input on error
        } finally {
            clearInterval(interval);
            setLoading(false);
        }
    }

    async function handleFeedback(entryId: string, thumbsUp: boolean) {
        if (feedbackSent[entryId]) return; // already sent
        try {
            await submitAnswerFeedback({
                response_id: entryId,
                repository_id: repositoryId,
                thumbs_up: thumbsUp,
            });
            setFeedbackSent((prev) => ({ ...prev, [entryId]: thumbsUp ? "up" : "down" }));
        } catch {
            // silent — feedback is best-effort
        }
    }

    if (status !== "completed") {
        return (
            <Card>
                <EmptyState
                    icon="comments"
                    title="Repositório não indexado"
                    description="Indexe um repositório na aba Repositório para usar o chat."
                />
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-0 h-full" style={{ minHeight: "calc(100vh - 120px)" }}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0">
                <div className="flex items-center gap-3 px-6 py-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                        <Icon name="comments" className="text-lg" />
                    </span>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Chat sobre o código</h2>
                        <p className="text-xs text-gray-400">
                            {history.length > 0
                                ? `${history.length} pergunta${history.length !== 1 ? "s" : ""} nesta sessão`
                                : "Faça perguntas em linguagem natural sobre o repositório"}
                        </p>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className={`${btnSecondary} text-xs`}
                            title="Limpar conversa"
                        >
                            <Icon name="trash" /> Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* ── Conversation area ──────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 border-x border-gray-200 dark:border-gray-700 px-6 py-4 space-y-6" style={{ maxHeight: "calc(100vh - 260px)" }}>

                {/* Empty state */}
                {history.length === 0 && !loading && (
                    <motion.div
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        transition={fadeUpTransition}
                        className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400"
                    >
                        <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400"
                        >
                            <Icon name="comments" className="text-3xl" />
                        </motion.span>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhuma pergunta ainda</p>
                            <p className="text-xs text-gray-400 mt-1">Use o campo abaixo para perguntar sobre o código</p>
                        </div>
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-lg"
                        >
                            {[
                                "Como funciona o serviço de autenticação?",
                                "Quais são os principais módulos?",
                                "Explique o fluxo de dados da aplicação",
                                "Quais padrões de design são usados?",
                            ].map((suggestion) => (
                                <motion.button
                                    key={suggestion}
                                    variants={scaleIn}
                                    transition={scaleInTransition}
                                    whileHover={{ y: -2, scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setInput(suggestion)}
                                    className="text-left text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                    <Icon name="lightbulb" className="mr-1 text-indigo-400" />
                                    {suggestion}
                                </motion.button>
                            ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* Chat history */}
                <AnimatePresence initial={false}>
                {history.map((entry) => (
                    <motion.div
                        key={entry.id}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                    >
                        {/* Question bubble */}
                        <motion.div
                            variants={slideInRight}
                            transition={chatBubbleTransition}
                            className="flex gap-3 justify-end"
                        >
                            <div className="max-w-[80%] bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed">{entry.question}</p>
                                <p className="text-[10px] text-indigo-200 mt-1 text-right">
                                    {new Date(entry.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                            <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-sm self-end">
                                <Icon name="user" />
                            </span>
                        </motion.div>

                        {/* Answer bubble */}
                        <motion.div
                            variants={slideInLeft}
                            transition={{ ...chatBubbleTransition, delay: 0.08 }}
                            className="flex gap-3"
                        >
                            <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 dark:bg-emerald-600 text-white flex items-center justify-center text-sm self-start mt-1">
                                <Icon name="compass" />
                            </span>
                            <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Icon name="robot" /> CodeCompass AI
                                    </span>
                                </div>
                                <MarkdownText text={entry.response.answer} />

                                {/* Sources */}
                                {entry.response.sources.length > 0 && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1.5 select-none">
                                            <Icon name="database" className="text-indigo-400" />
                                            {entry.response.sources.length} fonte{entry.response.sources.length !== 1 ? "s" : ""} consultada{entry.response.sources.length !== 1 ? "s" : ""}
                                            <Icon name="chevron-down" className="text-[10px]" />
                                        </summary>
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {entry.response.sources.map((src, i) => (
                                                <div
                                                    key={src.chunk_id}
                                                    className="flex items-center gap-2 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-400"
                                                >
                                                    <span className="shrink-0 w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 flex items-center justify-center text-[9px] font-bold">
                                                        {i + 1}
                                                    </span>
                                                    <Icon name="file-code" className="text-indigo-400 shrink-0" />
                                                    <span className="truncate flex-1">{src.file_path}</span>
                                                    <span className="text-gray-300 dark:text-gray-600 shrink-0">:{src.start_line}</span>
                                                    {src.score > 0 && (
                                                        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                                                            {(src.score * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}

                                {/* Feedback thumbs */}
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Esta resposta foi útil?
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Seu feedback melhora as próximas respostas</p>
                                    </div>
                                    {feedbackSent[entry.id] ? (
                                        <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg font-medium">
                                            <Icon name={feedbackSent[entry.id] === "up" ? "thumbs-up" : "thumbs-down"} />
                                            Obrigado pelo feedback!
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleFeedback(entry.id, true)}
                                                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                title="Resposta útil"
                                            >
                                                <Icon name="thumbs-up" regular /> Sim
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(entry.id, false)}
                                                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                title="Resposta não útil"
                                            >
                                                <Icon name="thumbs-down" regular /> Não
                                            </button>
                                        </div>
                                    )}
                                    {responseTimes[entry.id] && (
                                        <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-1 shrink-0">
                                            {(responseTimes[entry.id] / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
                </AnimatePresence>

                {/* Loading indicator (inline) */}
                <AnimatePresence>
                {loading && (
                    <motion.div
                        key="loading-bubble"
                        variants={slideInLeft}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, x: -12 }}
                        transition={chatBubbleTransition}
                        className="flex gap-3"
                    >
                        <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 dark:bg-emerald-600 text-white flex items-center justify-center text-sm animate-pulse">
                            <Icon name={thinkIcon} />
                        </span>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                            <ThinkingDots label={thinkLabel} />
                            <div className="flex gap-1.5 mt-3">
                                {THINKING_LABELS.map((l, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ width: l === thinkLabel ? 24 : 6, opacity: l === thinkLabel ? 1 : 0.4 }}
                                        transition={{ duration: 0.4 }}
                                        className={`h-1 rounded-full ${l === thinkLabel ? "bg-indigo-500" : "bg-gray-200 dark:bg-gray-700"}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* ── Input bar ──────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-b-xl border border-gray-200 dark:border-gray-700 border-t border-t-gray-100 dark:border-t-gray-700 px-4 py-3 shadow-sm">
                {error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                        <Icon name="triangle-exclamation" />{error}
                    </p>
                )}
                <form onSubmit={onAsk} className="flex gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Icon name="code" />
                        </span>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!loading && input.trim()) onAsk(e as unknown as FormEvent);
                                }
                            }}
                            placeholder="Pergunte sobre o código… (Enter para enviar)"
                            disabled={loading}
                            className={`${inputCls} pl-9`}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className={btnPrimary}
                    >
                        {loading ? (
                            <><Icon name="spinner" className="animate-spin" /> Pensando…</>
                        ) : (
                            <><Icon name="paper-plane" /> Enviar</>
                        )}
                    </button>
                </form>
                <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                    <Icon name="floppy-disk" className="mr-1 text-indigo-300" />
                    Histórico salvo nesta sessão — persiste ao trocar de aba
                </p>
            </div>
        </div>
    );
}
