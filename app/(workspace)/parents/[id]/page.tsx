'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    MapPin,
    Phone,
    UserRound,
    UsersRound,
    GraduationCap,
    CalendarDays,
    Pencil,
    AlertCircle,
    RefreshCw,
    ShieldAlert,
    BriefcaseBusiness,
    HeartPulse,
    BookOpen,
    Printer,
    Trash2,
    Link2,
    Unlink,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Student = {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    phone: string | null;
    photoUrl: string | null;
    status: string;
};
type AvailableStudent = {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    status: string;
};

type Parent = {
    id: string;

    fatherName: string | null;
    fatherPhone: string | null;
    fatherOccupation: string | null;

    motherName: string | null;
    motherPhone: string | null;
    motherOccupation: string | null;

    guardianName: string | null;
    guardianPhone: string | null;
    guardianRelation: string | null;

    address: string | null;
    emergencyContact: string | null;

    students: Student[];
};

function readError(value: unknown): string {
    if (
        typeof value === 'object' &&
        value !== null &&
        'error' in value &&
        typeof value.error === 'string'
    ) {
        return value.error;
    }

    return 'Unable to load parent details.';
}

async function readResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text.trim()) {
        throw new Error(
            `The server returned an empty response. HTTP ${response.status}.`,
        );
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error(
            `The server returned an invalid response. HTTP ${response.status}.`,
        );
    }
}

function formatDate(value: string | null): string {
    if (!value) return 'Not recorded';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function display(value: string | null | undefined): string {
    return value?.trim() || 'Not recorded';
}

function PhoneLink({
    value,
    label,
}: {
    value: string | null;
    label?: string;
}) {
    if (!value) {
        return (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Not recorded
            </span>
        );
    }

    return (
        <a
            href={`tel:${value.replace(/[^\d+]/g, '')}`}
            className="inline-flex items-center gap-2 break-all text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
        >
            <Phone size={15} />
            <span>{value}</span>
            {label && (
                <span className="text-xs font-normal opacity-70">
                    {label}
                </span>
            )}
        </a>
    );
}

function InfoItem({
    label,
    value,
    icon,
}: {
    label: string;
    value: string | null | undefined;
    icon?: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                {icon}
                {label}
            </div>

            <div className="break-words text-sm font-semibold text-[hsl(var(--foreground))]">
                {display(value)}
            </div>
        </div>
    );
}

function SectionCard({
    title,
    subtitle,
    icon,
    children,
}: {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-4 sm:px-6">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))]">
                    {icon}
                </div>

                <div className="min-w-0">
                    <h2 className="font-bold text-[hsl(var(--foreground))]">
                        {title}
                    </h2>

                    {subtitle && (
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

export default function ParentDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const id = params?.id;

    const [parent, setParent] = useState<Parent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [availableStudents, setAvailableStudents] =
        useState<AvailableStudent[]>([]);

    const [selectedStudentId, setSelectedStudentId] =
        useState('');

    const [actionLoading, setActionLoading] =
        useState(false);

    const [actionError, setActionError] =
        useState('');

    const [actionSuccess, setActionSuccess] =
        useState('');

    const loadParent = useCallback(async () => {
        if (!id) {
            setError('Parent ID is missing from the URL.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `/api/parents/${encodeURIComponent(id)}`,
                {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            const result = await readResponse(response);

            if (!response.ok) {
                throw new Error(readError(result));
            }

            if (
                typeof result !== 'object' ||
                result === null ||
                !('id' in result) ||
                typeof result.id !== 'string'
            ) {
                throw new Error(
                    'The server response does not contain valid parent details.',
                );
            }

            const record = result as Parent;

            setParent({
                ...record,
                students: Array.isArray(record.students)
                    ? record.students
                    : [],
            });
        } catch (err) {
            console.error('LOAD PARENT DETAILS ERROR:', err);

            setParent(null);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load parent details.',
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    async function loadAvailableStudents() {
        if (!id) return;

        setActionError('');
        setActionSuccess('');

        try {
            const response = await fetch(
                `/api/parents/${encodeURIComponent(id)}/students`,
                { cache: 'no-store' },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.error || 'Could not load available students.',
                );
            }

            setAvailableStudents(
                Array.isArray(result.items) ? result.items : [],
            );
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not load available students.',
            );
        }
    }

    async function linkStudent() {
        if (!id || !selectedStudentId || actionLoading) return;

        setActionLoading(true);
        setActionError('');
        setActionSuccess('');

        try {
            const response = await fetch(
                `/api/parents/${encodeURIComponent(id)}/students`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studentId: selectedStudentId,
                    }),
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not link student.');
            }

            setSelectedStudentId('');
            setActionSuccess('Student linked successfully.');

            await loadParent();
            await loadAvailableStudents();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not link student.',
            );
        } finally {
            setActionLoading(false);
        }
    }

    async function unlinkStudent(student: Student) {
        if (!id || actionLoading) return;

        const confirmed = window.confirm(
            `Unlink ${student.firstName} ${student.lastName} from this parent? The student record will not be deleted.`,
        );

        if (!confirmed) return;

        setActionLoading(true);
        setActionError('');
        setActionSuccess('');

        try {
            const response = await fetch(
                `/api/parents/${encodeURIComponent(id)}/students`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        studentId: student.id,
                    }),
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Could not unlink student.');
            }

            setActionSuccess('Student unlinked successfully.');

            await loadParent();
            await loadAvailableStudents();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not unlink student.',
            );
        } finally {
            setActionLoading(false);
        }
    }

    async function deleteParent() {
        if (!id || actionLoading) return;
        if (!parent) {
            setActionError("Parent details are not loaded.");
            return;
        }

        if (parent.students.length > 0) {
            setActionError("Unlink all students before deleting this parent.");
            return;
        }

        if (parent.students.length > 0) {
            setActionError(
                'Unlink all students before deleting this parent.',
            );
            return;
        }

        const confirmed = window.confirm(
            `Permanently delete the parent record for "${parentName}"? This action cannot be undone.`,
        );

        if (!confirmed) return;

        setActionLoading(true);
        setActionError('');
        setActionSuccess('');

        try {
            const response = await fetch(
                `/api/parents/${encodeURIComponent(id)}`,
                { method: 'DELETE' },
            );

            if (!response.ok) {
                let message = 'Could not delete parent.';

                try {
                    const result = await response.json();
                    message = result?.error || message;
                } catch {
                    // The server may return an empty response.
                }

                throw new Error(message);
            }

            router.replace('/parents');
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Could not delete parent.',
            );
        } finally {
            setActionLoading(false);
        }
    }

    useEffect(() => {
        void loadParent();
    }, [loadParent]);

    const parentName =
        parent?.fatherName ||
        parent?.motherName ||
        parent?.guardianName ||
        'Parent / Guardian';

    if (loading) {
        return (
            <div className="space-y-5">
                <div className="skeleton h-10 w-52 rounded-lg" />

                <div className="skeleton h-44 rounded-2xl" />

                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="skeleton h-64 rounded-2xl" />
                    <div className="skeleton h-64 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !parent) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <button
                    type="button"
                    onClick={() => router.push('/parents')}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                    <ArrowLeft size={16} />
                    Back to Parents
                </button>

                <div className="rounded-2xl border border-red-500/25 bg-[hsl(var(--card))] p-7 text-center sm:p-10">
                    <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-500/10 text-red-500">
                        <AlertCircle size={26} />
                    </div>

                    <h1 className="mt-4 text-xl font-extrabold">
                        Unable to load parent
                    </h1>

                    <p className="mt-2 break-words text-sm text-[hsl(var(--muted-foreground))]">
                        {error || 'The requested parent record was not found.'}
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => void loadParent()}
                            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))]"
                        >
                            <RefreshCw size={15} />
                            Try again
                        </button>

                        <Link
                            href="/parents"
                            className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]"
                        >
                            <ArrowLeft size={15} />
                            Parents list
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-in space-y-6">
            <style jsx global>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 12mm;
                    }

                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }

                    body * {
                        visibility: hidden;
                    }

                    .page-in,
                    .page-in * {
                        visibility: visible;
                    }

                    .page-in {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        color: #000000 !important;
                        background: #ffffff !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .page-in section {
                        break-inside: avoid;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        border-color: #cccccc !important;
                    }

                    .page-in a {
                        color: #000000 !important;
                        text-decoration: none !important;
                    }
                }
            `}</style>
            {/* Top navigation */}
            <div className="no-print flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-semibold transition hover:bg-[hsl(var(--muted))]"
                >
                    <Printer size={15} />
                    Print Details
                </button>

                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            `/parents?edit=${encodeURIComponent(parent.id)}`,
                        )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
                >
                    <Pencil size={15} />
                    Edit Parent
                </button>

                <button
                    type="button"
                    onClick={() => void deleteParent()}
                    disabled={actionLoading || parent.students.length > 0}
                    title={
                        parent.students.length > 0
                            ? 'Unlink all students before deleting.'
                            : 'Delete this parent record'
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Trash2 size={15} />
                    {actionLoading ? 'Please wait...' : 'Delete Parent'}
                </button>
            </div>

            {/* Parent header */}
            <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="h-2 bg-[hsl(var(--primary))]" />

                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary)/.10)] text-[hsl(var(--primary))] sm:size-20">
                            <UserRound size={36} strokeWidth={1.5} />
                        </div>

                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
                                Parent / Guardian Profile
                            </div>

                            <h1 className="display mt-1 break-words text-2xl font-extrabold sm:text-3xl">
                                {parentName}
                            </h1>

                            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                                Family contact information and linked students
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2.5">
                            <UsersRound
                                size={17}
                                className="text-[hsl(var(--primary))]"
                            />

                            <div>
                                <div className="text-lg font-extrabold leading-none">
                                    {parent.students.length}
                                </div>

                                <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                                    Linked students
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main information */}
            <div className="grid items-start gap-5 xl:grid-cols-2">
                {/* Father */}
                <SectionCard
                    title="Father Information"
                    subtitle="Father's contact and occupation"
                    icon={<UserRound size={20} />}
                >
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <InfoItem
                            label="Father's Name"
                            value={parent.fatherName}
                        />

                        <div>
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                                Father's Phone
                            </div>

                            <PhoneLink value={parent.fatherPhone} />
                        </div>

                        <InfoItem
                            label="Occupation"
                            value={parent.fatherOccupation}
                            icon={<BriefcaseBusiness size={13} />}
                        />
                    </div>
                </SectionCard>

                {/* Mother */}
                <SectionCard
                    title="Mother Information"
                    subtitle="Mother's contact and occupation"
                    icon={<HeartPulse size={20} />}
                >
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <InfoItem
                            label="Mother's Name"
                            value={parent.motherName}
                        />

                        <div>
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                                Mother's Phone
                            </div>

                            <PhoneLink value={parent.motherPhone} />
                        </div>

                        <InfoItem
                            label="Occupation"
                            value={parent.motherOccupation}
                            icon={<BriefcaseBusiness size={13} />}
                        />
                    </div>
                </SectionCard>

                {/* Guardian */}
                <SectionCard
                    title="Alternative Guardian"
                    subtitle="Additional guardian details"
                    icon={<ShieldAlert size={20} />}
                >
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                        <InfoItem
                            label="Guardian Name"
                            value={parent.guardianName}
                        />

                        <div>
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                                Guardian Phone
                            </div>

                            <PhoneLink value={parent.guardianPhone} />
                        </div>

                        <InfoItem
                            label="Relationship"
                            value={parent.guardianRelation}
                        />
                    </div>
                </SectionCard>

                {/* Address and emergency */}
                <SectionCard
                    title="Address & Emergency Contact"
                    subtitle="Residential address and emergency details"
                    icon={<MapPin size={20} />}
                >
                    <div className="space-y-5">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                                <MapPin size={13} />
                                Full Address
                            </div>

                            <div className="whitespace-pre-line break-words rounded-xl bg-[hsl(var(--muted)/.5)] p-4 text-sm leading-6">
                                {display(parent.address)}
                            </div>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                                <Phone size={13} />
                                Emergency Contact
                            </div>

                            <PhoneLink value={parent.emergencyContact} />
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Linked students */}
            <SectionCard
                title="Linked Students"
                subtitle="Students associated with this parent or guardian"
                icon={<GraduationCap size={21} />}
            >
                <div className="no-print mb-5 rounded-xl border border-[hsl(var(--border))] p-4">
                    <h3 className="font-bold">Link a Student</h3>

                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        Select a student who is not currently linked to another parent.
                    </p>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <select
                            value={selectedStudentId}
                            onFocus={() => {
                                if (!availableStudents.length) {
                                    void loadAvailableStudents();
                                }
                            }}
                            onChange={(event) =>
                                setSelectedStudentId(event.target.value)
                            }
                            className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm"
                        >
                            <option value="">Select a student...</option>

                            {availableStudents.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.firstName} {student.lastName}
                                    {' — '}
                                    {student.admissionNumber}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => void loadAvailableStudents()}
                            disabled={actionLoading}
                            className="rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                        >
                            Refresh list
                        </button>

                        <button
                            type="button"
                            onClick={() => void linkStudent()}
                            disabled={!selectedStudentId || actionLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Link2 size={15} />
                            {actionLoading ? 'Please wait...' : 'Link Student'}
                        </button>
                    </div>

                    {actionError && (
                        <p
                            role="alert"
                            className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-600"
                        >
                            {actionError}
                        </p>
                    )}

                    {actionSuccess && (
                        <p
                            role="status"
                            className="mt-3 rounded-lg bg-green-500/10 p-3 text-sm text-green-700"
                        >
                            {actionSuccess}
                        </p>
                    )}
                </div>
                {parent.students.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] px-5 py-10 text-center">
                        <GraduationCap
                            size={30}
                            className="mx-auto text-[hsl(var(--muted-foreground))]"
                        />

                        <h3 className="mt-3 font-bold">
                            No students linked
                        </h3>

                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            No students are currently associated with this parent.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {parent.students.map((student) => (
                            <article
                                key={student.id}
                                className="flex min-w-0 flex-col gap-4 rounded-xl border border-[hsl(var(--border))] p-4 transition hover:border-[hsl(var(--primary)/.4)] sm:flex-row sm:items-center"
                            >
                                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[hsl(var(--muted))]">
                                    {student.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={student.photoUrl}
                                            alt={`${student.firstName} ${student.lastName}`}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <GraduationCap
                                            size={24}
                                            className="text-[hsl(var(--muted-foreground))]"
                                        />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="break-words font-bold">
                                        {student.firstName} {student.lastName}
                                    </h3>

                                    <p className="mt-1 break-all text-xs text-[hsl(var(--muted-foreground))]">
                                        Admission No: {student.admissionNumber}
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                                        {student.gender && (
                                            <span className="inline-flex items-center gap-1">
                                                <UserRound size={13} />
                                                {student.gender}
                                            </span>
                                        )}

                                        {student.dateOfBirth && (
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarDays size={13} />
                                                {formatDate(student.dateOfBirth)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2">
                                        <span className="inline-flex rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold">
                                            {student.status}
                                        </span>
                                    </div>

                                    {student.phone && (
                                        <div className="mt-2">
                                            <PhoneLink value={student.phone} />
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={`/students/${student.id}`}
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold transition hover:bg-[hsl(var(--muted))]"
                                >
                                    <BookOpen size={14} />
                                    View Student
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void unlinkStudent(student)}
                                    disabled={actionLoading}
                                    className="no-print inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
                                >
                                    <Unlink size={14} />
                                    Unlink
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Bottom navigation */}
            <div className="flex flex-wrap justify-between gap-3 border-t border-[hsl(var(--border))] pt-5">
                <button
                    type="button"
                    onClick={() => router.push('/parents')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold transition hover:bg-[hsl(var(--muted))]"
                >
                    <ArrowLeft size={16} />
                    Back to Parents
                </button>

                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            `/parents?edit=${encodeURIComponent(parent.id)}`,
                        )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
                >
                    <Pencil size={15} />
                    Edit Parent
                </button>
            </div>
        </div>
    );
}