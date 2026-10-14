'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Plus,
    Search,
    Users,
    Phone,
    X,
    Pencil,
    Printer,
    Trash2,
    Link2,
    Unlink,
    Eye,
    RefreshCw,
    UserRound,
} from 'lucide-react';

type Student = {
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

type AvailableStudent = {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    status: string;
};

type ApiResult = {
    error?: string;
    message?: string;
    items?: Parent[];
    students?: Student[];
    success?: boolean;
};

const inputClass =
    'w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]';

const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold transition hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50';

async function apiRequest(
    url: string,
    options?: RequestInit,
): Promise<ApiResult> {
    const response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const text = await response.text();

    let result: ApiResult = {};

    if (text.trim()) {
        try {
            result = JSON.parse(text) as ApiResult;
        } catch {
            throw new Error(
                `Invalid server response. HTTP ${response.status}`,
            );
        }
    }

    if (!response.ok) {
        throw new Error(
            result.error || `Request failed. HTTP ${response.status}`,
        );
    }

    return result;
}

function Field({
    label,
    name,
    value,
    onChange,
    type = 'text',
}: {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {label}
            </span>

            <input
                name={name}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={inputClass}
            />
        </label>
    );
}

function ParentForm({
    parent,
    onClose,
    onSaved,
}: {
    parent: Parent | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        fatherName: parent?.fatherName || '',
        fatherPhone: parent?.fatherPhone || '',
        fatherOccupation: parent?.fatherOccupation || '',
        motherName: parent?.motherName || '',
        motherPhone: parent?.motherPhone || '',
        motherOccupation: parent?.motherOccupation || '',
        guardianName: parent?.guardianName || '',
        guardianPhone: parent?.guardianPhone || '',
        guardianRelation: parent?.guardianRelation || '',
        address: parent?.address || '',
        emergencyContact: parent?.emergencyContact || '',
    });

    function update(name: string, value: string) {
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await apiRequest(
                parent ? `/api/parents/${parent.id}` : '/api/parents',
                {
                    method: parent ? 'PATCH' : 'POST',
                    body: JSON.stringify(form),
                },
            );

            onSaved();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save parent.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
            >
                <header className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
                            Parent management
                        </p>

                        <h2 className="mt-1 text-xl font-bold">
                            {parent ? 'Edit Parent' : 'Add Parent'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className={buttonClass}
                    >
                        <X size={17} />
                    </button>
                </header>

                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid gap-5 overflow-y-auto p-5 md:grid-cols-2">
                        <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4">
                            <h3 className="font-bold">Father information</h3>

                            <Field
                                label="Father name"
                                name="fatherName"
                                value={form.fatherName}
                                onChange={(v) => update('fatherName', v)}
                            />

                            <Field
                                label="Father phone"
                                name="fatherPhone"
                                type="tel"
                                value={form.fatherPhone}
                                onChange={(v) => update('fatherPhone', v)}
                            />

                            <Field
                                label="Father occupation"
                                name="fatherOccupation"
                                value={form.fatherOccupation}
                                onChange={(v) =>
                                    update('fatherOccupation', v)
                                }
                            />
                        </section>

                        <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4">
                            <h3 className="font-bold">Mother information</h3>

                            <Field
                                label="Mother name"
                                name="motherName"
                                value={form.motherName}
                                onChange={(v) => update('motherName', v)}
                            />

                            <Field
                                label="Mother phone"
                                name="motherPhone"
                                type="tel"
                                value={form.motherPhone}
                                onChange={(v) => update('motherPhone', v)}
                            />

                            <Field
                                label="Mother occupation"
                                name="motherOccupation"
                                value={form.motherOccupation}
                                onChange={(v) =>
                                    update('motherOccupation', v)
                                }
                            />
                        </section>

                        <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4">
                            <h3 className="font-bold">Alternative guardian</h3>

                            <Field
                                label="Guardian name"
                                name="guardianName"
                                value={form.guardianName}
                                onChange={(v) => update('guardianName', v)}
                            />

                            <Field
                                label="Guardian phone"
                                name="guardianPhone"
                                type="tel"
                                value={form.guardianPhone}
                                onChange={(v) => update('guardianPhone', v)}
                            />

                            <Field
                                label="Relationship"
                                name="guardianRelation"
                                value={form.guardianRelation}
                                onChange={(v) =>
                                    update('guardianRelation', v)
                                }
                            />
                        </section>

                        <section className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4">
                            <h3 className="font-bold">Address & emergency</h3>

                            <label className="block">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                    Full address
                                </span>

                                <textarea
                                    name="address"
                                    rows={3}
                                    value={form.address}
                                    onChange={(event) =>
                                        update('address', event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </label>

                            <Field
                                label="Emergency contact"
                                name="emergencyContact"
                                type="tel"
                                value={form.emergencyContact}
                                onChange={(v) =>
                                    update('emergencyContact', v)
                                }
                            />
                        </section>

                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 md:col-span-2">
                                {error}
                            </div>
                        )}
                    </div>

                    <footer className="flex justify-end gap-2 border-t border-[hsl(var(--border))] p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className={buttonClass}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50"
                        >
                            {saving
                                ? 'Saving...'
                                : parent
                                    ? 'Save changes'
                                    : 'Create parent'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

function ParentDetails({
    parent,
    onClose,
    onChanged,
}: {
    parent: Parent;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [available, setAvailable] = useState<AvailableStudent[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const displayName =
        parent.fatherName ||
        parent.motherName ||
        parent.guardianName ||
        'Parent / Guardian';

    const loadAvailableStudents = useCallback(async () => {
        setLoadingStudents(true);
        setError('');

        try {
            const result = await apiRequest(
                `/api/parents/${parent.id}/students`,
            );

            setAvailable(
                Array.isArray(result.items)
                    ? (result.items as unknown as AvailableStudent[])
                    : [],
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load available students.',
            );
        } finally {
            setLoadingStudents(false);
        }
    }, [parent.id]);

    useEffect(() => {
        void loadAvailableStudents();
    }, [loadAvailableStudents]);

    async function linkStudent() {
        if (!selectedStudent) {
            setError('Please select a student.');
            return;
        }

        setBusy(true);
        setError('');
        setNotice('');

        try {
            await apiRequest(`/api/parents/${parent.id}/students`, {
                method: 'POST',
                body: JSON.stringify({ studentId: selectedStudent }),
            });

            setNotice('Student linked successfully.');
            setSelectedStudent('');
            onChanged();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Could not link student.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function unlinkStudent(student: Student) {
        const name = `${student.firstName} ${student.lastName}`.trim();

        if (
            !window.confirm(
                `Unlink ${name} from this parent? The student record will not be deleted.`,
            )
        ) {
            return;
        }

        setBusy(true);
        setError('');
        setNotice('');

        try {
            await apiRequest(`/api/parents/${parent.id}/students`, {
                method: 'DELETE',
                body: JSON.stringify({ studentId: student.id }),
            });

            setNotice(`${name} unlinked successfully.`);
            onChanged();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not unlink student.',
            );
        } finally {
            setBusy(false);
        }
    }

    function printDetails() {
        const escapeHtml = (value: string | null | undefined) =>
            String(value || 'Not recorded').replace(/[&<>"']/g, (char) => {
                const entities: Record<string, string> = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                };

                return entities[char];
            });

        const studentRows = parent.students.length
            ? parent.students
                .map(
                    (student) => `
                        <tr>
                            <td>${escapeHtml(student.admissionNumber)}</td>
                            <td>${escapeHtml(`${student.firstName} ${student.lastName}`)}</td>
                            <td>${escapeHtml(student.status)}</td>
                        </tr>`,
                )
                .join('')
            : '<tr><td colspan="3">No students linked</td></tr>';

        const html = `
            <!doctype html>
            <html>
            <head>
                <title>Parent Details - ${escapeHtml(displayName)}</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #222; padding: 28px; }
                    h1 { margin-bottom: 4px; }
                    .muted { color: #666; font-size: 13px; }
                    h2 { margin-top: 28px; font-size: 17px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .item { border: 1px solid #ddd; padding: 12px; border-radius: 6px; }
                    .label { font-size: 10px; text-transform: uppercase; color: #666; }
                    .value { margin-top: 5px; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                    th, td { border: 1px solid #ddd; text-align: left; padding: 9px; font-size: 12px; }
                    th { background: #f2f2f2; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(displayName)}</h1>
                <div class="muted">Parent / Guardian Details</div>

                <h2>Family information</h2>
                <div class="grid">
                    <div class="item"><div class="label">Father</div><div class="value">${escapeHtml(parent.fatherName)}</div><p>${escapeHtml(parent.fatherPhone)}</p><p>${escapeHtml(parent.fatherOccupation)}</p></div>
                    <div class="item"><div class="label">Mother</div><div class="value">${escapeHtml(parent.motherName)}</div><p>${escapeHtml(parent.motherPhone)}</p><p>${escapeHtml(parent.motherOccupation)}</p></div>
                    <div class="item"><div class="label">Guardian</div><div class="value">${escapeHtml(parent.guardianName)}</div><p>${escapeHtml(parent.guardianPhone)}</p><p>${escapeHtml(parent.guardianRelation)}</p></div>
                    <div class="item"><div class="label">Contact</div><div class="value">${escapeHtml(parent.emergencyContact)}</div><p>${escapeHtml(parent.address)}</p></div>
                </div>

                <h2>Linked students</h2>
                <table>
                    <thead><tr><th>Admission No.</th><th>Student name</th><th>Status</th></tr></thead>
                    <tbody>${studentRows}</tbody>
                </table>

                <p class="muted">Printed on ${new Date().toLocaleString()}</p>
                <script>window.onload = () => window.print();</script>
            </body>
            </html>`;

        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            setError('Please allow pop-ups to print parent details.');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
            >
                <header className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[hsl(var(--primary)/.1)] p-3 text-[hsl(var(--primary))]">
                            <UserRound size={22} />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
                                Parent details
                            </p>

                            <h2 className="mt-1 text-xl font-bold">
                                {displayName}
                            </h2>

                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                {parent.students.length} linked student(s)
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={buttonClass}
                        aria-label="Close details"
                    >
                        <X size={17} />
                    </button>
                </header>

                <div className="space-y-5 overflow-y-auto p-5">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={printDetails}
                            className={buttonClass}
                        >
                            <Printer size={15} />
                            Print Details
                        </button>

                        <button
                            type="button"
                            onClick={() => void loadAvailableStudents()}
                            disabled={loadingStudents}
                            className={buttonClass}
                        >
                            <RefreshCw
                                size={15}
                                className={
                                    loadingStudents ? 'animate-spin' : ''
                                }
                            />
                            Refresh Students
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            ['Father', parent.fatherName, parent.fatherPhone],
                            ['Mother', parent.motherName, parent.motherPhone],
                            [
                                'Guardian',
                                parent.guardianName,
                                parent.guardianPhone,
                            ],
                            [
                                'Address',
                                parent.address,
                                parent.emergencyContact
                                    ? `Emergency: ${parent.emergencyContact}`
                                    : null,
                            ],
                        ].map(([label, name, phone]) => (
                            <div
                                key={label}
                                className="rounded-xl border border-[hsl(var(--border))] p-4"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                                    {label}
                                </p>

                                <p className="mt-2 font-semibold">
                                    {name || 'Not recorded'}
                                </p>

                                {phone && (
                                    <p className="mt-1 break-words text-sm text-[hsl(var(--muted-foreground))]">
                                        {phone}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
                        >
                            {error}
                        </div>
                    )}

                    {notice && (
                        <div
                            role="status"
                            className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700"
                        >
                            {notice}
                        </div>
                    )}

                    <section className="rounded-xl border border-[hsl(var(--border))] p-4">
                        <h3 className="font-bold">Link a student</h3>

                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            Select a student who is not linked to another
                            parent.
                        </p>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <select
                                value={selectedStudent}
                                onChange={(event) =>
                                    setSelectedStudent(event.target.value)
                                }
                                disabled={loadingStudents || busy}
                                className={inputClass}
                            >
                                <option value="">
                                    {loadingStudents
                                        ? 'Loading students...'
                                        : 'Select student'}
                                </option>

                                {available.map((student) => (
                                    <option
                                        key={student.id}
                                        value={student.id}
                                    >
                                        {student.firstName} {student.lastName}
                                        {' — '}
                                        {student.admissionNumber}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() => void linkStudent()}
                                disabled={!selectedStudent || busy}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50"
                            >
                                <Link2 size={16} />
                                {busy ? 'Please wait...' : 'Link Student'}
                            </button>
                        </div>

                        {!loadingStudents && available.length === 0 && (
                            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                No unlinked students are available.
                            </p>
                        )}
                    </section>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-bold">Linked students</h3>

                            <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold">
                                {parent.students.length}
                            </span>
                        </div>

                        {parent.students.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-7 text-center">
                                <Users
                                    size={28}
                                    className="mx-auto text-[hsl(var(--muted-foreground))]"
                                />

                                <p className="mt-2 text-sm font-semibold">
                                    No students linked yet
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {parent.students.map((student) => (
                                    <div
                                        key={student.id}
                                        className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] p-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                {student.firstName}{' '}
                                                {student.lastName}
                                            </p>

                                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                                Admission:{' '}
                                                {student.admissionNumber}
                                                {' · '}
                                                {student.status}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void unlinkStudent(student)
                                            }
                                            disabled={busy}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                                        >
                                            <Unlink size={15} />
                                            Unlink
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <footer className="flex justify-end border-t border-[hsl(var(--border))] p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className={buttonClass}
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default function ParentsPage() {
    const [parents, setParents] = useState<Parent[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Parent | null>(null);
    const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadParents = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const query = search.trim()
                ? `?search=${encodeURIComponent(search.trim())}`
                : '';

            const result = await apiRequest(`/api/parents${query}`);

            setParents(Array.isArray(result.items) ? result.items : []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load parent records.',
            );
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadParents();
        }, 250);

        return () => window.clearTimeout(timer);
    }, [loadParents]);

    async function deleteParent(parent: Parent) {
        const name =
            parent.fatherName ||
            parent.motherName ||
            parent.guardianName ||
            'this parent';

        if (parent.students.length > 0) {
            setError(
                'This parent has linked students. Unlink all students before deleting the parent.',
            );
            return;
        }

        if (
            !window.confirm(
                `Delete ${name}? This action cannot be undone.`,
            )
        ) {
            return;
        }

        setDeletingId(parent.id);
        setError('');
        setNotice('');

        try {
            await apiRequest(`/api/parents/${parent.id}`, {
                method: 'DELETE',
            });

            setNotice(`${name} deleted successfully.`);
            setSelectedParent(null);

            await loadParents();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not delete parent.',
            );
        } finally {
            setDeletingId(null);
        }
    }

    function handleSaved() {
        setFormOpen(false);
        setEditing(null);
        setNotice('Parent record saved successfully.');
        void loadParents();
    }

    async function refreshAfterStudentChange() {
        await loadParents();

        // Reload current parent details so the linked student list is updated.
        if (selectedParent) {
            try {
                const updated = await apiRequest(
                    `/api/parents/${selectedParent.id}`,
                );

                setSelectedParent(updated as unknown as Parent);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Could not refresh parent details.',
                );
            }
        }
    }

    return (
        <div className="page-in">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]">
                        Family records
                    </div>

                    <h1 className="display mt-1 text-3xl font-extrabold">
                        Parents & Guardians
                    </h1>

                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Manage family contacts and linked students.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))]"
                >
                    <Plus size={16} />
                    Add parent
                </button>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                    />

                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search parent name or phone..."
                        className={`${inputClass} pl-10`}
                    />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm">
                    <Users
                        size={16}
                        className="text-[hsl(var(--primary))]"
                    />

                    <span className="font-semibold">{parents.length}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                        parents
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => void loadParents()}
                    disabled={loading}
                    className={buttonClass}
                >
                    <RefreshCw
                        size={15}
                        className={loading ? 'animate-spin' : ''}
                    />
                    Refresh
                </button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600"
                >
                    <span className="break-words">{error}</span>

                    <button
                        type="button"
                        onClick={() => setError('')}
                        aria-label="Dismiss error"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {notice && (
                <div
                    role="status"
                    className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700"
                >
                    <span>{notice}</span>

                    <button
                        type="button"
                        onClick={() => setNotice('')}
                        aria-label="Dismiss message"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="skeleton h-56 rounded-xl"
                        />
                    ))}
                </div>
            ) : parents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
                    <Users
                        size={30}
                        className="mx-auto text-[hsl(var(--muted-foreground))]"
                    />

                    <h2 className="mt-3 font-bold">
                        {search ? 'No matching parents' : 'No parent records'}
                    </h2>

                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        {search
                            ? 'Try another name or phone number.'
                            : 'Add a parent or guardian to start the family register.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {parents.map((parent) => {
                        const displayName =
                            parent.fatherName ||
                            parent.motherName ||
                            parent.guardianName ||
                            'Parent / Guardian';

                        return (
                            <section
                                key={parent.id}
                                className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                            >
                                <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="display text-lg font-bold">
                                            {displayName}
                                        </h2>

                                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                            {parent.students.length}{' '}
                                            {parent.students.length === 1
                                                ? 'student'
                                                : 'students'}{' '}
                                            linked
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(parent);
                                            setFormOpen(true);
                                        }}
                                        className={buttonClass}
                                    >
                                        <Pencil size={14} />
                                        Edit
                                    </button>
                                </div>

                                <div className="grid gap-4 p-5 sm:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                            Father
                                        </div>

                                        <p className="mt-1 text-sm font-semibold">
                                            {parent.fatherName || 'Not recorded'}
                                        </p>

                                        {parent.fatherPhone && (
                                            <a
                                                href={`tel:${parent.fatherPhone}`}
                                                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]"
                                            >
                                                <Phone size={12} />
                                                {parent.fatherPhone}
                                            </a>
                                        )}
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                            Mother
                                        </div>

                                        <p className="mt-1 text-sm font-semibold">
                                            {parent.motherName || 'Not recorded'}
                                        </p>

                                        {parent.motherPhone && (
                                            <a
                                                href={`tel:${parent.motherPhone}`}
                                                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]"
                                            >
                                                <Phone size={12} />
                                                {parent.motherPhone}
                                            </a>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                            Linked students
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {parent.students.map((student) => (
                                                <span
                                                    key={student.id}
                                                    className="rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-xs font-semibold"
                                                >
                                                    {student.firstName}{' '}
                                                    {student.lastName}
                                                    <span className="ml-1 text-[hsl(var(--muted-foreground))]">
                                                        · {student.admissionNumber}
                                                    </span>
                                                </span>
                                            ))}

                                            {parent.students.length === 0 && (
                                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                                    No students linked yet
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {parent.address && (
                                        <div className="sm:col-span-2">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                                                Address
                                            </div>

                                            <p className="mt-1 whitespace-pre-line text-sm">
                                                {parent.address}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <footer className="flex flex-wrap gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/.25)] p-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedParent(parent)
                                        }
                                        className={buttonClass}
                                    >
                                        <Eye size={15} />
                                        View Details
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedParent(parent);
                                        }}
                                        className={buttonClass}
                                    >
                                        <Link2 size={15} />
                                        Link / Unlink
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedParent(parent);
                                            window.setTimeout(() => {
                                                // Print is available inside View Details.
                                            }, 0);
                                        }}
                                        className={buttonClass}
                                    >
                                        <Printer size={15} />
                                        Print / Details
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => void deleteParent(parent)}
                                        disabled={
                                            deletingId === parent.id ||
                                            parent.students.length > 0
                                        }
                                        title={
                                            parent.students.length > 0
                                                ? 'Unlink students before deleting'
                                                : 'Delete parent'
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Trash2 size={15} />
                                        {deletingId === parent.id
                                            ? 'Deleting...'
                                            : 'Delete'}
                                    </button>
                                </footer>
                            </section>
                        );
                    })}
                </div>
            )}

            {formOpen && (
                <ParentForm
                    parent={editing}
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                    onSaved={handleSaved}
                />
            )}

            {selectedParent && (
                <ParentDetails
                    parent={selectedParent}
                    onClose={() => setSelectedParent(null)}
                    onChanged={() => void refreshAfterStudentChange()}
                />
            )}
        </div>
    );
}