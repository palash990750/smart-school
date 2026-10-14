'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { getGetSetupStatusQueryKey, useCreateInitialAdministrator, useGetSetupStatus } from '@/lib/api-client-react';
import { Button, ErrorState, Field, LoadingPage, Notice } from '../ui';

const inputClass = 'h-11 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]';

export default function SetupPage() {
  const router = useRouter();
  const client = useQueryClient();
  const status = useGetSetupStatus();
  const create = useCreateInitialAdministrator();
  const [error, setError] = useState('');
  if (status.isLoading) return <LoadingPage label="Checking whether this school is ready…" />;
  if (status.isError) return <main className="mx-auto max-w-2xl p-6 pt-20"><ErrorState message="Setup status is unavailable right now." retry={() => status.refetch()}/></main>;
  if (!status.data?.needsSetup) return <main className="min-h-[100dvh] grid place-items-center p-6"><div className="max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-[hsl(var(--primary))]" size={32}/><h1 className="display text-2xl font-bold">Your school is already set up</h1><p className="my-2 text-sm text-[hsl(var(--muted-foreground))]">Initial setup can only be completed once.</p><Button onClick={() => router.replace('/login')}>Go to sign in <ArrowRight size={15}/></Button></div></main>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const payload = { schoolName: String(form.get('schoolName')).trim(), sessionName: String(form.get('sessionName')).trim(), administratorName: String(form.get('administratorName')).trim(), email: String(form.get('email')).trim(), password: String(form.get('password')) };
    create.mutate({ data: payload }, { onSuccess: async () => { await client.invalidateQueries({ queryKey: getGetSetupStatusQueryKey() }); router.replace('/login'); }, onError: () => setError('We couldn’t finish setup. Check the details and try again.') });
  }
  return <main className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_15%_0%,hsl(var(--accent)/.38),transparent_38%)] px-4 py-10 md:grid md:place-items-center">
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_80px_-40px_hsl(var(--foreground)/.25)] md:grid-cols-[.88fr_1.12fr]">
      <section className="flex min-h-60 flex-col justify-between bg-[hsl(var(--primary))] p-8 text-[hsl(var(--primary-foreground))] md:p-10">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><BookOpen size={21}/></div><span className="display font-bold">Smart School</span></div>
        <div className="py-8"><div className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] opacity-65">A steady start</div><h1 className="display max-w-sm text-4xl font-extrabold leading-[1.06]">One school.<br/>One clear record.</h1><p className="mt-4 max-w-sm text-sm leading-6 opacity-75">Set up your school workspace and connect your first academic session.</p></div>
        <div className="text-xs opacity-60">Private by design. Built for the daily work.</div>
      </section>
      <section className="p-6 md:p-10">
        <div className="mb-7"><div className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">Initial setup</div><h2 className="display mt-2 text-2xl font-extrabold">Create your school space</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">This creates the school profile and its first administrator.</p></div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="School name"><input className={inputClass} name="schoolName" required minLength={2} maxLength={120} placeholder="e.g. Cedar Grove School"/></Field>
          <Field label="Current academic session" hint="Use the name your staff already recognize."><input className={inputClass} name="sessionName" required minLength={4} maxLength={30} placeholder="2025–2026"/></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Administrator name"><input className={inputClass} name="administratorName" required minLength={2} maxLength={120} placeholder="Full name"/></Field><Field label="Work email"><input className={inputClass} name="email" required type="email" placeholder="you@school.edu"/></Field></div>
          <Field label="Password" hint="At least 12 characters."><input className={inputClass} name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" placeholder="Create a secure password"/></Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" busy={create.isPending} className="w-full">Create school workspace <ArrowRight size={16}/></Button>
        </form>
        <p className="mt-5 text-center text-[11px] text-[hsl(var(--muted-foreground))]">One-time setup. Your administrator account will have access to school operations.</p>
      </section>
    </div>
  </main>;
}