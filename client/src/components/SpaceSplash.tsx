import { motion, useReducedMotion } from "framer-motion";
import { Orbit, Sparkles } from "lucide-react";

const studyVerseIconUrl = "/manus-storage/IMG_0856_ab3fdaa7.jpeg";

const stars = [
  { left: "8%", top: "16%", size: "h-1 w-1", delay: 0.3 },
  { left: "20%", top: "30%", size: "h-1.5 w-1.5", delay: 1.1 },
  { left: "12%", top: "72%", size: "h-1 w-1", delay: 1.6 },
  { left: "29%", top: "10%", size: "h-1 w-1", delay: 0.8 },
  { left: "78%", top: "17%", size: "h-1.5 w-1.5", delay: 0.5 },
  { left: "89%", top: "40%", size: "h-1 w-1", delay: 1.4 },
  { left: "76%", top: "76%", size: "h-1 w-1", delay: 0.9 },
  { left: "89%", top: "82%", size: "h-1.5 w-1.5", delay: 1.9 },
] as const;

export function SpaceLoadingIndicator({ label = "読み込み中…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <motion.span
        aria-hidden="true"
        className="relative grid h-5 w-5 place-items-center rounded-full border border-sky-200/70"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
      >
        <span className="absolute -right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-violet-200 shadow-[0_0_8px_rgba(196,181,253,0.9)]" />
      </motion.span>
      <span>{label}</span>
    </span>
  );
}

export function SpaceLoadingPanel({ label = "学習空間を準備中…" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-live="polite"
      aria-label={label}
      className="relative overflow-hidden rounded-3xl border border-sky-100 bg-[radial-gradient(circle_at_50%_0%,#eff8ff_0%,#f8fafc_50%,#f5f3ff_100%)] px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-[radial-gradient(circle_at_50%_0%,#13294b_0%,#0b1025_50%,#11102a_100%)]"
    >
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/50"
        animate={reduceMotion ? undefined : { scale: [0.8, 1.1, 0.8], opacity: [0.2, 0.65, 0.2] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] bg-slate-950 shadow-[0_0_32px_rgba(96,165,250,0.28)]">
        <Orbit className="h-7 w-7 text-sky-200" aria-hidden="true" />
      </div>
      <p className="relative mt-5 text-sm font-semibold text-slate-800 dark:text-slate-100"><SpaceLoadingIndicator label={label} /></p>
      <p className="relative mt-2 text-xs text-slate-500 dark:text-slate-400">星図と学習記録を同期しています</p>
    </section>
  );
}

export function SpaceSplash({ visible }: { visible: boolean }) {
  const reduceMotion = useReducedMotion();

  if (!visible) return null;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="StudyVerseを起動しています"
      className="fixed inset-0 z-[110] grid min-h-dvh place-items-center overflow-hidden bg-[#050b20] px-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute -left-32 top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-sky-400/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 56, 0], y: [0, 28, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-36 -right-28 h-[30rem] w-[30rem] rounded-full bg-violet-500/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -30, 0], scale: [1.1, 0.95, 1.1] }}
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(59,130,246,0.2),transparent_33%),radial-gradient(circle_at_48%_42%,rgba(196,181,253,0.15),transparent_18%)]" />
      {stars.map(star => (
        <motion.span
          key={`${star.left}-${star.top}`}
          aria-hidden="true"
          className={`absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] ${star.size}`}
          style={{ left: star.left, top: star.top }}
          animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.8, 1.35, 0.8] }}
          transition={{ duration: 1.9, delay: star.delay, ease: "easeInOut", repeat: Infinity }}
        />
      ))}
      <div className="relative flex max-w-xs flex-col items-center text-center">
        <motion.div
          aria-hidden="true"
          className="absolute top-16 h-52 w-72 rounded-[50%] border border-sky-200/25"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        >
          <span className="absolute -right-1 top-1/2 h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_20px_rgba(196,181,253,0.9)]" />
        </motion.div>
        <motion.div
          className="relative z-10 h-28 w-28 overflow-hidden rounded-[2rem] border border-white/25 bg-slate-950 shadow-[0_0_40px_rgba(96,165,250,0.36)]"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
          <img src={studyVerseIconUrl} alt="StudyVerse" className="h-full w-full scale-[1.13] object-cover" />
        </motion.div>
        <motion.div
          className="relative z-10 mt-6"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, delay: 0.16, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.26em] text-sky-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />LEARNING UNIVERSE</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">StudyVerse</h1>
        </motion.div>
        <motion.div
          aria-hidden="true"
          className="relative z-10 mt-8 h-1 w-36 overflow-hidden rounded-full bg-white/15"
        >
          <motion.span
            className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 shadow-[0_0_12px_rgba(147,197,253,0.8)]"
            animate={reduceMotion ? { x: "70%" } : { x: ["-120%", "280%"] }}
            transition={{ duration: reduceMotion ? 0 : 1.25, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
