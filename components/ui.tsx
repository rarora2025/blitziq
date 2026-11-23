"use client";

import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { team } from "@/lib/teams";
import { CheckIcon, CopyIcon, ShareIcon, XIcon } from "./icons";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={cx("font-sans font-extrabold tracking-[-0.06em] leading-none select-none", className)}>
      blitz<span className="text-volt">.</span>
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "lg" | "md" | "sm";
  loading?: boolean;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "lg", loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "relative inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap",
        "transition-[transform,background-color,color,opacity,box-shadow] duration-150 ease-out active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt",
        size === "lg" && "h-14 px-6 rounded-2xl text-[17px]",
        size === "md" && "h-11 px-4 rounded-xl text-[15px]",
        size === "sm" && "h-9 px-3 rounded-lg text-sm",
        variant === "primary" &&
          "bg-volt text-volt-ink hover:bg-[#ddff66] disabled:bg-raised-2 disabled:text-mute shadow-[0_0_0_1px_rgb(212_255_63/0.4),0_8px_30px_-12px_rgb(212_255_63/0.55)] disabled:shadow-none",
        variant === "secondary" && "bg-raised-2 text-fg hover:bg-[#28282d] disabled:text-mute",
        variant === "ghost" && "text-dim hover:text-fg hover:bg-white/5 disabled:opacity-40",
        variant === "danger" && "bg-miss/10 text-miss hover:bg-miss/15",
        block && "w-full",
        className,
      )}
      {...rest}
    >
      <span className={cx("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </button>
  );
});

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cx("inline-block size-5 rounded-full border-2 border-current border-r-transparent animate-spin", className)}
      aria-label="Loading"
    />
  );
}

const AVATAR_TONES = [
  ["#1d2b40", "#9fc2ff"],
  ["#1b3530", "#8fe0c8"],
  ["#3a2a1b", "#f2c08a"],
  ["#3a1f24", "#ffa3ad"],
  ["#2c331b", "#cfe58f"],
  ["#2a2a30", "#d4d4dc"],
  ["#1c3038", "#8ed6f0"],
  ["#382b1f", "#e9c9a6"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return s.toUpperCase();
}

export function Avatar({
  name,
  size = 40,
  me,
  dim,
  className = "",
}: {
  name: string;
  size?: number;
  me?: boolean;
  dim?: boolean;
  className?: string;
}) {
  const [bg, fg] = AVATAR_TONES[hash(name) % AVATAR_TONES.length];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight transition-opacity",
        me && "ring-2 ring-volt ring-offset-2 ring-offset-ink",
        dim && "opacity-35",
        className,
      )}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function TeamChip({ name, size = "md", logo }: { name: string; size?: "sm" | "md" | "lg"; logo?: string | null }) {
  const t = team(name);
  if (logo) return <Pic src={logo} size={size === "sm" ? 22 : size === "md" ? 28 : 40} rounded="xl" />;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cx(
          "inline-flex items-center justify-center rounded-md font-display font-bold tracking-wide text-white",
          size === "sm" && "h-5 min-w-8 px-1 text-[11px]",
          size === "md" && "h-7 min-w-11 px-1.5 text-sm",
          size === "lg" && "h-10 min-w-14 px-2 text-lg",
        )}
        style={{ background: t.color, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.12)" }}
      >
        {t.abbr}
      </span>
    </span>
  );
}

/** Broadcast-style matchup line: AWAY @ HOME */
export function Matchup({
  home,
  away,
  size = "md",
  homeLogo,
  awayLogo,
}: {
  home: string;
  away: string;
  size?: "sm" | "md" | "lg";
  homeLogo?: string | null;
  awayLogo?: string | null;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center font-semibold tracking-tight",
        size === "sm" && "gap-1.5 text-sm",
        size === "md" && "gap-2.5 text-base",
        size === "lg" && "gap-3 text-xl",
      )}
    >
      <TeamChip name={away} size={size} logo={awayLogo} />
      <span>{away}</span>
      <span className="text-mute font-normal">at</span>
      <span>{home}</span>
      <TeamChip name={home} size={size} logo={homeLogo} />
    </span>
  );
}

export function QuarterTag({ quarter, live, className = "" }: { quarter: number; live?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-display font-bold text-[15px] tracking-wider",
        live ? "bg-volt text-volt-ink" : "bg-raised-2 text-fg",
        className,
      )}
    >
      {live && <span className="size-1.5 rounded-full bg-volt-ink pulse-dot" />}Q{quarter}
      {live && <span className="text-[12px] tracking-[0.14em]">LIVE</span>}
    </span>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("text-[12px] font-semibold uppercase tracking-[0.14em] text-mute", className)}>{children}</div>
  );
}

export function inviteUrl(code: string) {
  if (typeof window === "undefined") return `/j/${code}`;
  return `${window.location.origin}/j/${code}`;
}

export function InviteButton({ code, compact }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = inviteUrl(code);
    const canShare = typeof navigator !== "undefined" && "share" in navigator && /Mobi|iPhone|Android/i.test(navigator.userAgent);
    if (canShare) {
      try {
        await navigator.share({ title: "Join my blitz. lobby", text: `Lobby code ${code}`, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={share}
      className={cx(
        "group inline-flex items-center gap-2.5 rounded-xl bg-raised hover:bg-raised-2 transition-colors active:scale-[0.97]",
        compact ? "h-9 pl-3 pr-2.5" : "h-11 pl-4 pr-3",
      )}
    >
      <span className={cx("font-display font-bold tracking-[0.2em]", compact ? "text-base" : "text-lg")}>{code}</span>
      <span className="text-dim group-hover:text-fg transition-colors">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "ok" : "share"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            {copied ? <CheckIcon size={18} className="text-volt" /> : compact ? <CopyIcon size={16} /> : <ShareIcon size={18} />}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-50 left-1/2 -translate-x-1/2 bottom-[max(1.25rem,env(safe-area-inset-bottom))] w-[min(92vw,420px)]"
          role="status"
        >
          <div className="flex items-start gap-3 rounded-2xl bg-raised-2 border border-line-strong px-4 py-3.5 shadow-2xl">
            <span className="mt-0.5 size-2 shrink-0 rounded-full bg-miss" />
            <p className="flex-1 text-[15px] leading-snug">{message}</p>
            <button onClick={onClose} className="text-mute hover:text-fg -mr-1" aria-label="Dismiss">
              <XIcon size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" initial="a" animate="b" exit="a">
          <motion.div
            className="absolute inset-0 bg-black/70"
            variants={{ a: { opacity: 0 }, b: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            variants={{ a: { y: 40, opacity: 0 }, b: { y: 0, opacity: 1 } }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={cx(
              "relative w-full max-h-[92dvh] flex flex-col bg-panel border border-line-strong rounded-t-3xl sm:rounded-3xl shadow-2xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 pt-5 pb-3">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="size-9 -mr-1.5 rounded-full flex items-center justify-center text-dim hover:text-fg hover:bg-white/5"
                aria-label="Close"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 sm:px-6 pb-6 safe-b">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-dim mb-2">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-mute mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-13 rounded-xl bg-raised border border-line px-4 text-[17px] text-fg placeholder:text-mute outline-none transition-colors focus:border-volt/60 focus:bg-raised-2";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-raised gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "relative h-8 px-3 rounded-lg text-sm font-semibold transition-colors",
            value === o.value ? "text-fg" : "text-mute hover:text-dim",
          )}
        >
          {value === o.value && (
            <motion.span layoutId="seg" className="absolute inset-0 rounded-lg bg-raised-2" transition={{ duration: 0.25 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center h-7 px-3 rounded-full bg-volt/[0.12] text-volt text-[11.5px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset ring-volt/25">
      {children}
    </span>
  );
}

/** What a question is worth: 10 / 50 normally, 20 / 100 as a Lock. */
export function Worth({ locked, className = "" }: { locked?: boolean; className?: string }) {
  const [base, solo] = locked ? [20, 100] : [10, 50];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-medium", locked ? "text-volt" : "text-dim", className)}>
      <span className={cx("inline-flex items-center h-6 px-2 rounded-md font-display font-bold text-[15px] tracking-wide tnum", locked ? "bg-volt text-volt-ink" : "bg-raised-2 text-fg")}>
        {base} PTS
      </span>
      <span>
        if right / <span className={cx("font-semibold tnum", locked ? "text-volt" : "text-fg")}>{solo}</span> if you&apos;re the only one
      </span>
    </span>
  );
}

/** An option's picture: its own image, or the team logo when the answer is a team. */
export function optionImage(o: { label: string; image?: string }, lobby: { home: string; away: string; homeLogo: string | null; awayLogo: string | null }) {
  if (o.image) return o.image;
  const l = o.label.toLowerCase();
  if (l === lobby.home.toLowerCase()) return lobby.homeLogo;
  if (l === lobby.away.toLowerCase()) return lobby.awayLogo;
  return null;
}

export function Pic({ src, size = 40, rounded = "full", className = "" }: { src: string; size?: number; rounded?: "full" | "xl"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
      className={cx("shrink-0 object-cover bg-raised-2", rounded === "full" ? "rounded-full" : "rounded-xl", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Downscale a picked photo to a small square webp data URL so it can live with the question. */
export async function shrinkImage(file: File, size = 160): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
    const webp = canvas.toDataURL("image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload a photo or paste an image link. Shows the current picture as the button. */
export function ImageField({
  value,
  onChange,
  size = 52,
  label = "Add picture",
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  size?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      onChange(await shrinkImage(f));
      setOpen(false);
      setErr(null);
    } catch {
      setErr("Couldn't read that image.");
    }
  };
  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        title={label}
        className={cx(
          "shrink-0 rounded-xl flex items-center justify-center overflow-hidden transition-colors",
          value ? "" : "border border-dashed border-line-strong text-mute hover:text-fg hover:border-fg/40",
          open && "ring-2 ring-volt/60",
        )}
        style={{ width: size, height: size }}
      >
        {value ? (
          <Pic src={value} size={size} rounded="xl" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
            <circle cx="9" cy="10" r="1.8" />
            <path d="M20.5 16l-5-5-8.5 8.5" />
          </svg>
        )}
      </button>
      {open && (
        <div className="order-last basis-full w-full rounded-xl bg-raised border border-line p-3 space-y-2">
          <div className="flex gap-2">
            <label className="h-10 px-3 rounded-lg bg-raised-2 hover:bg-[#2a2a30] text-[14px] font-semibold inline-flex items-center cursor-pointer">
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {value && (
              <button type="button" onClick={() => (onChange(null), setOpen(false))} className="h-10 px-3 rounded-lg text-[14px] font-semibold text-mute hover:text-miss">
                Remove
              </button>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!/^https:\/\/\S+$/.test(link.trim())) return setErr("Paste an https:// image link.");
              onChange(link.trim());
              setLink("");
              setErr(null);
              setOpen(false);
            }}
          >
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="or paste an image link"
              className="flex-1 min-w-0 h-10 rounded-lg bg-ink/50 border border-line px-3 text-[14px] outline-none focus:border-volt/60"
            />
            <button type="submit" className="h-10 px-3 rounded-lg bg-raised-2 text-[14px] font-semibold">
              Use
            </button>
          </form>
          {err && <p className="text-[13px] text-miss">{err}</p>}
        </div>
      )}
    </div>
  );
}
