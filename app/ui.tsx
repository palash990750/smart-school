'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertCircle, Check, LoaderCircle, RotateCw } from 'lucide-react';

export function LoadingPage({ label = 'Loading school records…' }: { label?: string }) {
  return <main className="min-h-[100dvh] grid place-items-center p-6"><div className="w-full max-w-3xl space-y-4">
    <div className="flex items-center gap-3 mb-8"><div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold">S</div><span className="display text-xl font-bold">Smart School</span></div>
    <div className="skeleton h-8 w-56"/><div className="skeleton h-4 w-80"/><div className="grid grid-cols-2 gap-3 pt-5"><div className="skeleton h-28"/><div className="skeleton h-28"/></div>
    <p className="pt-2 text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
  </div></main>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-xl border border-[hsl(var(--destructive)/.28)] bg-[hsl(var(--destructive)/.05)] p-5 text-sm">
    <div className="flex gap-3"><AlertCircle className="mt-0.5 size-5 text-[hsl(var(--destructive))]"/><div className="flex-1"><p className="font-semibold">Couldn't load this view</p><p className="mt-1 text-[hsl(var(--muted-foreground))]">{message}</p><button onClick={retry} className="mt-3 inline-flex items-center gap-2 font-semibold text-[hsl(var(--primary))]"><RotateCw size={15}/> Try again</button></div></div>
  </div>;
}

export function Notice({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'error' }) {
  return <div role="status" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{tone === 'success' ? <Check size={16}/> : <AlertCircle size={16}/>} {children}</div>;
}

export function Button({ children, busy, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: 'primary' | 'outline' | 'danger' }) {
  const styles = variant === 'primary' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-95' : variant === 'danger' ? 'bg-rose-700 text-white hover:bg-rose-800' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]';
  return <button {...props} disabled={busy || props.disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${styles} ${props.className || ''}`}>{busy && <LoaderCircle size={15} className="animate-spin"/>}{children}</button>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="grid gap-1.5 text-sm font-medium text-[hsl(var(--foreground))]"><span>{label}</span>{children}{hint && <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">{hint}</span>}</label>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-5 text-center"><div><div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">—</div><h3 className="display font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

export function PageTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="display text-3xl font-extrabold tracking-tight md:text-[2.1rem]">{title}</h1>{detail && <p className="mt-1.5 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>}</div>{action}</div>;
}

export function Money({ value }: { value: number }) {
  return <>₹{Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</>;
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold hover:bg-[hsl(var(--muted))]">{children}</Link>;
}