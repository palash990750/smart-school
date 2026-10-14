'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Eye, Pencil, Plus, Printer, Search, Users, UserRound, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  getGetAttendanceRegisterQueryKey,
  getGetDashboardQueryKey,
  getGetSchoolSettingsQueryKey,
  getGetStudentQueryKey,
  getListClassesQueryKey,
  getListFeeDuesQueryKey,
  getListPaymentsQueryKey,
  getListStudentsQueryKey,
  getListTeachersQueryKey,
  useArchiveStudent,
  useCreateClass,
  useCreateSection,
  useCreateStudent,
  useCreateTeacher,
  useDeleteTeacher,
  useGetAttendanceRegister,
  useGetDashboard,
  useGetSchoolSettings,
  useGetStudent,
  useListClasses,
  useListFeeDues,
  useListPayments,
  useListStudents,
  useListTeachers,
  useRecordPayment,
  useSaveAttendanceRegister,
  useUpdateSchoolSettings,
  useUpdateStudent,
  useUpdateTeacher,
} from '@/lib/api-client-react';
import type { AttendanceItemInputStatus as AttendanceStatus, Student, StudentInput } from '@/lib/api-client-react';
import { Button, EmptyState, ErrorState, Field, LinkButton, Money, Notice, PageTitle } from './ui';

const control = 'h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]';
const selectClass = `${control} cursor-pointer`;
const nowDate = () => new Date().toISOString().slice(0, 10);

function SearchBox({ value, onChange, placeholder = 'Search records…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block w-full sm:max-w-[320px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input aria-label={placeholder} value={value} onChange={e => onChange(e.target.value)} className={`${control} pl-9`} placeholder={placeholder} /></label>;
}

function TableFrame({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><table className="w-full min-w-[700px] border-collapse text-left text-sm">{children}</table></div>;
}
function Th({ children }: { children: ReactNode }) { return <th className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.65)] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{children}</th>; }
function Td({ children, className = '' }: { children: ReactNode; className?: string }) { return <td className={`border-b border-[hsl(var(--border)/.72)] px-4 py-3.5 ${className}`}>{children}</td>; }
function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = { active: 'bg-emerald-50 text-emerald-800', archived: 'bg-stone-100 text-stone-600', present: 'bg-emerald-50 text-emerald-800', absent: 'bg-rose-50 text-rose-800', late: 'bg-amber-50 text-amber-800', leave: 'bg-sky-50 text-sky-800', half_day: 'bg-orange-50 text-orange-800' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${map[value] || 'bg-stone-100 text-stone-700'}`}>{value.replace('_', ' ')}</span>;
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="
        fixed inset-0 z-[99999]
        flex items-center justify-center
        bg-slate-950/45
        p-3 sm:p-4
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="
          relative
          flex w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-2xl
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          shadow-2xl
          max-h-[calc(100vh-24px)]
          sm:max-h-[calc(100vh-32px)]
        "
      >
        {/* HEADER */}
        <div
          className="
            flex shrink-0
            items-center justify-between
            border-b border-[hsl(var(--border))]
            bg-[hsl(var(--card))]
            px-5 py-4
            sm:px-7 sm:py-5
          "
        >
          <h2
            id="modal-title"
            className="display text-xl font-extrabold"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={close}
            className="
              grid size-8 shrink-0
              place-items-center
              rounded-full
              text-lg
              text-[hsl(var(--muted-foreground))]
              transition
              hover:bg-[hsl(var(--muted))]
              hover:text-[hsl(var(--foreground))]
            "
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-5 py-5
            sm:px-7 sm:py-6
          "
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
function Metric({ label, value, foot, icon: Icon, accent = false }: { label: string; value: ReactNode; foot?: string; icon: typeof Users; accent?: boolean }) {
  return <div className={`rounded-xl border border-[hsl(var(--border))] p-4 md:p-5 ${accent ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--card))]'}`}><div className="flex items-center justify-between"><div className={`text-xs font-semibold ${accent ? 'opacity-70' : 'text-[hsl(var(--muted-foreground))]'}`}>{label}</div><Icon size={17} className={accent ? 'opacity-75' : 'text-[hsl(var(--primary))]'} /></div><div className="display mt-3 text-2xl font-extrabold">{value}</div>{foot && <div className={`mt-1.5 text-[11px] ${accent ? 'opacity-65' : 'text-[hsl(var(--muted-foreground))]'}`}>{foot}</div>}</div>;
}
function ErrorPanel({ error, retry }: { error: boolean; retry: () => void }) {
  return error ? <ErrorState message="The service could not return these records." retry={retry} /> : null;
}

export function DashboardPage() {
  const q = useGetDashboard();
  const data = q.data;
  if (q.isLoading) return <div className="page-in"><PageTitle eyebrow="Operations overview" title="Today at school" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-28" />)}</div></div>;
  if (q.isError || !data) return <ErrorPanel error retry={() => q.refetch()} />;
  const s = data.summary;
  return <div className="page-in">
    <PageTitle eyebrow="Operations overview" title="Today at school" detail={`A live view of attendance, people and collections · ${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} action={<LinkButton href="/attendance">Take attendance <ChevronRight size={15} /></LinkButton>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Enrolled students" value={s.students.toLocaleString()} foot={`${s.classes} active classes`} icon={Users} />
      <Metric label="Present today" value={s.presentToday.toLocaleString()} foot={`${s.absentToday} absent · ${s.lateToday} late`} icon={Check} accent />
      <Metric label="Teachers" value={s.teachers.toLocaleString()} foot={`${s.staff} additional staff`} icon={UserRound} />
      <Metric label="Outstanding fees" value={<Money value={s.outstandingFees} />} foot="Current student balances" icon={Wallet} />
      <Metric label="Collected today" value={<Money value={s.feeCollectedToday} />} foot="All recorded payment methods" icon={CircleDollarSign} />
      <Metric label="Collected this month" value={<Money value={s.feeCollectedMonth} />} foot="Session-to-date ledger" icon={ArrowUpRight} />
      <Metric label="Expenses this month" value={<Money value={s.expensesMonth} />} foot="Month to date" icon={ArrowDownRight} />
      <Metric label="School classes" value={s.classes.toLocaleString()} foot="Current academic session" icon={Activity} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:p-5"><div className="mb-5 flex items-start justify-between"><div><h2 className="display font-bold">Attendance rhythm</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Present students across recent school days</p></div><CalendarDays size={18} className="text-[hsl(var(--primary))]" /></div>
        {data.attendanceTrend.length ? <div className="h-[245px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.attendanceTrend}><defs><linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(174 37% 27%)" stopOpacity={.22} /><stop offset="100%" stopColor="hsl(174 37% 27%)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="hsl(39 20% 86%)" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#747d80' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#747d80' }} width={34} /><Tooltip /><Area type="monotone" dataKey="value" stroke="hsl(174 37% 27%)" strokeWidth={2.5} fill="url(#attFill)" /></AreaChart></ResponsiveContainer></div> : <EmptyState title="Attendance trend will appear here" detail="Once attendance has been recorded for the session, the daily rhythm will take shape." />}
      </section>
      <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:p-5"><div className="mb-5 flex items-start justify-between"><div><h2 className="display font-bold">Fee collections</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Recent collection trend</p></div><CircleDollarSign size={18} className="text-[hsl(var(--primary))]" /></div>
        {data.feeCollectionTrend.length ? <div className="h-[245px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.feeCollectionTrend}><CartesianGrid stroke="hsl(39 20% 86%)" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#747d80' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#747d80' }} width={42} /><Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Collected']} /><Bar dataKey="value" fill="hsl(37 68% 59%)" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No collection data yet" detail="Payment activity will populate this chart." />}
      </section>
    </div>
    <section className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="display font-bold">Students by class</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Current session enrolment</p></div><Link href="/academics/classes" className="text-xs font-bold text-[hsl(var(--primary))]">Manage classes <ChevronRight className="inline" size={14} /></Link></div>
      {data.classCounts.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{data.classCounts.map(row => <div key={row.className} className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted)/.58)] px-4 py-3"><span className="text-sm font-medium">{row.className}</span><span className="mono text-sm font-semibold">{row.count}</span></div>)}</div> : <EmptyState title="No class enrolment recorded" detail="Add classes and sections to see the school's current distribution." action={<LinkButton href="/academics/classes">Set up classes</LinkButton>} />}</section>
  </div>;
}

function StudentForm({ student, close, afterSave }: { student?: Student; close: () => void; afterSave: () => void }) {
  const classesQ = useListClasses();
  const create = useCreateStudent();
  const update = useUpdateStudent();
  const [error, setError] = useState('');
  const [sectionId, setSectionId] = useState(student?.sectionId || '');
  const [classId, setClassId] = useState(student?.classId || '');
  const selectedClass = classesQ.data?.find(c => c.id === classId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const form = event.currentTarget;
    const f = new FormData(form);

    try {
      // =========================================================
      // PHOTO UPLOAD
      // =========================================================

      let photoUrl = student?.photoUrl || null;

      const photoFile = f.get('photo');

      if (photoFile instanceof File && photoFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('photo', photoFile);

        const uploadResponse = await fetch('/api/students/photo', {
          method: 'POST',
          body: uploadData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadResult.photoUrl) {
          throw new Error(
            uploadResult?.error || 'Student photo upload failed.'
          );
        }

        photoUrl = uploadResult.photoUrl;
      }

      // =========================================================
      // STUDENT DATA
      // =========================================================

      const payload = {
        admissionNumber:
          String(f.get('admissionNumber') || '').trim(),

        rollNumber:
          String(f.get('rollNumber') || '').trim() || null,

        firstName:
          String(f.get('firstName') || '').trim(),

        lastName:
          String(f.get('lastName') || '').trim(),

        dateOfBirth:
          String(f.get('dateOfBirth') || '') || null,

        gender:
          (String(f.get('gender') || '') || null) as StudentInput['gender'],

        email:
          String(f.get('email') || '') || null,

        phone:
          String(f.get('phone') || '') || null,

        classId:
          String(f.get('classId') || ''),

        sectionId:
          String(f.get('sectionId') || ''),

        parentName:
          String(f.get('parentName') || '') || null,

        parentPhone:
          String(f.get('parentPhone') || '') || null,

        photoUrl,

        fatherName:
          String(f.get('fatherName') || '') || null,

        fatherPhone:
          String(f.get('fatherPhone') || '') || null,

        fatherOccupation:
          String(f.get('fatherOccupation') || '') || null,

        motherName:
          String(f.get('motherName') || '') || null,

        motherPhone:
          String(f.get('motherPhone') || '') || null,

        motherOccupation:
          String(f.get('motherOccupation') || '') || null,

        bloodGroup:
          String(f.get('bloodGroup') || '') || null,

        address:
          String(f.get('address') || '') || null,

        idNumber:
          String(f.get('idNumber') || '') || null,

        admissionDate:
          String(f.get('admissionDate') || '') || null,

        previousSchool:
          String(f.get('previousSchool') || '') || null,

        emergencyContact:
          String(f.get('emergencyContact') || '') || null,

        medicalNotes:
          String(f.get('medicalNotes') || '') || null,

        feeAmount:
          Number(f.get('feeAmount') || 0),
      };

      // =========================================================
      // UPDATE
      // =========================================================

      if (student) {
        update.mutate(
          {
            id: student.id,
            data: payload,
          },
          {
            onSuccess: () => {
              afterSave();
            },
            onError: (err: any) => {
              console.error('UPDATE STUDENT ERROR:', err);

              setError(
                err?.message ||
                'Student changes were not saved. Please try again.'
              );
            },
          }
        );

        return;
      }

      // =========================================================
      // CREATE
      // =========================================================

      create.mutate(
        {
          data: payload as StudentInput,
        },
        {
          onSuccess: () => {
            afterSave();
          },

          onError: (err: any) => {
            console.error('CREATE STUDENT ERROR:', err);

            const message =
              err?.response?.data?.error ||
              err?.data?.error ||
              err?.message ||
              'Student could not be created.';

            setError(String(message));
          },
        }
      );
    } catch (err: any) {
      console.error('STUDENT FORM ERROR:', err);

      setError(
        err?.message ||
        'Something went wrong while saving the student.'
      );
    }
  }
  return (
    <Modal
      title={student ? 'Edit student record' : 'Add student'}
      close={close}
    >
      <form
        onSubmit={submit}
        className="grid gap-6 sm:grid-cols-2"
      >

        {/* =====================================================
          STUDENT INFORMATION
          ===================================================== */}

        <div className="sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Student information
          </div>

          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Basic identity and academic information.
          </div>
        </div>

        <Field label="Admission number">
          <input
            name="admissionNumber"
            required
            maxLength={40}
            defaultValue={student?.admissionNumber}
            className={control}
          />
        </Field>

        <Field label="Admission date">
          <input
            name="admissionDate"
            type="date"
            defaultValue={student?.admissionDate || ''}
            className={control}
          />
        </Field>

        <Field label="First name">
          <input
            name="firstName"
            required
            maxLength={80}
            defaultValue={student?.firstName}
            className={control}
          />
        </Field>

        <Field label="Last name">
          <input
            name="lastName"
            required
            maxLength={80}
            defaultValue={student?.lastName}
            className={control}
          />
        </Field>

        <Field label="Date of birth">
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={student?.dateOfBirth || ''}
            className={control}
          />
        </Field>

        <Field label="Gender">
          <select
            name="gender"
            defaultValue={student?.gender || ''}
            className={selectClass}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Blood group">
          <select
            name="bloodGroup"
            defaultValue={student?.bloodGroup || ''}
            className={selectClass}
          >
            <option value="">Not specified</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </Field>

        <Field label="Aadhaar / ID number">
          <input
            name="idNumber"
            maxLength={80}
            defaultValue={student?.idNumber || ''}
            className={control}
            placeholder="Optional"
          />
        </Field>

        <Field label="Student photo">
          <div className="space-y-2">
            <input
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={control}
            />

            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              JPG, PNG or WEBP · Maximum 2 MB
            </p>

            {student?.photoUrl && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={student.photoUrl}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="h-16 w-16 rounded-xl object-cover ring-1 ring-[hsl(var(--border))]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />

                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  Existing photo
                </span>
              </div>
            )}
          </div>
        </Field>

        <Field label="Roll Number">
          <input
            name="rollNumber"
            type="text"
            defaultValue={student?.rollNumber ?? ''}
            placeholder={
              student
                ? 'Enter roll number'
                : 'Auto generated'
            }
            className={control}
          />

          {!student && (
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Roll number will be generated automatically.
            </p>
          )}
        </Field>

        {/* =====================================================
          CONTACT
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Contact information
          </div>

          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Student contact and emergency information.
          </div>
        </div>

        <Field label="Student phone">
          <input
            name="phone"
            maxLength={40}
            defaultValue={student?.phone || ''}
            className={control}
          />
        </Field>

        <Field label="Email">
          <input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={student?.email || ''}
            className={control}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Full address">
            <textarea
              name="address"
              rows={3}
              maxLength={500}
              defaultValue={student?.address || ''}
              className={`${control} h-auto py-2.5`}
              placeholder="House / village / road / district / state"
            />
          </Field>
        </div>

        <Field label="Emergency contact">
          <input
            name="emergencyContact"
            maxLength={40}
            defaultValue={student?.emergencyContact || ''}
            className={control}
            placeholder="Name + phone"
          />
        </Field>

        {/* =====================================================
          FATHER
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Father information
          </div>
        </div>

        <Field label="Father's name">
          <input
            name="fatherName"
            maxLength={160}
            defaultValue={student?.fatherName || ''}
            className={control}
          />
        </Field>

        <Field label="Father's phone">
          <input
            name="fatherPhone"
            maxLength={40}
            defaultValue={student?.fatherPhone || ''}
            className={control}
          />
        </Field>

        <Field label="Father's occupation">
          <input
            name="fatherOccupation"
            maxLength={120}
            defaultValue={student?.fatherOccupation || ''}
            className={control}
          />
        </Field>

        {/* =====================================================
          MOTHER
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Mother information
          </div>
        </div>

        <Field label="Mother's name">
          <input
            name="motherName"
            maxLength={160}
            defaultValue={student?.motherName || ''}
            className={control}
          />
        </Field>

        <Field label="Mother's phone">
          <input
            name="motherPhone"
            maxLength={40}
            defaultValue={student?.motherPhone || ''}
            className={control}
          />
        </Field>

        <Field label="Mother's occupation">
          <input
            name="motherOccupation"
            maxLength={120}
            defaultValue={student?.motherOccupation || ''}
            className={control}
          />
        </Field>

        {/* =====================================================
          ACADEMIC
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Academic information
          </div>

          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Current enrolment and previous school information.
          </div>
        </div>

        <Field label="Class">
          <select
            name="classId"
            required
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
            }}
            className={selectClass}
          >
            <option value="">Choose class</option>

            {classesQ.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Section">
          <select
            name="sectionId"
            required
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className={selectClass}
          >
            <option value="">Choose section</option>

            {selectedClass?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Previous school">
          <input
            name="previousSchool"
            maxLength={250}
            defaultValue={student?.previousSchool || ''}
            className={control}
          />
        </Field>

        <Field label="Annual fee">
          <input
            name="feeAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={student?.feeAmount ?? 0}
            className={control}
          />
        </Field>

        {/* =====================================================
          OLD PARENT / GUARDIAN FIELDS
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Parent / guardian
          </div>
        </div>

        <Field label="Parent / guardian">
          <input
            name="parentName"
            maxLength={160}
            defaultValue={student?.parentName || ''}
            className={control}
          />
        </Field>

        <Field label="Parent phone">
          <input
            name="parentPhone"
            maxLength={40}
            defaultValue={student?.parentPhone || ''}
            className={control}
          />
        </Field>

        {/* =====================================================
          MEDICAL
          ===================================================== */}

        <div className="mt-2 sm:col-span-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
            Medical information
          </div>
        </div>

        <div className="sm:col-span-2">
          <Field label="Medical notes">
            <textarea
              name="medicalNotes"
              rows={3}
              maxLength={1000}
              defaultValue={student?.medicalNotes || ''}
              className={`${control} h-auto py-2.5`}
              placeholder="Allergies, medical conditions or other important notes"
            />
          </Field>
        </div>

        {/* =====================================================
          ERROR
          ===================================================== */}

        {error && (
          <div className="sm:col-span-2">
            <Notice tone="error">
              {error}
            </Notice>
          </div>
        )}

        {/* =====================================================
          ACTIONS
          ===================================================== */}

        <div
          className="
          flex justify-end gap-2
          border-t border-[hsl(var(--border))]
          pt-5
          sm:col-span-2
        "
        >
          <Button
            type="button"
            variant="outline"
            onClick={close}
          >
            Cancel
          </Button>

          <Button
            busy={create.isPending || update.isPending}
            type="submit"
          >
            {student ? 'Save changes' : 'Create student'}
          </Button>
        </div>

      </form>
    </Modal>
  );
}

export function StudentsPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [modal, setModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const classes = useListClasses();
  const query = useListStudents({ search: search || undefined, classId: classId || undefined, status: 'active' });
  const archive = useArchiveStudent();
  const [notice, setNotice] = useState('');
  function refresh() { void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getListFeeDuesQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setModal(false); setNotice('Student record saved.'); }
  return (
    <div className="page-in">

      

      <PageTitle
        eyebrow="Student records"
        title="Students"
        detail="One dependable register for the people at the heart of school."
        action={
          <Button
            onClick={() => {
              setEditingStudent(null);
              setModal(true);
            }}
          >
            <Plus size={16} />
            Add student
          </Button>
        }
      />

      {/* =====================================================
        SEARCH / FILTER
        ===================================================== */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">

        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search name, admission no. or phone..."
        />

        <select
          value={classId}
          onChange={(e) =>
            setClassId(e.target.value)
          }
          className={`${selectClass} sm:max-w-[220px]`}
        >
          <option value="">
            All classes
          </option>

          {classes.data?.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name}
            </option>
          ))}
        </select>

        <div className="ml-auto self-center text-xs text-[hsl(var(--muted-foreground))]">
          {query.data?.total ?? 0} students
        </div>

      </div>

      {/* =====================================================
        NOTICE
        ===================================================== */}

      {notice && (
        <div className="mb-4">
          <Notice
            tone={
              notice.startsWith("Could not")
                ? "error"
                : "success"
            }
          >
            {notice}
          </Notice>
        </div>
      )}

      {/* =====================================================
        ERROR
        ===================================================== */}

      <ErrorPanel
        error={query.isError}
        retry={() => query.refetch()}
      />

      {/* =====================================================
        STUDENT TABLE
        ===================================================== */}

      {query.isLoading ? (

        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              className="skeleton h-14"
              key={i}
            />
          ))}
        </div>

      ) : query.data?.items.length ? (

        <TableFrame>

          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Admission no.</Th>
              <Th>Class / section</Th>
              <Th>Guardian</Th>
              <Th>Annual fee</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>

            {query.data.items.map((s) => (

              <tr
                key={s.id}
                className="hover:bg-[hsl(var(--muted)/.42)]"
              >

                {/* ==========================================
                  STUDENT
                  ========================================== */}

                <Td>

                  <div className="flex items-center gap-3">

                    {/* PHOTO */}

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={`${s.firstName} ${s.lastName}`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-500">
                          {s.firstName?.charAt(0)?.toUpperCase() || "S"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">

                      <Link
                        href={`/students/${s.id}`}
                        className="font-semibold text-[hsl(var(--primary))] hover:underline"
                      >
                        {s.firstName}{" "}
                        {s.lastName}
                      </Link>

                      <div className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                        {s.email ||
                          s.phone ||
                          "Contact not added"}
                      </div>

                    </div>

                  </div>

                </Td>

                {/* ==========================================
                  ADMISSION
                  ========================================== */}

                <Td className="mono text-xs">
                  {s.admissionNumber}
                </Td>

                {/* ==========================================
                  CLASS
                  ========================================== */}

                <Td>
                  {s.className || "—"}

                  <span className="text-[hsl(var(--muted-foreground))]">
                    {" "}
                    ·{" "}
                    {s.sectionName || "—"}
                  </span>
                </Td>

                {/* ==========================================
                  GUARDIAN
                  ========================================== */}

                <Td>

                  {s.fatherName ||
                    s.parentName ||
                    "—"}

                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {s.fatherPhone ||
                      s.parentPhone ||
                      ""}
                  </div>

                </Td>

                {/* ==========================================
                  FEE
                  ========================================== */}

                <Td>
                  <Money
                    value={s.feeAmount}
                  />
                </Td>

                {/* ==========================================
                  STATUS
                  ========================================== */}

                <Td>
                  <StatusPill
                    value={s.status}
                  />
                </Td>

                {/* ==========================================
                  ACTIONS
                  ========================================== */}

                <Td>

                  <div className="flex flex-wrap items-center gap-2">

                    {/* VIEW */}

                    <Link
                      href={`/students/${s.id}`}
                      className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      border
                      border-[hsl(var(--border))]
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      transition
                      hover:bg-[hsl(var(--muted))]
                    "
                    >
                      <Eye size={14} />
                      View
                    </Link>

                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(s);
                        setModal(true);
                      }}
                      className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-[hsl(var(--primary))]
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-white
                      transition
                      hover:opacity-90
                    "
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    {/* ARCHIVE */}

                    <button
                      type="button"
                      disabled={
                        archive.isPending
                      }
                      onClick={() => {

                        if (
                          window.confirm(
                            `Archive ${s.firstName} ${s.lastName}? Their historical records will remain available.`,
                          )
                        ) {

                          archive.mutate(
                            {
                              id: s.id,
                            },
                            {
                              onSuccess: () => {

                                void client.invalidateQueries(
                                  {
                                    queryKey:
                                      getListStudentsQueryKey(),
                                  },
                                );

                                void client.invalidateQueries(
                                  {
                                    queryKey:
                                      getListFeeDuesQueryKey(),
                                  },
                                );

                                void client.invalidateQueries(
                                  {
                                    queryKey:
                                      getGetDashboardQueryKey(),
                                  },
                                );

                                setNotice(
                                  "Student archived; history is retained.",
                                );
                              },

                              onError: () =>
                                setNotice(
                                  "Could not archive this student. Try again.",
                                ),
                            },
                          );
                        }
                      }}
                      className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-[hsl(var(--destructive))]
                      hover:bg-[hsl(var(--destructive)/.08)]
                    "
                    >
                      {archive.isPending
                        ? "Archiving..."
                        : "Archive"}
                    </button>

                  </div>

                </Td>

              </tr>

            ))}

          </tbody>

        </TableFrame>

      ) : (

        !query.isError && (
          <EmptyState
            title={
              search || classId
                ? "No matching students"
                : "Start your student register"
            }
            detail={
              search || classId
                ? "Try another search or class filter."
                : "Add the first student record for this academic session."
            }
            action={
              !search &&
              !classId && (
                <Button
                  onClick={() => {
                    setEditingStudent(null);
                    setModal(true);
                  }}
                >
                  <Plus size={15} />
                  Add student
                </Button>
              )
            }
          />
        )

      )}

      {/* =====================================================
        ADD / EDIT STUDENT MODAL
        ===================================================== */}

      {modal && (
        <StudentForm
          student={editingStudent ?? undefined}
          close={() => {
            setModal(false);
            setEditingStudent(null);
          }}
          afterSave={() => {
            setModal(false);
            setEditingStudent(null);
            refresh();
          }}
        />
      )}

    </div>
  );
}

export function StudentDetailPage({ id }: { id: string }) {
  const client = useQueryClient();

  // Use the existing generated API hook.
  // Do NOT use a custom useQuery here.
  const q = useGetStudent(id);

  const archive = useArchiveStudent();

  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');

  if (q.isLoading) {
    return (
      <div className="page-in space-y-3">
        <div className="skeleton h-8 w-60" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="page-in">
        <ErrorPanel
          error
          retry={() => q.refetch()}
        />
      </div>
    );
  }

  const s = q.data;

  const fullName =
    `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
    'Student';

  const initials =
    `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() ||
    'S';

  const value = (v: unknown): string => {
    if (v === null || v === undefined || v === '') {
      return 'Not added';
    }

    return String(v);
  };

  const formatDate = (v: unknown): string => {
    if (!v) return 'Not added';

    const date = new Date(String(v));

    if (Number.isNaN(date.getTime())) {
      return String(v);
    }

    return date.toLocaleDateString();
  };

  function refreshAfterEdit() {
    setEditing(false);

    void client.invalidateQueries({
      queryKey: getGetStudentQueryKey(id),
    });

    void client.invalidateQueries({
      queryKey: getListStudentsQueryKey(),
    });

    void client.invalidateQueries({
      queryKey: getListFeeDuesQueryKey(),
    });

    void client.invalidateQueries({
      queryKey: getGetDashboardQueryKey(),
    });

    setNotice('Student record updated successfully.');
  }

  function archiveStudent() {
    if (
      !window.confirm(
        `Archive ${fullName}? Their historical records will remain available.`,
      )
    ) {
      return;
    }

    archive.mutate(
      { id },
      {
        onSuccess: () => {
          void client.invalidateQueries({
            queryKey: getGetStudentQueryKey(id),
          });

          void client.invalidateQueries({
            queryKey: getListStudentsQueryKey(),
          });

          void client.invalidateQueries({
            queryKey: getListFeeDuesQueryKey(),
          });

          void client.invalidateQueries({
            queryKey: getGetDashboardQueryKey(),
          });

          setNotice(
            'Student archived. Historical information has been retained.',
          );
        },

        onError: () => {
          setNotice('Could not archive this student.');
        },
      },
    );
  }

  return (
    <div className="page-in">

      {/* =====================================================
          BACK BUTTON / BREADCRUMB
          ===================================================== */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <Link
          href="/students"
          className="
            inline-flex
            w-fit
            items-center
            gap-2
            rounded-xl
            border
            border-[hsl(var(--border))]
            bg-[hsl(var(--card))]
            px-4
            py-2
            text-sm
            font-semibold
            text-[hsl(var(--foreground))]
            shadow-sm
            transition
            hover:bg-[hsl(var(--muted))]
            active:scale-[0.98]
          "
        >
          <span className="text-base">←</span>
          Back to Students Record
        </Link>

        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          <Link
            href="/students"
            className="hover:underline"
          >
            Students
          </Link>

          <span className="mx-2">/</span>

          <span>{s.admissionNumber}</span>
        </div>

      </div>


      {/* =====================================================
          PAGE TITLE
          ===================================================== */}

      <PageTitle
        eyebrow="Student record"
        title={fullName}
        detail={`${s.admissionNumber} · ${s.className || 'No class'
          }, ${s.sectionName || 'No section'}`}
        action={
          <div className="flex flex-wrap gap-2">

            <Button
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} />
              Edit record
            </Button>

            <Button
              variant="danger"
              busy={archive.isPending}
              onClick={archiveStudent}
            >
              Delete / Archive
            </Button>

          </div>
        }
      />


      {/* =====================================================
          NOTICE
          ===================================================== */}

      {notice && (
        <div className="mb-4">
          <Notice
            tone={
              notice.startsWith('Could')
                ? 'error'
                : 'success'
            }
          >
            {notice}
          </Notice>
        </div>
      )}


      {/* =====================================================
          STUDENT HEADER
          ===================================================== */}

      <div className="mb-5 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">

        <div className="h-24 bg-gradient-to-r from-[hsl(var(--primary)/.16)] via-[hsl(var(--primary)/.06)] to-transparent" />

        <div className="-mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">

          {/* PHOTO */}

          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[hsl(var(--card))] bg-[hsl(var(--muted))] shadow-lg">

            {s.photoUrl ? (
              <img
                src={s.photoUrl}
                alt={fullName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-2xl font-extrabold text-[hsl(var(--muted-foreground))]">
                {initials}
              </span>
            )}

          </div>


          {/* BASIC INFO */}

          <div className="min-w-0 flex-1 pb-1">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="display text-2xl font-extrabold">
                {fullName}
              </h2>

              <StatusPill value={s.status} />

            </div>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">

              <span>
                Admission:{' '}
                <strong className="text-[hsl(var(--foreground))]">
                  {s.admissionNumber}
                </strong>
              </span>

              <span>
                Class:{' '}
                <strong className="text-[hsl(var(--foreground))]">
                  {s.className || '—'}
                </strong>
              </span>

              <span>
                Section:{' '}
                <strong className="text-[hsl(var(--foreground))]">
                  {s.sectionName || '—'}
                </strong>
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          INFORMATION GRID
          ===================================================== */}

      <div className="grid gap-4 lg:grid-cols-2">


        {/* ===================================================
            STUDENT INFORMATION
            =================================================== */}

        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">

          <h2 className="display mb-5 font-bold">
            Student information
          </h2>

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

            {[
              ['Admission number', s.admissionNumber],
              ['Roll number', s.rollNumber],
              ['Admission date', formatDate(s.admissionDate)],
              ['Date of birth', formatDate(s.dateOfBirth)],
              ['Gender', s.gender],
              ['Blood group', s.bloodGroup],
              ['Aadhaar / ID number', s.idNumber],
              ['Student phone', s.phone],
              ['Email', s.email],
              ['Previous school', s.previousSchool],
              ['Enrolled on', formatDate(s.createdAt)],
            ].map(([label, v]) => (
              <div key={String(label)}>

                <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  {label}
                </dt>

                <dd className="mt-1 break-words text-sm font-medium">
                  {value(v)}
                </dd>

              </div>
            ))}

          </dl>

        </section>


        {/* ===================================================
            FAMILY INFORMATION
            =================================================== */}

        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">

          <h2 className="display mb-5 font-bold">
            Family information
          </h2>

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">

            {[
              ["Father's name", s.fatherName],
              ["Father's phone", s.fatherPhone],
              ["Father's occupation", s.fatherOccupation],
              ["Mother's name", s.motherName],
              ["Mother's phone", s.motherPhone],
              ["Mother's occupation", s.motherOccupation],
              ['Parent / guardian', s.parentName],
              ['Parent phone', s.parentPhone],
            ].map(([label, v]) => (
              <div key={String(label)}>

                <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  {label}
                </dt>

                <dd className="mt-1 break-words text-sm font-medium">
                  {value(v)}
                </dd>

              </div>
            ))}

          </dl>

        </section>


        {/* ===================================================
            CONTACT & ADDRESS
            =================================================== */}

        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">

          <h2 className="display mb-5 font-bold">
            Contact & address
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2">

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Emergency contact
              </dt>

              <dd className="mt-1 text-sm font-medium">
                {value(s.emergencyContact)}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Full address
              </dt>

              <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
                {value(s.address)}
              </dd>
            </div>

          </dl>

        </section>


        {/* ===================================================
            MEDICAL INFORMATION
            =================================================== */}

        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">

          <h2 className="display mb-5 font-bold">
            Medical information
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2">

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Blood group
              </dt>

              <dd className="mt-1 text-sm font-medium">
                {value(s.bloodGroup)}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Emergency contact
              </dt>

              <dd className="mt-1 text-sm font-medium">
                {value(s.emergencyContact)}
              </dd>
            </div>

            <div className="sm:col-span-2">

              <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Medical notes
              </dt>

              <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
                {value(s.medicalNotes)}
              </dd>

            </div>

          </dl>

        </section>


        {/* ===================================================
            FEE INFORMATION
            =================================================== */}

        <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 lg:col-span-2">

          <h2 className="display mb-5 font-bold">
            Fee information
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">

            <div className="rounded-lg bg-[hsl(var(--muted)/.55)] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Annual fee
              </div>

              <div className="display mt-2 text-2xl font-extrabold">
                <Money value={s.feeAmount} />
              </div>
            </div>

            <div className="rounded-lg bg-[hsl(var(--muted)/.55)] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Class
              </div>

              <div className="mt-2 text-lg font-bold">
                {s.className || '—'}
              </div>
            </div>

            <div className="rounded-lg bg-[hsl(var(--muted)/.55)] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Section
              </div>

              <div className="mt-2 text-lg font-bold">
                {s.sectionName || '—'}
              </div>
            </div>

          </div>

        </section>

      </div>


      {/* =====================================================
          EDIT STUDENT MODAL
          ===================================================== */}

      {editing && (
        <StudentForm
          student={s}
          close={() => setEditing(false)}
          afterSave={refreshAfterEdit}
        />
      )}

    </div>
  );
}





export function ClassesPage() {
  const client = useQueryClient();
  const q = useListClasses();
  const addClass = useCreateClass();
  const addSection = useCreateSection();
  const [classModal, setClassModal] = useState(false);
  const [sectionFor, setSectionFor] = useState<{ id: string; name: string } | null>(null);
  const [notice, setNotice] = useState('');
  function refresh(message: string) { void client.invalidateQueries({ queryKey: getListClassesQueryKey() }); void client.invalidateQueries({ queryKey: getListStudentsQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setNotice(message); setClassModal(false); setSectionFor(null); }
  function submitClass(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); addClass.mutate({ data: { name: String(f.get('name')).trim(), capacity: Number(f.get('capacity') || 0) || undefined } }, { onSuccess: () => refresh('Class added for the active session.'), onError: () => setNotice('Class could not be added.') }); }
  function submitSection(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!sectionFor) return;

    const f = new FormData(e.currentTarget);

    const name = String(
      f.get("name") || "",
    ).trim();

    const capacityValue = Number(
      f.get("capacity") || 0,
    );

    if (!name) {
      setNotice("Section name is required.");
      return;
    }

    addSection.mutate(
      {
        id: sectionFor.id,
        data: {
          name,
          capacity:
            capacityValue > 0
              ? capacityValue
              : undefined,
        },
      },
      {
        onSuccess: () => {
          refresh("Section added successfully.");
        },

        onError: (error: any) => {
          console.error(
            "SECTION CREATE ERROR:",
            error,
          );

          setNotice(
            error?.message ||
            "Section could not be added.",
          );
        },
      },
    );
  }
  return <div className="page-in"><PageTitle eyebrow="Academic structure" title="Classes & sections" detail="Keep enrolment organized around the real class structure of this session." action={<Button onClick={() => setClassModal(true)}><Plus size={16} /> Add class</Button>} />
    {notice && <div className="mb-4"><Notice tone={notice.includes('could not') ? 'error' : 'success'}>{notice}</Notice></div>}
    <ErrorPanel error={q.isError} retry={() => q.refetch()} />
    {q.isLoading ? <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map(x => <div className="skeleton h-48" key={x} />)}</div> : q.data?.length ? <div className="grid gap-3 lg:grid-cols-2">{q.data.map((c, i) => <section key={c.id} className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="flex items-start justify-between border-b border-[hsl(var(--border))] p-5"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">CLASS {String(i + 1).padStart(2, '0')}</div><h2 className="display text-xl font-bold">{c.name}</h2></div><div className="text-right"><div className="mono text-lg font-semibold">{c.studentCount}<span className="text-sm text-[hsl(var(--muted-foreground))]"> / {c.capacity}</span></div><div className="text-[10px] text-[hsl(var(--muted-foreground))]">students / capacity</div></div></div><div className="space-y-2 p-4">{c.sections.length ? c.sections.map(sec => <div key={sec.id} className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted)/.55)] px-4 py-3"><div><div className="text-sm font-semibold">Section {sec.name}</div><div className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{sec.studentCount} students · capacity {sec.capacity}</div></div><Link href={`/attendance?classId=${c.id}&sectionId=${sec.id}`} className="text-xs font-bold text-[hsl(var(--primary))]">Attendance <ChevronRight className="inline" size={14} /></Link></div>) : <div className="py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">No sections created yet.</div>}<button onClick={() => setSectionFor({ id: c.id, name: c.name })} className="flex items-center gap-2 px-1 py-2 text-xs font-bold text-[hsl(var(--primary))]"><Plus size={14} /> Add section</button></div></section>)}</div> : !q.isError && <EmptyState title="No classes for this session" detail="Add a class first, then create sections to organize student enrolment." action={<Button onClick={() => setClassModal(true)}><Plus size={15} /> Add class</Button>} />}
    {classModal && <Modal title="Add class" close={() => setClassModal(false)}><form onSubmit={submitClass} className="space-y-4"><Field label="Class name"><input name="name" required maxLength={80} className={control} placeholder="e.g. Grade 6" /></Field><Field label="Student capacity"><input name="capacity" type="number" min="1" max="3000" className={control} placeholder="Optional" /></Field><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setClassModal(false)}>Cancel</Button><Button busy={addClass.isPending}>Create class</Button></div></form></Modal>}
    {sectionFor && <Modal title={`Add section · ${sectionFor.name}`} close={() => setSectionFor(null)}><form onSubmit={submitSection} className="space-y-4"><Field label="Section name"><input name="name" required maxLength={40} className={control} placeholder="e.g. A" /></Field><Field label="Student capacity"><input name="capacity" type="number" min="1" max="1000" className={control} placeholder="Optional" /></Field><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSectionFor(null)}>Cancel</Button><Button busy={addSection.isPending}>Create section</Button></div></form></Modal>}
  </div>;
}

export function AttendancePage() {
  const client = useQueryClient();
  const classesQ = useListClasses();
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(nowDate());
  const classes = classesQ.data || [];
  const selected = classes.find(c => c.id === classId);
  const params = { date, classId, sectionId };
  const q = useGetAttendanceRegister(params, { query: { enabled: !!classId && !!sectionId && !!date, queryKey: getGetAttendanceRegisterQueryKey(params) } });
  const save = useSaveAttendanceRegister();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const paramsFromUrl = new URLSearchParams(window.location.search);
    if (paramsFromUrl.has('classId')) setClassId(paramsFromUrl.get('classId') || '');
    if (paramsFromUrl.has('sectionId')) setSectionId(paramsFromUrl.get('sectionId') || '');
  }, []);
  useEffect(() => {
    if (q.data) setMarks(Object.fromEntries(q.data.students.map(s => [s.studentId, s.status || "present"])));
  }, [q.data]);
  const counts = useMemo(() => Object.values(marks).reduce((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {} as Record<string, number>), [marks]);
  function saveRegister() {
    const records = (q.data?.students || []).map(s => ({ studentId: s.studentId, status: marks[s.studentId] || "present", remarks: null }));
    save.mutate({ data: { date, classId, sectionId, records } }, { onSuccess: result => { setNotice(`${result.saved} attendance records saved for ${date}.`); void client.invalidateQueries({ queryKey: getGetAttendanceRegisterQueryKey(params) }); void client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }, onError: () => setNotice('Attendance could not be saved. Please try again.') });
  }
  return <div className="page-in"><PageTitle eyebrow="Daily register" title="Attendance" detail="Mark every student for the selected class, section and school day." />
    <section className="mb-5 grid gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:grid-cols-3">
      <Field label="School date"><input type="date" value={date} max={nowDate()} onChange={e => setDate(e.target.value)} className={control} /></Field>
      <Field label="Class"><select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setNotice(''); }} className={selectClass}><option value="">Choose class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Section"><select value={sectionId} onChange={e => { setSectionId(e.target.value); setNotice(''); }} disabled={!selected} className={selectClass}><option value="">Choose section</option>{selected?.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    </section>
    {notice && <div className="mb-4"><Notice tone={notice.includes('could not') ? 'error' : 'success'}>{notice}</Notice></div>}
    {!classId || !sectionId ? <EmptyState title="Choose a class and section" detail="The register will load the enrolled students for the selected day." /> : q.isLoading ? <div className="space-y-2">{[1, 2, 3, 4].map(x => <div key={x} className="skeleton h-14" />)}</div> : q.isError ? <ErrorPanel error retry={() => q.refetch()} /> : !q.data?.students.length ? <EmptyState title="No students in this section" detail="Add students to this section before taking attendance." action={<LinkButton href="/students">Go to student records</LinkButton>} /> : <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{[['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['leave', 'Leave']].map(([key, label]) => <div key={key} className="rounded-lg bg-[hsl(var(--card))] px-3 py-2 text-xs"><span className="font-semibold">{counts[key] || 0}</span><span className="ml-1 text-[hsl(var(--muted-foreground))]">{label}</span></div>)}</div><div className="flex gap-2"><Button variant="outline" onClick={() => setMarks(Object.fromEntries(q.data!.students.map(s => [s.studentId, "present"])))}>Mark all present</Button><Button onClick={saveRegister} busy={save.isPending}>Save register</Button></div></div>
      <TableFrame><thead><tr><Th>Student</Th><Th>Admission no.</Th><Th>Attendance</Th></tr></thead><tbody>{q.data.students.map(s => <tr key={s.studentId}><Td className="font-semibold">{s.studentName}</Td><Td className="mono text-xs">{s.admissionNumber}</Td><Td><div className="flex flex-wrap gap-1.5">{([['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['half_day', 'Half day'], ['leave', 'Leave']] as [AttendanceStatus, string][]).map(([value, label]) => <button key={value} onClick={() => setMarks(prev => ({ ...prev, [s.studentId]: value }))} className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${marks[s.studentId] === value ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}>{label}</button>)}</div></Td></tr>)}</tbody></TableFrame>
    </>}
  </div>;
}
export function TeachersPage() {
  const client = useQueryClient();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<any | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<any | null>(null);
  const [notice, setNotice] = useState('');

  const q = useListTeachers({ search: search || undefined });
  const create = useCreateTeacher();
  const update = useUpdateTeacher();
  const remove = useDeleteTeacher();

  function refreshTeachers() {
    void client.invalidateQueries({
      queryKey: getListTeachersQueryKey(),
    });

    void client.invalidateQueries({
      queryKey: getGetDashboardQueryKey(),
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const f = new FormData(form);

    const data = {
      employeeId: String(f.get('employeeId') || '').trim(),
      name: String(f.get('name') || '').trim(),
      designation: String(f.get('designation') || '').trim(),
      email: String(f.get('email') || '').trim() || null,
      phone: String(f.get('phone') || '').trim() || null,
    };

    if (editingTeacher) {
      update.mutate(
        {
          id: editingTeacher.id,
          data,
        },
        {
          onSuccess: () => {
            refreshTeachers();
            setEditingTeacher(null);
            setNotice('Teacher details updated successfully.');
          },
          onError: (error) => {
            setNotice(
              error instanceof Error
                ? error.message
                : 'Teacher details could not be updated.',
            );
          },
        },
      );

      return;
    }

    create.mutate(
      { data },
      {
        onSuccess: () => {
          refreshTeachers();
          setOpen(false);
          setNotice('Teacher added to the staff register.');
        },
        onError: (error) => {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Teacher record could not be created.',
          );
        },
      },
    );
  }

  function deleteTeacher() {
    if (!deletingTeacher) return;

    remove.mutate(
      { id: deletingTeacher.id },
      {
        onSuccess: () => {
          refreshTeachers();
          setDeletingTeacher(null);
          setNotice('Teacher record deleted successfully.');
        },
        onError: (error) => {
          setDeletingTeacher(null);
          setNotice(
            error instanceof Error
              ? error.message
              : 'Teacher record could not be deleted.',
          );
        },
      },
    );
  }

  const formBusy = create.isPending || update.isPending;

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="People"
        title="Teachers"
        detail="Manage teacher records, designations and contact details."
        action={
          <Button
            onClick={() => {
              setNotice('');
              setEditingTeacher(null);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Add teacher
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <Notice
            tone={
              /could not|failed|already in use|error/i.test(notice)
                ? 'error'
                : 'success'
            }
          >
            {notice}
          </Notice>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search teacher or employee ID"
        />

        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {q.data?.length || 0} teachers
        </div>
      </div>

      <ErrorPanel error={q.isError} retry={() => q.refetch()} />

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((x) => (
            <div key={x} className="skeleton h-14" />
          ))}
        </div>
      ) : q.data?.length ? (
        <TableFrame>
          <thead>
            <tr>
              <Th>Teacher</Th>
              <Th>Employee ID</Th>
              <Th>Designation</Th>
              <Th>Contact</Th>
              <Th>Added</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>
            {q.data.map((t: any) => (
              <tr key={t.id}>
                <Td className="font-semibold">{t.name}</Td>

                <Td className="mono text-xs">{t.employeeId}</Td>

                <Td>{t.designation}</Td>

                <Td>
                  {t.email || '—'}
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t.phone || ''}
                  </div>
                </Td>

                <Td>
                  {new Date(t.createdAt).toLocaleDateString()}
                </Td>

                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      title="View details"
                      onClick={() => {
                        setNotice('');
                        setViewingTeacher(t);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                    >
                      <Eye size={14} />
                      View
                    </button>

                    <button
                      type="button"
                      title="Edit teacher"
                      onClick={() => {
                        setNotice('');
                        setEditingTeacher(t);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      title="Delete teacher"
                      onClick={() => {
                        setNotice('');
                        setDeletingTeacher(t);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      ) : (
        !q.isError && (
          <EmptyState
            title={search ? 'No teachers match' : 'No teachers recorded yet'}
            detail={
              search
                ? 'Try searching with a different name or employee ID.'
                : 'Add the first teacher to the school staff register.'
            }
            action={
              !search && (
                <Button
                  onClick={() => {
                    setEditingTeacher(null);
                    setOpen(true);
                  }}
                >
                  <Plus size={15} />
                  Add teacher
                </Button>
              )
            }
          />
        )
      )}

      {/* Add teacher / Edit teacher modal */}
      {(open || editingTeacher) && (
        <Modal
          title={editingTeacher ? 'Edit teacher' : 'Add teacher'}
          close={() => {
            setOpen(false);
            setEditingTeacher(null);
          }}
        >
          <form
            key={editingTeacher?.id || 'new-teacher'}
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Employee ID">
              <input
                name="employeeId"
                required
                maxLength={40}
                defaultValue={editingTeacher?.employeeId || ''}
                className={control}
              />
            </Field>

            <Field label="Full name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editingTeacher?.name || ''}
                className={control}
              />
            </Field>

            <Field label="Designation">
              <input
                name="designation"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editingTeacher?.designation || ''}
                className={control}
                placeholder="e.g. Mathematics teacher"
              />
            </Field>

            <Field label="Email">
              <input
                name="email"
                type="email"
                maxLength={254}
                defaultValue={editingTeacher?.email || ''}
                className={control}
              />
            </Field>

            <Field label="Phone">
              <input
                name="phone"
                maxLength={40}
                defaultValue={editingTeacher?.phone || ''}
                className={control}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingTeacher(null);
                }}
              >
                Cancel
              </Button>

              <Button busy={formBusy}>
                {editingTeacher ? 'Save changes' : 'Create teacher'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Teacher details modal */}
      {viewingTeacher && (
        <Modal
          title="Teacher details"
          close={() => setViewingTeacher(null)}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-[hsl(var(--border))] p-4">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Full name
              </div>
              <div className="mt-1 text-lg font-bold">
                {viewingTeacher.name}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Employee ID
                </div>
                <div className="mono mt-1 font-semibold">
                  {viewingTeacher.employeeId}
                </div>
              </div>

              <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Designation
                </div>
                <div className="mt-1 font-semibold">
                  {viewingTeacher.designation}
                </div>
              </div>

              <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Email
                </div>
                <div className="mt-1 break-all font-medium">
                  {viewingTeacher.email || 'Not provided'}
                </div>
              </div>

              <div className="rounded-lg bg-[hsl(var(--muted))] p-3">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Phone
                </div>
                <div className="mt-1 font-medium">
                  {viewingTeacher.phone || 'Not provided'}
                </div>
              </div>

              <div className="rounded-lg bg-[hsl(var(--muted))] p-3 sm:col-span-2">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Record created
                </div>
                <div className="mt-1 font-medium">
                  {new Date(viewingTeacher.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setViewingTeacher(null)}
              >
                Close
              </Button>

              <Button
                onClick={() => {
                  setEditingTeacher(viewingTeacher);
                  setViewingTeacher(null);
                }}
              >
                <Pencil size={14} />
                Edit teacher
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deletingTeacher && (
        <Modal
          title="Delete teacher?"
          close={() => setDeletingTeacher(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-semibold">
                You are about to delete {deletingTeacher.name}.
              </p>
              <p className="mt-2">
                Employee ID: {deletingTeacher.employeeId}
              </p>
              <p className="mt-2">
                This action permanently deletes the teacher record and cannot
                be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingTeacher(null)}
              >
                Cancel
              </Button>

              <Button
                busy={remove.isPending}
                onClick={deleteTeacher}
              >
                Confirm delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


export function FeesPage() {
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const classes = useListClasses();
  const q = useListFeeDues({ search: search || undefined, classId: classId || undefined });
  const totalDue = (q.data || []).reduce((sum, item) => sum + item.due, 0);
  return <div className="page-in"><PageTitle eyebrow="Finance · Receivables" title="Fee balances" detail="See what is due by student and keep follow-up connected to enrolment." action={<LinkButton href="/finance/payments"><CircleDollarSign size={15} /> Open payment ledger</LinkButton>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px_220px]"><SearchBox value={search} onChange={setSearch} placeholder="Search student or admission no." /><select value={classId} onChange={e => setClassId(e.target.value)} className={selectClass}><option value="">All classes</option>{classes.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3"><span className="text-xs text-[hsl(var(--muted-foreground))]">Visible dues</span><span className="mono font-semibold"><Money value={totalDue} /></span></div></div>
    <ErrorPanel error={q.isError} retry={() => q.refetch()} />
    {q.isLoading ? <div className="space-y-2">{[1, 2, 3, 4].map(x => <div key={x} className="skeleton h-14" />)}</div> : q.data?.length ? <TableFrame><thead><tr><Th>Student</Th><Th>Admission no.</Th><Th>Class / section</Th><Th>Total fee</Th><Th>Paid</Th><Th>Balance due</Th><Th>Next step</Th></tr></thead><tbody>{q.data.map(f => <tr key={f.studentId}><Td className="font-semibold">{f.studentName}</Td><Td className="mono text-xs">{f.admissionNumber}</Td><Td>{f.className} · {f.sectionName}</Td><Td><Money value={f.total} /></Td><Td className="text-emerald-800"><Money value={f.paid} /></Td><Td className="font-bold text-rose-800"><Money value={f.due} /></Td><Td><Link href={`/finance/payments?studentId=${f.studentId}`} className="text-xs font-bold text-[hsl(var(--primary))] hover:underline">Record payment <ChevronRight className="inline" size={13} /></Link></Td></tr>)}</tbody></TableFrame> : !q.isError && <EmptyState title={search || classId ? 'No balances match your filters' : 'No fee balances to show'} detail={search || classId ? 'Change the search or class filter.' : 'Fee balances appear when student fee schedules are part of the active session.'} />}
  </div>;
}

export function PaymentsPage() {
  const client = useQueryClient();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [presetStudent, setPresetStudent] = useState('');

  const [receipt, setReceipt] = useState<{
    id: string;
    receiptNumber: string;
    studentName: string;
    amount: number;
    method: string;
    paidAt: string;
    transactionId?: string | null;
  } | null>(null);

  const q = useListPayments({
    search: search || undefined,
  });

  const students = useListStudents({
    status: 'active',
  });

  const record = useRecordPayment();

  useEffect(() => {
    setPresetStudent(
      new URLSearchParams(
        window.location.search,
      ).get('studentId') || '',
    );
  }, []);

  function printReceipt(
    paymentId: string,
    size: 'A4' | 'A6',
  ) {
    const url =
      `/api/print?type=payment` +
      `&paymentId=${encodeURIComponent(paymentId)}` +
      `&size=${size}`;

    const printWindow = window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );

    if (!printWindow) {
      window.alert(
        'Print window was blocked. Please allow pop-ups for this school system.',
      );
    }
  }

  function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const f = new FormData(
      e.currentTarget,
    );

    record.mutate(
      {
        data: {
          studentId: String(
            f.get('studentId'),
          ),

          amount: Number(
            f.get('amount'),
          ),

          method: String(
            f.get('method'),
          ) as
            | 'cash'
            | 'upi'
            | 'card'
            | 'bank_transfer'
            | 'cheque'
            | 'online',

          transactionId:
            String(
              f.get('transactionId') || '',
            ) || null,
        },
      },

      {
        onSuccess: (payment) => {
          setReceipt(payment);

          setOpen(false);

          setNotice(
            `Payment recorded · receipt ${payment.receiptNumber}`,
          );

          void client.invalidateQueries({
            queryKey:
              getListPaymentsQueryKey(),
          });

          void client.invalidateQueries({
            queryKey:
              getListFeeDuesQueryKey(),
          });

          void client.invalidateQueries({
            queryKey:
              getGetDashboardQueryKey(),
          });
        },

        onError: () => {
          setNotice(
            'Payment was not recorded. Please verify the details and try again.',
          );
        },
      },
    );
  }

  return (
    <div className="page-in">

      <PageTitle
        eyebrow="Finance · Collections"
        title="Payments"
        detail="A traceable ledger of every fee payment received."
        action={
          <Button
            onClick={() => setOpen(true)}
          >
            <Plus size={16} />
            Record payment
          </Button>
        }
      />

      {notice && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">

          <Notice
            tone={
              notice.startsWith(
                'Payment was',
              )
                ? 'error'
                : 'success'
            }
          >
            {notice}
          </Notice>

          {receipt && (
            <div className="flex flex-wrap gap-2">

              <Button
                variant="outline"
                onClick={() =>
                  printReceipt(
                    receipt.id,
                    'A4',
                  )
                }
              >
                <Printer size={14} />
                Print A4
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  printReceipt(
                    receipt.id,
                    'A6',
                  )
                }
              >
                <Printer size={14} />
                Print A6
              </Button>

            </div>
          )}

        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">

        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search receipt or student"
        />

        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {q.data?.length || 0} payments
        </div>

      </div>

      <ErrorPanel
        error={q.isError}
        retry={() => q.refetch()}
      />

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((x) => (
            <div
              key={x}
              className="skeleton h-14"
            />
          ))}
        </div>
      ) : q.data?.length ? (
        <TableFrame>

          <thead>
            <tr>
              <Th>Receipt</Th>
              <Th>Student</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Transaction reference</Th>
              <Th>Paid at</Th>
              <Th>Print</Th>
            </tr>
          </thead>

          <tbody>

            {q.data.map((p) => (
              <tr key={p.id}>

                <Td className="mono text-xs font-semibold">
                  {p.receiptNumber}
                </Td>

                <Td>
                  <Link
                    href={`/students/${p.studentId}`}
                    className="font-semibold hover:text-[hsl(var(--primary))]"
                  >
                    {p.studentName}
                  </Link>
                </Td>

                <Td className="font-bold">
                  <Money value={p.amount} />
                </Td>

                <Td className="capitalize">
                  {p.method.replace(
                    '_',
                    ' ',
                  )}
                </Td>

                <Td className="mono text-xs">
                  {p.transactionId || '—'}
                </Td>

                <Td>
                  {new Date(
                    p.paidAt,
                  ).toLocaleString()}
                </Td>

                <Td>

                  <div className="flex flex-wrap gap-1">

                    <button
                      type="button"
                      onClick={() =>
                        printReceipt(
                          p.id,
                          'A4',
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[11px] font-bold transition hover:bg-[hsl(var(--muted))]"
                      title="Print A4 receipt"
                    >
                      <Printer size={12} />
                      A4
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        printReceipt(
                          p.id,
                          'A6',
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[11px] font-bold transition hover:bg-[hsl(var(--muted))]"
                      title="Print A6 receipt"
                    >
                      <Printer size={12} />
                      A6
                    </button>

                  </div>

                </Td>

              </tr>
            ))}

          </tbody>

        </TableFrame>
      ) : !q.isError ? (
        <EmptyState
          title={
            search
              ? 'No payments match'
              : 'No payments recorded'
          }
          detail={
            search
              ? 'Try searching by receipt number or student name.'
              : 'Once a payment is received, record it here to update the ledger.'
          }
          action={
            !search && (
              <Button
                onClick={() =>
                  setOpen(true)
                }
              >
                <Plus size={15} />
                Record payment
              </Button>
            )
          }
        />
      ) : null}

      {open && (
        <Modal
          title="Record fee payment"
          close={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            className="space-y-4"
          >

            <Field label="Student">

              <select
                name="studentId"
                required
                defaultValue={
                  presetStudent
                }
                className={selectClass}
              >
                <option
                  value=""
                  disabled
                >
                  Choose a student
                </option>

                {students.data?.items.map(
                  (s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.firstName}{' '}
                      {s.lastName} ·{' '}
                      {s.admissionNumber}
                    </option>
                  ),
                )}

              </select>

            </Field>

            <Field label="Amount received">

              <input
                name="amount"
                required
                type="number"
                min=".01"
                step=".01"
                className={control}
                placeholder="0.00"
              />

            </Field>

            <Field label="Payment method">

              <select
                name="method"
                className={selectClass}
              >
                <option value="cash">
                  Cash
                </option>

                <option value="upi">
                  UPI
                </option>

                <option value="card">
                  Card
                </option>

                <option value="bank_transfer">
                  Bank transfer
                </option>

                <option value="cheque">
                  Cheque
                </option>

                <option value="online">
                  Online
                </option>
              </select>

            </Field>

            <Field label="Transaction / cheque reference">

              <input
                name="transactionId"
                maxLength={120}
                className={control}
                placeholder="Optional reference"
              />

            </Field>

            <div className="flex justify-end gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                busy={record.isPending}
              >
                Save payment
              </Button>

            </div>

          </form>
        </Modal>
      )}

    </div>
  );
}
export function SchoolSettingsPage() {
  const client = useQueryClient();
  const q = useGetSchoolSettings();
  const update = useUpdateSchoolSettings();

  const [notice, setNotice] =
    useState("");

  const [logoPreview, setLogoPreview] =
    useState<string | null>(null);

  const [
    signaturePreview,
    setSignaturePreview,
  ] = useState<string | null>(null);

  const [
    removeLogo,
    setRemoveLogo,
  ] = useState(false);

  const [
    removeSignature,
    setRemoveSignature,
  ] = useState(false);

  useEffect(() => {
    if (!q.data) {
      return;
    }

    const data = q.data as typeof q.data & {
      logoUrl?: string | null;
      headSignatureUrl?: string | null;
    };

    setLogoPreview(
      data.logoUrl || null,
    );

    setSignaturePreview(
      data.headSignatureUrl || null,
    );

    setRemoveLogo(false);
    setRemoveSignature(false);
  }, [q.data]);

  function readImage(
    file: File,
    setter: (
      value: string | null,
    ) => void,
  ) {
    if (!file.type.startsWith("image/")) {
      setNotice(
        "Please select an image file.",
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotice(
        "Image size must be 2 MB or less.",
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result ===
        "string"
      ) {
        setter(result);
      }
    };

    reader.onerror = () => {
      setNotice(
        "Could not read the selected image.",
      );
    };

    reader.readAsDataURL(file);
  }

  function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    const f =
      new FormData(
        e.currentTarget,
      );

    const logoValue =
      removeLogo
        ? null
        : logoPreview;

    const signatureValue =
      removeSignature
        ? null
        : signaturePreview;

    update.mutate(
      {
        data: {
          schoolName:
            String(
              f.get(
                "schoolName",
              ) || "",
            ).trim(),

          schoolCode:
            String(
              f.get(
                "schoolCode",
              ) || "",
            ).trim(),

          address:
            String(
              f.get(
                "address",
              ) || "",
            ),

          city:
            String(
              f.get(
                "city",
              ) || "",
            ),

          state:
            String(
              f.get(
                "state",
              ) || "",
            ),

          country:
            String(
              f.get(
                "country",
              ) || "",
            ),

          phone:
            String(
              f.get(
                "phone",
              ) || "",
            ),

          email:
            String(
              f.get(
                "email",
              ) || "",
            ),

          logoUrl:
            logoValue,

          headSignatureUrl:
            signatureValue,
        },
      },
      {
        onSuccess: () => {
          void client.invalidateQueries(
            {
              queryKey:
                getGetSchoolSettingsQueryKey(),
            },
          );

          setRemoveLogo(false);
          setRemoveSignature(false);

          setNotice(
            "School profile changes saved.",
          );
        },

        onError: (
          error: unknown,
        ) => {
          console.error(
            "School profile update error:",
            error,
          );

          setNotice(
            "Could not save school profile changes.",
          );
        },
      },
    );
  }

  if (q.isLoading) {
    return (
      <div>
        <PageTitle
          eyebrow="Workspace settings"
          title="School profile"
        />

        <div className="skeleton h-80" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <ErrorPanel
        error
        retry={() => q.refetch()}
      />
    );
  }

  const d =
    q.data as typeof q.data & {
      logoUrl?: string | null;
      headSignatureUrl?: string | null;
    };

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Workspace settings"
        title="School profile"
        detail="The shared school identity and current academic session."
      />

      {notice && (
        <div className="mb-4">
          <Notice
            tone={
              notice.startsWith(
                "Could",
              )
                ? "error"
                : "success"
            }
          >
            {notice}
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <form
          onSubmit={submit}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 md:p-7"
        >
          <div className="mb-5">
            <h2 className="display text-lg font-bold">
              School information
            </h2>

            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              This information appears across your school's operational records.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School name">
              <input
                name="schoolName"
                defaultValue={
                  d.schoolName
                }
                required
                minLength={2}
                maxLength={120}
                className={control}
              />
            </Field>

            <Field label="School code">
              <input
                name="schoolCode"
                defaultValue={
                  d.schoolCode
                }
                required
                maxLength={40}
                className={control}
              />
            </Field>

            <Field label="Email">
              <input
                name="email"
                type="email"
                defaultValue={
                  d.email
                }
                className={control}
              />
            </Field>

            <Field label="Phone">
              <input
                name="phone"
                defaultValue={
                  d.phone
                }
                className={control}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Street address">
                <input
                  name="address"
                  defaultValue={
                    d.address
                  }
                  maxLength={500}
                  className={control}
                />
              </Field>
            </div>

            <Field label="City">
              <input
                name="city"
                defaultValue={
                  d.city
                }
                className={control}
              />
            </Field>

            <Field label="State / region">
              <input
                name="state"
                defaultValue={
                  d.state
                }
                className={control}
              />
            </Field>

            <Field label="Country">
              <input
                name="country"
                defaultValue={
                  d.country
                }
                className={control}
              />
            </Field>
          </div>

          {/* ==========================
                        SCHOOL LOGO
                    ========================== */}

          <div className="mt-7 rounded-xl border border-[hsl(var(--border))] p-4">
            <div className="mb-3">
              <h3 className="font-semibold">
                School Logo
              </h3>

              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Optional. This logo will appear on the marksheet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {logoPreview &&
                !removeLogo ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-white p-2">
                  <img
                    src={
                      logoPreview
                    }
                    alt="School logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-center text-xs text-[hsl(var(--muted-foreground))]">
                  No logo
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm"
                  onChange={(
                    e,
                  ) => {
                    const file =
                      e.target.files?.[0];

                    if (
                      !file
                    ) {
                      return;
                    }

                    setRemoveLogo(
                      false,
                    );

                    readImage(
                      file,
                      setLogoPreview,
                    );
                  }}
                />

                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(
                        null,
                      );
                      setRemoveLogo(
                        true,
                      );
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove logo
                  </button>
                )}

                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  PNG, JPG or WEBP · Maximum 2 MB
                </p>
              </div>
            </div>
          </div>

          {/* ==========================
                        HEAD SIGNATURE
                    ========================== */}

          <div className="mt-4 rounded-xl border border-[hsl(var(--border))] p-4">
            <div className="mb-3">
              <h3 className="font-semibold">
                Head of School Signature
              </h3>

              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Optional. This signature will appear only on the marksheet.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {signaturePreview &&
                !removeSignature ? (
                <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-lg border bg-white p-2">
                  <img
                    src={
                      signaturePreview
                    }
                    alt="Head of School signature"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed text-center text-xs text-[hsl(var(--muted-foreground))]">
                  No signature
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm"
                  onChange={(
                    e,
                  ) => {
                    const file =
                      e.target.files?.[0];

                    if (
                      !file
                    ) {
                      return;
                    }

                    setRemoveSignature(
                      false,
                    );

                    readImage(
                      file,
                      setSignaturePreview,
                    );
                  }}
                />

                {signaturePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setSignaturePreview(
                        null,
                      );
                      setRemoveSignature(
                        true,
                      );
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove signature
                  </button>
                )}

                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  PNG, JPG or WEBP · Maximum 2 MB
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              busy={
                update.isPending
              }
            >
              Save school profile
            </Button>
          </div>
        </form>

        <aside className="space-y-3">
          <div className="rounded-xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] opacity-65">
              Active session
            </div>

            <div className="display mt-3 text-xl font-bold">
              {d.currentSession ||
                "No session selected"}
            </div>

            <div className="mt-2 text-xs leading-5 opacity-70">
              Student enrolment, class structure and attendance stay anchored to this academic session.
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">
              Workspace code
            </div>

            <div className="mono mt-2 text-lg font-semibold">
              {d.schoolCode ||
                "—"}
            </div>

            <div className="mt-4 border-t border-[hsl(var(--border))] pt-3 text-xs text-[hsl(var(--muted-foreground))]">
              Profile changes are shared with staff who access this school workspace.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

