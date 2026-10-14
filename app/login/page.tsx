'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BookOpen, LockKeyhole } from 'lucide-react';
import { Button, LoadingPage, Notice } from '../ui';

const inputClass = 'h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  if (status === 'authenticated') { router.replace('/dashboard'); return <LoadingPage label="Opening your workspace…"/>; }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    const data = new FormData(event.currentTarget);
    const result = await signIn('credentials', { email: String(data.get('email')), password: String(data.get('password')), redirect: false });
    setPending(false);
    if (result?.error) setError('That email and password combination did not match.');
    else router.replace('/dashboard');
  }
  return <main className="min-h-[100dvh] grid place-items-center bg-[radial-gradient(ellipse_at_85%_10%,hsl(var(--accent)/.45),transparent_37%)] px-4 py-10">
    <div className="w-full max-w-[430px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[0_24px_80px_-48px_hsl(var(--foreground)/.3)] md:p-9">
      <div className="mb-9 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><BookOpen size={21}/></div><div><div className="display text-lg font-extrabold">Smart School</div><div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Operations desk</div></div></div>
      <div className="mb-6"><div className="mb-2 grid size-9 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><LockKeyhole size={17}/></div><h1 className="display text-2xl font-extrabold">Welcome back</h1><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Sign in to continue to your school workspace.</p></div>
      <form onSubmit={submit} className="space-y-4"><label className="grid gap-1.5 text-sm font-medium">Email address<input name="email" type="email" required autoComplete="username" className={inputClass} placeholder="you@school.edu"/></label><label className="grid gap-1.5 text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" className={inputClass} placeholder="Your password"/></label>{error && <Notice tone="error">{error}</Notice>}<Button busy={pending} type="submit" className="w-full">Sign in</Button></form>
      <div className="mt-6 border-t border-[hsl(var(--border))] pt-5 text-center text-xs text-[hsl(var(--muted-foreground))]"><Link href="/setup" className="font-semibold text-[hsl(var(--primary))] hover:underline">Set up a new school</Link></div>
    </div>
  </main>;
}