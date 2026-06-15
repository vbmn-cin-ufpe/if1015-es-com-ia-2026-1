import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signin, signup, forgotPassword, resetPassword } from "../../services/authApi";
import { useAuthStore } from "../../store/authStore";
import { Icon, inputCls, btnPrimary } from "../ui";

// -- Types -------------------------------------------------------------------

type View = "login" | "signup" | "forgot" | "reset" | "verify_notice";
type SignupStep = "plan" | "details";
type PlanId = "free" | "paid" | "enterprise";

interface PlanDef {
  id: PlanId;
  name: string;
  icon: string;
  price: string;
  priceLabel: string;
  repos: string;
  questions: string;
  canDelete: boolean;
  highlight?: boolean;
  badge?: string;
  accent: string;
  iconBg: string;
  iconText: string;
  cardSelected: string;
  badgeBg: string;
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    icon: "seedling",
    price: "Grátis",
    priceLabel: "Para sempre",
    repos: "2 repositórios",
    questions: "5 perguntas/dia",
    canDelete: false,
    accent: "border-emerald-400 dark:border-emerald-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconText: "text-emerald-600 dark:text-emerald-400",
    cardSelected: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  },
  {
    id: "paid",
    name: "Pro",
    icon: "rocket",
    price: "Pago",
    priceLabel: "Mais popular",
    repos: "10 repositórios",
    questions: "100 perguntas/dia",
    canDelete: true,
    highlight: true,
    badge: "⭐ Popular",
    accent: "border-violet-500 dark:border-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
    iconText: "text-violet-600 dark:text-violet-400",
    cardSelected: "bg-violet-50 dark:bg-violet-950/40",
    badgeBg: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: "building",
    price: "Premium",
    priceLabel: "Poder total",
    repos: "50 repositórios",
    questions: "500 perguntas/dia",
    canDelete: true,
    accent: "border-amber-500 dark:border-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconText: "text-amber-600 dark:text-amber-400",
    cardSelected: "bg-amber-50 dark:bg-amber-950/40",
    badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
];

// -- Animations --------------------------------------------------------------

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: -40 },
};
const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  show:   { opacity: 1, x: 0 },
  exit:   { opacity: 0, x: 40 },
};
const slideUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -12 },
};

// -- Helpers -----------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 tracking-wide uppercase">
      {children}
    </label>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white dark:bg-gray-900 px-2 text-gray-400">{label}</span>
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
    >
      <Icon name="circle-exclamation" className="shrink-0" />
      {msg}
    </motion.div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2"
    >
      <Icon name="circle-check" className="shrink-0" />
      {msg}
    </motion.div>
  );
}

// -- Step indicator ----------------------------------------------------------

function StepIndicator({ step, planDef }: { step: SignupStep; planDef: PlanDef }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-1.5">
        {step === "plan" ? (
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">1</div>
        ) : (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planDef.iconBg} ${planDef.iconText}`}>
            <Icon name="check" className="text-[10px]" />
          </div>
        )}
        <span className={`text-xs font-medium ${step === "plan" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
          Escolha do plano
        </span>
      </div>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-1.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          step === "details" ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
        }`}>2</div>
        <span className={`text-xs font-medium ${step === "details" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
          Criar conta
        </span>
      </div>
    </div>
  );
}

// -- Plan Selector (Step 1) --------------------------------------------------

function PlanSelector({
  selected, onSelect, onContinue, onLogin,
}: {
  selected: PlanId;
  onSelect: (p: PlanId) => void;
  onContinue: () => void;
  onLogin: () => void;
}) {
  const planDef = PLANS.find((p) => p.id === selected)!;
  return (
    <div className="space-y-3">
      <StepIndicator step="plan" planDef={planDef} />

      {PLANS.map((plan) => {
        const isSelected = selected === plan.id;
        return (
          <motion.button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
              isSelected
                ? `${plan.accent} ${plan.cardSelected}`
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900/50"
            }`}
          >
            {plan.badge && (
              <span className={`absolute -top-2.5 right-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${plan.badgeBg}`}>
                {plan.badge}
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition-colors ${
                isSelected ? `${plan.iconBg} ${plan.iconText}` : "bg-gray-100 dark:bg-gray-800 text-gray-400"
              }`}>
                <Icon name={plan.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{plan.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isSelected ? plan.badgeBg : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>{plan.price}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{plan.priceLabel}</p>
              </div>
              <motion.div
                initial={false}
                animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <Icon name="circle-check" className={`text-xl ${plan.iconText}`} />
              </motion.div>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
              {[plan.repos, plan.questions, ...(plan.canDelete ? ["Deletar repositórios"] : [])].map((f) => (
                <li key={f} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Icon name="check" className={`text-[10px] transition-colors ${isSelected ? plan.iconText : "text-gray-300 dark:text-gray-600"}`} />
                  {f}
                </li>
              ))}
            </ul>
          </motion.button>
        );
      })}

      <button type="button" onClick={onContinue} className={`${btnPrimary} w-full justify-center mt-1`}>
        Continuar <Icon name="arrow-right" />
      </button>
      <Divider label="Já tem conta?" />
      <button
        type="button"
        onClick={onLogin}
        className="w-full text-sm text-center text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Entrar na minha conta
      </button>
    </div>
  );
}

// -- Signup Details (Step 2) -------------------------------------------------

function SignupDetailsForm({
  plan, onBack, onSwitch,
}: {
  plan: PlanId;
  onBack: () => void;
  onSwitch: (v: View) => void;
}) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const planDef = PLANS.find((p) => p.id === plan)!;
  const pwStrength =
    password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : /[A-Z]/.test(password) && /\d/.test(password) ? 4
    : 3;
  const strengthColors = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"];
  const strengthLabels = ["", "Muito curta", "Fraca", "Razoável", "Forte"];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    if (password.length < 8) { setError("A senha deve ter ao menos 8 caracteres"); return; }
    setLoading(true);
    try {
      const r = await signup(email, password, plan);
      setAuth(r.token, {
        user_id: r.user_id, email: r.email, role: r.role, plan: r.plan,
        email_verified: r.email_verified, repos_indexed_count: 0, questions_asked_count: 0,
      });
      if (!r.email_verified) onSwitch("verify_notice");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <StepIndicator step="details" planDef={planDef} />

      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${planDef.accent} ${planDef.cardSelected}`}>
        <Icon name={planDef.icon} className={`text-sm ${planDef.iconText}`} />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Plano {planDef.name}</span>
        <button
          type="button"
          onClick={onBack}
          className="ml-auto text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
        >
          ← Trocar
        </button>
      </div>

      <div>
        <FieldLabel>E-mail</FieldLabel>
        <div className="relative">
          <Icon name="envelope" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Senha</FieldLabel>
        <div className="relative">
          <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type={showPw ? "text" : "password"} autoComplete="new-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mín. 8 caracteres" className={`${inputCls} pl-9 pr-10`}
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name={showPw ? "eye-slash" : "eye"} className="text-sm" />
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex gap-0.5 flex-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i <= pwStrength ? strengthColors[pwStrength] : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">{strengthLabels[pwStrength]}</span>
          </div>
        )}
      </div>

      <div>
        <FieldLabel>Confirmar senha</FieldLabel>
        <div className="relative">
          <Icon name="lock-open" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type={showPw ? "text" : "password"} autoComplete="new-password" required
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            className={`${inputCls} pl-9 ${
              confirm.length > 0
                ? password === confirm
                  ? "border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-300"
                  : "border-red-400 dark:border-red-600 ring-1 ring-red-300"
                : ""
            }`}
          />
          {confirm.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {password === confirm
                ? <Icon name="circle-check" className="text-emerald-500" />
                : <Icon name="circle-xmark" className="text-red-400" />}
            </span>
          )}
        </div>
      </div>

      <ErrorMsg msg={error} />
      <button
        type="submit"
        disabled={loading || (confirm.length > 0 && password !== confirm)}
        className={`${btnPrimary} w-full justify-center`}
      >
        {loading
          ? <><Icon name="spinner" className="animate-spin" /> Criando conta…</>
          : <><Icon name="user-plus" /> Criar conta</>}
      </button>
      <Divider label="Já tem conta?" />
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className="w-full text-sm text-center text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Entrar na minha conta
      </button>
    </form>
  );
}

// -- Signup wrapper (manages 2 steps) ----------------------------------------

function SignupForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const [step, setStep] = useState<SignupStep>("plan");
  const [plan, setPlan] = useState<PlanId>("free");
  const [dir, setDir] = useState<"forward" | "back">("forward");

  function goDetails() { setDir("forward"); setStep("details"); }
  function goBack()    { setDir("back");    setStep("plan"); }

  const variants = dir === "forward" ? slideInRight : slideInLeft;

  return (
    <AnimatePresence mode="wait">
      {step === "plan" ? (
        <motion.div
          key="plan"
          variants={variants}
          initial="hidden"
          animate="show"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <PlanSelector
            selected={plan}
            onSelect={setPlan}
            onContinue={goDetails}
            onLogin={() => onSwitch("login")}
          />
        </motion.div>
      ) : (
        <motion.div
          key="details"
          variants={variants}
          initial="hidden"
          animate="show"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          <SignupDetailsForm plan={plan} onBack={goBack} onSwitch={onSwitch} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -- Login form --------------------------------------------------------------

function LoginForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await signin(email, password);
      setAuth(r.token, {
        user_id: r.user_id, email: r.email, role: r.role, plan: r.plan,
        email_verified: r.email_verified, repos_indexed_count: 0, questions_asked_count: 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <FieldLabel>E-mail</FieldLabel>
        <div className="relative">
          <Icon name="envelope" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className={`${inputCls} pl-9`}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Senha</FieldLabel>
        <div className="relative">
          <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type={showPw ? "text" : "password"} autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" className={`${inputCls} pl-9 pr-10`}
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon name={showPw ? "eye-slash" : "eye"} className="text-sm" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline float-right"
        >
          Esqueceu a senha?
        </button>
        <div className="clear-both" />
      </div>
      <ErrorMsg msg={error} />
      <button type="submit" disabled={loading} className={`${btnPrimary} w-full justify-center`}>
        {loading
          ? <><Icon name="spinner" className="animate-spin" /> Entrando…</>
          : <><Icon name="right-to-bracket" /> Entrar</>}
      </button>
      <Divider label="Não tem conta?" />
      <button
        type="button"
        onClick={() => onSwitch("signup")}
        className="w-full text-sm text-center text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Criar conta gratuita
      </button>
    </form>
  );
}

// -- Forgot password ---------------------------------------------------------

function ForgotForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Erro ao enviar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mx-auto mb-4">
            <Icon name="paper-plane" className="text-indigo-500 text-2xl" />
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Código enviado!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Se {email} estiver cadastrado, você receberá um código em breve.
          </p>
        </div>
        <button type="button" onClick={() => onSwitch("reset")} className={`${btnPrimary} w-full justify-center`}>
          <Icon name="key" /> Inserir código
        </button>
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="w-full text-sm text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Insira seu e-mail e enviaremos um código de 6 dígitos para redefinir sua senha.
      </p>
      <div>
        <FieldLabel>E-mail da conta</FieldLabel>
        <div className="relative">
          <Icon name="envelope" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className={`${inputCls} pl-9`}
          />
        </div>
      </div>
      <ErrorMsg msg={error} />
      <button type="submit" disabled={loading} className={`${btnPrimary} w-full justify-center`}>
        {loading
          ? <><Icon name="spinner" className="animate-spin" /> Enviando…</>
          : <><Icon name="paper-plane" /> Enviar código</>}
      </button>
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className="w-full text-sm text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Voltar ao login
      </button>
    </form>
  );
}

// -- Reset password ----------------------------------------------------------

function ResetForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw.length < 8) { setError("A nova senha deve ter ao menos 8 caracteres"); return; }
    if (newPw !== confirmPw) { setError("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      await resetPassword(email, code, newPw);
      setSuccess("Senha redefinida com sucesso!");
      setTimeout(() => onSwitch("login"), 2000);
    } catch {
      setError("Código inválido ou expirado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <FieldLabel>E-mail da conta</FieldLabel>
        <div className="relative">
          <Icon name="envelope" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className={`${inputCls} pl-9`}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Código de 6 dígitos</FieldLabel>
        <input
          type="text" required maxLength={6} pattern="\d{6}" inputMode="numeric"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
        />
        <p className="text-xs text-gray-400 mt-1">Verifique seu e-mail. O código expira em 15 minutos.</p>
      </div>
      <div>
        <FieldLabel>Nova senha</FieldLabel>
        <div className="relative">
          <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type={showPw ? "text" : "password"} required
            value={newPw} onChange={(e) => setNewPw(e.target.value)}
            placeholder="Mín. 8 caracteres" className={`${inputCls} pl-9 pr-10`}
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Icon name={showPw ? "eye-slash" : "eye"} className="text-sm" />
          </button>
        </div>
      </div>
      <div>
        <FieldLabel>Confirmar nova senha</FieldLabel>
        <div className="relative">
          <Icon name="lock-open" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
          <input
            type={showPw ? "text" : "password"} required
            value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Repita a nova senha"
            className={`${inputCls} pl-9 ${
              confirmPw.length > 0
                ? newPw === confirmPw
                  ? "border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-300"
                  : "border-red-400 dark:border-red-600 ring-1 ring-red-300"
                : ""
            }`}
          />
          {confirmPw.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {newPw === confirmPw
                ? <Icon name="circle-check" className="text-emerald-500" />
                : <Icon name="circle-xmark" className="text-red-400" />}
            </span>
          )}
        </div>
      </div>
      <ErrorMsg msg={error} />
      <SuccessMsg msg={success} />
      <button
        type="submit"
        disabled={loading || (confirmPw.length > 0 && newPw !== confirmPw)}
        className={`${btnPrimary} w-full justify-center`}
      >
        {loading
          ? <><Icon name="spinner" className="animate-spin" /> Redefinindo…</>
          : <><Icon name="key" /> Redefinir senha</>}
      </button>
      <button
        type="button"
        onClick={() => onSwitch("forgot")}
        className="w-full text-sm text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Reenviar código
      </button>
    </form>
  );
}

// -- Verify notice -----------------------------------------------------------

function VerifyNotice() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto">
        <Icon name="envelope-open" className="text-amber-500 text-2xl" />
      </div>
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">Confirme seu e-mail</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Enviamos um link de confirmação para <strong>{user?.email}</strong>.
          <br />Clique no link para ativar sua conta.
        </p>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Pode continuar usando o CodeCompass enquanto isso — algumas funcionalidades podem ficar restritas até a confirmação.
      </p>
    </div>
  );
}

// -- View configs ------------------------------------------------------------

const VIEW_CONFIG: Record<View, { title: string; subtitle: string }> = {
  login:         { title: "Bem-vindo de volta",   subtitle: "Acesse sua conta" },
  signup:        { title: "Criar conta",          subtitle: "Comece a explorar seu código com IA" },
  forgot:        { title: "Recuperar senha",      subtitle: "Vamos te ajudar a entrar de volta" },
  reset:         { title: "Nova senha",           subtitle: "Insira o código enviado por e-mail" },
  verify_notice: { title: "Verifique seu e-mail", subtitle: "Quase lá!" },
};

// -- Dark mode hook ----------------------------------------------------------

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return { dark, toggle };
}

// -- Main AuthPage -----------------------------------------------------------

export function AuthPage() {
  const [view, setView] = useState<View>("login");
  const { dark, toggle } = useDarkMode();
  const cfg = VIEW_CONFIG[view];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl" />
      </div>

      {/* Dark mode toggle */}
      <button
        type="button"
        onClick={toggle}
        title={dark ? "Modo claro" : "Modo escuro"}
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <motion.div
          key={dark ? "sun" : "moon"}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Icon name={dark ? "sun" : "moon"} className="text-sm" />
        </motion.div>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 mb-3">
            <Icon name="compass" className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">CodeCompass</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Navegue seu código com IA</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Card header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-50 dark:border-gray-800">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                variants={slideUp}
                initial="hidden"
                animate="show"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{cfg.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{cfg.subtitle}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card body */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                variants={slideInRight}
                initial="hidden"
                animate="show"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              >
                {view === "login"         && <LoginForm onSwitch={setView} />}
                {view === "signup"        && <SignupForm onSwitch={setView} />}
                {view === "forgot"        && <ForgotForm onSwitch={setView} />}
                {view === "reset"         && <ResetForm onSwitch={setView} />}
                {view === "verify_notice" && <VerifyNotice />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          <Icon name="shield-halved" className="mr-1" />
          Seus dados são protegidos e nunca compartilhados.
        </p>
      </motion.div>
    </div>
  );
}
