import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, fadeUpTransition, scaleIn, scaleInTransition } from "../../animations";

// ── Icon (Font Awesome 6 wrapper) ────────────────────────────────────────────

export function Icon({
    name,
    className = "",
    regular = false,
}: {
    name: string;
    className?: string;
    regular?: boolean;
}) {
    const brandsIcons = ["github", "twitter", "facebook", "google", "linkedin", "youtube", "instagram", "discord", "slack", "npm", "python", "js-square", "react"];
    const prefix = brandsIcons.includes(name) ? "fa-brands" : regular ? "fa-regular" : "fa-solid";
    return (
        <i
            className={`${prefix} fa-${name} ${className}`}
            aria-hidden="true"
        />
    );
}

// ── Primitives ──────────────────────────────────────────────────────────────

export const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors";

export const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const btnSecondary =
    "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors";

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({
    title,
    children,
    className = "",
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={fadeUpTransition}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
        >
            {title && (
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                    {title}
                </h2>
            )}
            {children}
        </motion.div>
    );
}

// ── Badge ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    completed:
        "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    indexing:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
    pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    ready: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    ok: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    healthy:
        "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    warning:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
    error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    good: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    poor: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    excellent:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
};

export function Badge({ status }: { status: string }) {
    const cls =
        STATUS_COLORS[status.toLowerCase()] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    return (
        <motion.span
            variants={scaleIn}
            initial="hidden"
            animate="show"
            transition={scaleInTransition}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
        >
            {status.toUpperCase()}
        </motion.span>
    );
}

// ── ProgressBar ─────────────────────────────────────────────────────────────

export function ProgressBar({
    value,
    max = 100,
}: {
    value: number;
    max?: number;
}) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
                className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
        </div>
    );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 5 }: { size?: number }) {
    return (
        <svg
            className={`animate-spin w-${size} h-${size} text-indigo-600 dark:text-indigo-400`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

// ── ThinkingDots ─────────────────────────────────────────────────────────────

export function ThinkingDots({ label = "Processando" }: { label?: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
            <Spinner size={4} />
            <span>{label}</span>
            <span className="flex gap-0.5">
                <span
                    className="animate-bounce w-1 h-1 bg-indigo-400 dark:bg-indigo-500 rounded-full"
                    style={{ animationDelay: "0ms" }}
                />
                <span
                    className="animate-bounce w-1 h-1 bg-indigo-400 dark:bg-indigo-500 rounded-full"
                    style={{ animationDelay: "150ms" }}
                />
                <span
                    className="animate-bounce w-1 h-1 bg-indigo-400 dark:bg-indigo-500 rounded-full"
                    style={{ animationDelay: "300ms" }}
                />
            </span>
        </div>
    );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon
                name={icon}
                className="text-5xl mb-4 text-gray-300 dark:text-gray-600"
            />
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                {title}
            </p>
            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    {description}
                </p>
            )}
        </div>
    );
}

// ── ErrorBanner ──────────────────────────────────────────────────────────────

export function ErrorBanner({
    message,
    onClose,
}: {
    message: string;
    onClose: () => void;
}) {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
                <Icon
                    name="circle-exclamation"
                    className="text-red-400 dark:text-red-500 shrink-0"
                />
                <span className="text-sm text-red-700 dark:text-red-400">
                    {message}
                </span>
            </div>
            <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
                <Icon name="xmark" />
            </button>
        </div>
    );
}

// ── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({
    icon,
    title,
    subtitle,
}: {
    icon: string;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="mb-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Icon
                    name={icon}
                    className="text-indigo-500 dark:text-indigo-400"
                />{" "}
                {title}
            </h2>
            {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

// ── MetricCard ───────────────────────────────────────────────────────────────

export function MetricCard({
    value,
    label,
    color = "indigo",
}: {
    value: string | number;
    label: string;
    color?: "indigo" | "green" | "blue" | "purple" | "amber";
}) {
    const colors = {
        indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800",
        green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800",
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800",
        amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
    };
    return (
        <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-1 opacity-70">{label}</p>
        </div>
    );
}
