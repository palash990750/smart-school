'use client';

import {
    BookOpen,
    Check,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    X,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

type SchoolClass = {
    id: string;
    name: string;
    capacity?: number;
};

type ClassSubject = {
    id: string;
    classId: string;
    name: string;
    code: string | null;
    defaultMaxMarks: number;
    defaultPassMarks: number;
    active: boolean;
};

type ApiResponse = {
    items?: unknown[];
    classes?: unknown[];
    error?: string;
    message?: string;
}

/* =========================================================
   HELPERS
   ========================================================= */

async function readJson(
    response: Response,
): Promise<ApiResponse> {
    const text = await response.text();

    if (!text.trim()) {
        if (!response.ok) {
            throw new Error(
                `Request failed with status ${response.status}.`,
            );
        }

        return {};
    }

    let data: ApiResponse;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `Server returned invalid JSON (${response.status}).`,
        );
    }

    if (!response.ok) {
        const errorMessage =
            !Array.isArray(data)
                ? data?.error ||
                data?.message
                : undefined;

        throw new Error(
            errorMessage ||
            `Request failed with status ${response.status}.`,
        );
    }

    return data;
}

/* =========================================================
   PAGE
   ========================================================= */

export default function SubjectsPage() {
    const [classes, setClasses] =
        useState<SchoolClass[]>([]);

    const [selectedClassId, setSelectedClassId] =
        useState('');

    const [subjects, setSubjects] =
        useState<ClassSubject[]>([]);

    const [loadingClasses, setLoadingClasses] =
        useState(true);

    const [loadingSubjects, setLoadingSubjects] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState('');

    const [error, setError] =
        useState('');

    const [showAddForm, setShowAddForm] =
        useState(false);

    const [subjectName, setSubjectName] =
        useState('');

    const [subjectCode, setSubjectCode] =
        useState('');

    const [maxMarks, setMaxMarks] =
        useState('100');

    const [passMarks, setPassMarks] =
        useState('33');

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [editName, setEditName] =
        useState('');

    const [editCode, setEditCode] =
        useState('');

    const [editMaxMarks, setEditMaxMarks] =
        useState('100');

    const [editPassMarks, setEditPassMarks] =
        useState('33');

    /* =======================================================
       SELECTED CLASS
       ======================================================= */

    const selectedClass = useMemo(
        () =>
            classes.find(
                (item) =>
                    item.id === selectedClassId,
            ) ?? null,
        [classes, selectedClassId],
    );

    /* =======================================================
       LOAD CLASSES
       ======================================================= */

    async function loadClasses() {
        try {
            setLoadingClasses(true);
            setError('');

            const response = await fetch(
                '/api/academic/classes',
                {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'same-origin',
                },
            );

            const data =
                await readJson(response);

            /*
             * /api/academic/classes currently returns
             * the class list directly as an array.
             *
             * This also supports { items: [] } and
             * { classes: [] } so the page remains compatible
             * with either response format.
             */
            let rawItems: unknown[] = [];

            if (Array.isArray(data)) {
                rawItems = data;
            } else if (Array.isArray(data.items)) {
                rawItems = data.items;
            } else if (Array.isArray(data.classes)) {
                rawItems = data.classes;
            }

            const mapped: SchoolClass[] =
                rawItems
                    .filter(
                        (item: any) =>
                            item &&
                            typeof item.id === 'string',
                    )
                    .map(
                        (item: any) => ({
                            id: String(item.id),
                            name: String(
                                item.name ??
                                'Unnamed Class',
                            ),
                            capacity:
                                item.capacity !==
                                    undefined &&
                                    item.capacity !== null
                                    ? Number(
                                        item.capacity,
                                    )
                                    : undefined,
                        }),
                    );

            setClasses(mapped);

            /*
             * Keep the currently selected class if it
             * still exists. Otherwise select the first
             * available class automatically.
             */
            if (
                mapped.length > 0 &&
                !mapped.some(
                    (item) =>
                        item.id ===
                        selectedClassId,
                )
            ) {
                setSelectedClassId(
                    mapped[0].id,
                );
            }

            if (!mapped.length) {
                setSelectedClassId('');
                setSubjects([]);
            }
        } catch (err) {
            console.error(
                'Could not load classes:',
                err,
            );

            setClasses([]);
            setSelectedClassId('');
            setSubjects([]);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load classes.',
            );
        } finally {
            setLoadingClasses(false);
        }
    }

    /* =======================================================
       LOAD SUBJECTS
       ======================================================= */

    async function loadSubjects(
        classId: string,
    ) {
        if (!classId) {
            setSubjects([]);
            return;
        }

        try {
            setLoadingSubjects(true);
            setError('');

            const response =
                await fetch(
                    `/api/class-subjects?classId=${encodeURIComponent(
                        classId,
                    )}`,
                    {
                        method: 'GET',
                        cache: 'no-store',
                    },
                );

            const data =
                await readJson(response);

            const rawItems =
                Array.isArray(data.items)
                    ? data.items
                    : [];

            const mapped: ClassSubject[] =
                rawItems
                    .filter(
                        (item: any) =>
                            item &&
                            typeof item.id ===
                            'string',
                    )
                    .map(
                        (item: any) => ({
                            id: String(
                                item.id,
                            ),
                            classId: String(
                                item.classId ??
                                classId,
                            ),
                            name: String(
                                item.name ?? '',
                            ),
                            code:
                                item.code !== null &&
                                    item.code !==
                                    undefined &&
                                    String(
                                        item.code,
                                    ).trim()
                                    ? String(
                                        item.code,
                                    )
                                    : null,
                            defaultMaxMarks:
                                Number(
                                    item.defaultMaxMarks ??
                                    100,
                                ),
                            defaultPassMarks:
                                Number(
                                    item.defaultPassMarks ??
                                    33,
                                ),
                            active:
                                Boolean(
                                    item.active,
                                ),
                        }),
                    );

            setSubjects(mapped);
        } catch (err) {
            console.error(
                'Could not load subjects:',
                err,
            );

            setSubjects([]);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load subjects.',
            );
        } finally {
            setLoadingSubjects(false);
        }
    }

    /* =======================================================
       INITIAL LOAD
       ======================================================= */

    useEffect(() => {
        void loadClasses();
    }, []);

    /* =======================================================
       CLASS CHANGE
       ======================================================= */

    useEffect(() => {
        if (selectedClassId) {
            void loadSubjects(
                selectedClassId,
            );
        } else {
            setSubjects([]);
        }
    }, [selectedClassId]);

    /* =======================================================
       ADD SUBJECT
       ======================================================= */

    async function addSubject(
        event: React.FormEvent,
    ) {
        event.preventDefault();

        if (!selectedClassId) {
            setError(
                'Please select a class first.',
            );
            return;
        }

        const name =
            subjectName.trim();

        if (!name) {
            setError(
                'Subject name is required.',
            );
            return;
        }

        const max =
            Number(maxMarks);

        const pass =
            Number(passMarks);

        if (
            !Number.isFinite(max) ||
            max <= 0
        ) {
            setError(
                'Full marks must be greater than 0.',
            );
            return;
        }

        if (
            !Number.isFinite(pass) ||
            pass < 0 ||
            pass > max
        ) {
            setError(
                'Pass marks must be between 0 and full marks.',
            );
            return;
        }

        try {
            setSaving(true);
            setError('');
            setMessage('');

            const response =
                await fetch(
                    '/api/class-subjects',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            classId:
                                selectedClassId,
                            name,
                            code:
                                subjectCode.trim() ||
                                null,
                            defaultMaxMarks:
                                max,
                            defaultPassMarks:
                                pass,
                        }),
                    },
                );

            const data =
                await readJson(response);

            /*
             * The API defaults to 100/33.
             * If custom marks were entered,
             * update the newly-created subject
             * through the edit endpoint below.
             */
            const created =
                data?.items?.[0] as
                | ClassSubject
                | undefined;

            if (
                created &&
                (Number(
                    created.defaultMaxMarks,
                ) !== max ||
                    Number(
                        created.defaultPassMarks,
                    ) !== pass)
            ) {
                const updateResponse =
                    await fetch(
                        `/api/class-subjects/${encodeURIComponent(
                            created.id,
                        )}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Content-Type':
                                    'application/json',
                            },
                            body: JSON.stringify({
                                name,
                                code:
                                    subjectCode.trim() ||
                                    null,
                                defaultMaxMarks:
                                    max,
                                defaultPassMarks:
                                    pass,
                            }),
                        },
                    );

                await readJson(
                    updateResponse,
                );
            }

            setSubjectName('');
            setSubjectCode('');
            setMaxMarks('100');
            setPassMarks('33');
            setShowAddForm(false);

            setMessage(
                'Subject added successfully.',
            );

            await loadSubjects(
                selectedClassId,
            );
        } catch (err) {
            console.error(
                'Could not add subject:',
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not add subject.',
            );
        } finally {
            setSaving(false);
        }
    }

    /* =======================================================
       START EDIT
       ======================================================= */

    function startEdit(
        subject: ClassSubject,
    ) {
        setEditingId(subject.id);
        setEditName(subject.name);
        setEditCode(
            subject.code ?? '',
        );
        setEditMaxMarks(
            String(
                subject.defaultMaxMarks,
            ),
        );
        setEditPassMarks(
            String(
                subject.defaultPassMarks,
            ),
        );

        setError('');
        setMessage('');
    }

    /* =======================================================
       CANCEL EDIT
       ======================================================= */

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditCode('');
        setEditMaxMarks('100');
        setEditPassMarks('33');
    }

    /* =======================================================
       SAVE EDIT
       ======================================================= */

    async function saveEdit(
        subjectId: string,
    ) {
        const name =
            editName.trim();

        const max =
            Number(editMaxMarks);

        const pass =
            Number(editPassMarks);

        if (!name) {
            setError(
                'Subject name is required.',
            );
            return;
        }

        if (
            !Number.isFinite(max) ||
            max <= 0
        ) {
            setError(
                'Full marks must be greater than 0.',
            );
            return;
        }

        if (
            !Number.isFinite(pass) ||
            pass < 0 ||
            pass > max
        ) {
            setError(
                'Pass marks must be between 0 and full marks.',
            );
            return;
        }

        try {
            setSaving(true);
            setError('');
            setMessage('');

            const response =
                await fetch(
                    `/api/class-subjects/${encodeURIComponent(
                        subjectId,
                    )}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            name,
                            code:
                                editCode.trim() ||
                                null,
                            defaultMaxMarks:
                                max,
                            defaultPassMarks:
                                pass,
                        }),
                    },
                );

            await readJson(
                response,
            );

            setMessage(
                'Subject updated successfully.',
            );

            cancelEdit();

            await loadSubjects(
                selectedClassId,
            );
        } catch (err) {
            console.error(
                'Could not update subject:',
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not update subject.',
            );
        } finally {
            setSaving(false);
        }
    }

    /* =======================================================
       TOGGLE ACTIVE
       ======================================================= */

    async function toggleSubject(
        subject: ClassSubject,
    ) {
        try {
            setSaving(true);
            setError('');
            setMessage('');

            const response =
                await fetch(
                    `/api/class-subjects/${encodeURIComponent(
                        subject.id,
                    )}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            active:
                                !subject.active,
                        }),
                    },
                );

            await readJson(
                response,
            );

            setMessage(
                subject.active
                    ? 'Subject disabled for this class.'
                    : 'Subject enabled for this class.',
            );

            await loadSubjects(
                selectedClassId,
            );
        } catch (err) {
            console.error(
                'Could not change subject status:',
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not change subject status.',
            );
        } finally {
            setSaving(false);
        }
    }

    /* =======================================================
       DELETE / ARCHIVE
       ======================================================= */

    async function deleteSubject(
        subject: ClassSubject,
    ) {
        const confirmed =
            window.confirm(
                `Disable "${subject.name}" for ${selectedClass?.name ?? 'this class'}?\n\nExisting exam records will not be deleted.`,
            );

        if (!confirmed) {
            return;
        }

        await toggleSubject(
            subject,
        );
    }

    /* =======================================================
       RENDER
       ======================================================= */

    return (
        <div className="space-y-6 pb-10">

            {/* ===================================================
          HEADER
          =================================================== */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
                            <BookOpen
                                size={22}
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Subjects
                            </h1>

                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                Manage subjects class-wise for the current academic session.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setError('');
                        setMessage('');
                        void loadClasses();

                        if (
                            selectedClassId
                        ) {
                            void loadSubjects(
                                selectedClassId,
                            );
                        }
                    }}
                    disabled={
                        loadingClasses ||
                        loadingSubjects
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={
                            loadingClasses ||
                                loadingSubjects
                                ? 'animate-spin'
                                : ''
                        }
                    />

                    Refresh
                </button>
            </div>

            {/* ===================================================
          MESSAGES
          =================================================== */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                    <div className="flex items-center gap-2">
                        <Check
                            size={17}
                        />
                        {message}
                    </div>
                </div>
            )}

            {/* ===================================================
          CLASS SELECT
          =================================================== */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">

                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">

                    <div>
                        <label
                            htmlFor="class-select"
                            className="mb-2 block text-sm font-semibold"
                        >
                            Select Class
                        </label>

                        <select
                            id="class-select"
                            value={
                                selectedClassId
                            }
                            onChange={(event) => {
                                setSelectedClassId(
                                    event.target.value,
                                );
                                setError('');
                                setMessage('');
                                cancelEdit();
                            }}
                            disabled={
                                loadingClasses
                            }
                            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]"
                        >
                            <option value="">
                                {loadingClasses
                                    ? 'Loading classes...'
                                    : classes.length
                                        ? 'Select class'
                                        : 'No classes found'}
                            </option>

                            {classes.map(
                                (schoolClass) => (
                                    <option
                                        key={
                                            schoolClass.id
                                        }
                                        value={
                                            schoolClass.id
                                        }
                                    >
                                        {schoolClass.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    {selectedClass && (
                        <div className="rounded-xl bg-[hsl(var(--muted)/.65)] px-4 py-3 text-sm">
                            <div className="font-semibold">
                                {selectedClass.name}
                            </div>

                            <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                                {
                                    subjects.filter(
                                        (subject) =>
                                            subject.active,
                                    ).length
                                }{' '}
                                active subjects
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===================================================
          NO CLASS
          =================================================== */}
            {!loadingClasses &&
                classes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
                        <BookOpen
                            size={36}
                            className="mx-auto opacity-40"
                        />

                        <h2 className="mt-4 text-lg font-bold">
                            No classes found
                        </h2>

                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Create a class first from Classes & sections.
                        </p>
                    </div>
                )}

            {/* ===================================================
          SUBJECT AREA
          =================================================== */}
            {selectedClass && (
                <div className="space-y-5">

                    {/* HEADER */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                            <h2 className="text-lg font-bold">
                                {selectedClass.name}{' '}
                                Subjects
                            </h2>

                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                These subjects will be available for this class.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(
                                    (value) =>
                                        !value,
                                );
                                setError('');
                                setMessage('');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90"
                        >
                            {showAddForm ? (
                                <X size={17} />
                            ) : (
                                <Plus size={17} />
                            )}

                            {showAddForm
                                ? 'Close'
                                : 'Add Subject'}
                        </button>
                    </div>

                    {/* =================================================
              ADD FORM
              ================================================= */}
                    {showAddForm && (
                        <form
                            onSubmit={addSubject}
                            className="rounded-2xl border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.04)] p-5"
                        >
                            <div className="mb-4">
                                <h3 className="font-bold">
                                    Add Subject
                                </h3>

                                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                    This subject will belong only to {selectedClass.name}.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-4">

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold">
                                        Subject Name *
                                    </label>

                                    <input
                                        value={
                                            subjectName
                                        }
                                        onChange={(event) =>
                                            setSubjectName(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        placeholder="e.g. Mathematics"
                                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold">
                                        Code
                                    </label>

                                    <input
                                        value={
                                            subjectCode
                                        }
                                        onChange={(event) =>
                                            setSubjectCode(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        placeholder="Optional"
                                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold">
                                        Full Marks
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        value={
                                            maxMarks
                                        }
                                        onChange={(event) => {
                                            const value =
                                                event.target
                                                    .value;

                                            setMaxMarks(
                                                value,
                                            );

                                            const numeric =
                                                Number(
                                                    value,
                                                );

                                            if (
                                                Number.isFinite(
                                                    numeric,
                                                )
                                            ) {
                                                setPassMarks(
                                                    String(
                                                        Math.ceil(
                                                            numeric *
                                                            0.33,
                                                        ),
                                                    ),
                                                );
                                            }
                                        }}
                                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold">
                                        Pass Marks
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            passMarks
                                        }
                                        onChange={(event) =>
                                            setPassMarks(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))]"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Plus
                                            size={16}
                                        />
                                    )}

                                    Add Subject
                                </button>
                            </div>
                        </form>
                    )}

                    {/* =================================================
              LOADING
              ================================================= */}
                    {loadingSubjects && (
                        <div className="flex items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-14">
                            <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                                <Loader2
                                    size={20}
                                    className="animate-spin"
                                />

                                Loading subjects...
                            </div>
                        </div>
                    )}

                    {/* =================================================
              SUBJECT TABLE
              ================================================= */}
                    {!loadingSubjects && (
                        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">

                                    <thead>
                                        <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">

                                            <th className="px-4 py-3 text-left font-semibold">
                                                #
                                            </th>

                                            <th className="px-4 py-3 text-left font-semibold">
                                                Subject
                                            </th>

                                            <th className="px-4 py-3 text-left font-semibold">
                                                Code
                                            </th>

                                            <th className="px-4 py-3 text-center font-semibold">
                                                Full Marks
                                            </th>

                                            <th className="px-4 py-3 text-center font-semibold">
                                                Pass Marks
                                            </th>

                                            <th className="px-4 py-3 text-center font-semibold">
                                                Status
                                            </th>

                                            <th className="px-4 py-3 text-right font-semibold">
                                                Action
                                            </th>

                                        </tr>
                                    </thead>

                                    <tbody>
                                        {subjects.map(
                                            (
                                                subject,
                                                index,
                                            ) => (
                                                <tr
                                                    key={
                                                        subject.id
                                                    }
                                                    className="border-b border-[hsl(var(--border))] last:border-0"
                                                >

                                                    {editingId ===
                                                        subject.id ? (
                                                        <>
                                                            <td className="px-4 py-3">
                                                                {index +
                                                                    1}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <input
                                                                    value={
                                                                        editName
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditName(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2 text-sm"
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <input
                                                                    value={
                                                                        editCode
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditCode(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2 text-sm"
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={
                                                                        editMaxMarks
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditMaxMarks(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-24 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2 text-center text-sm"
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={
                                                                        editPassMarks
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditPassMarks(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-24 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-2 text-center text-sm"
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3 text-center">
                                                                <span className="text-xs font-semibold text-amber-600">
                                                                    Editing
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end gap-2">

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            void saveEdit(
                                                                                subject.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            saving
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--primary-foreground))]"
                                                                    >
                                                                        <Save
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                        Save
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            cancelEdit
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold"
                                                                    >
                                                                        <X
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                        Cancel
                                                                    </button>

                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                                                                {index +
                                                                    1}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="font-semibold">
                                                                    {
                                                                        subject.name
                                                                    }
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                                                                {subject.code ||
                                                                    '—'}
                                                            </td>

                                                            <td className="px-4 py-3 text-center font-semibold">
                                                                {
                                                                    subject.defaultMaxMarks
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3 text-center">
                                                                {
                                                                    subject.defaultPassMarks
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3 text-center">
                                                                {subject.active ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                                        <Check
                                                                            size={
                                                                                13
                                                                            }
                                                                        />
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                                        Inactive
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end gap-2">

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                subject,
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                                                                    >
                                                                        Edit
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            void toggleSubject(
                                                                                subject,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            saving
                                                                        }
                                                                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                                                                    >
                                                                        {subject.active
                                                                            ? 'Disable'
                                                                            : 'Enable'}
                                                                    </button>

                                                                    {subject.active && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                void deleteSubject(
                                                                                    subject,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                saving
                                                                            }
                                                                            title="Disable subject"
                                                                            className="grid size-8 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                                        >
                                                                            <Trash2
                                                                                size={
                                                                                    14
                                                                                }
                                                                            />
                                                                        </button>
                                                                    )}

                                                                </div>
                                                            </td>
                                                        </>
                                                    )}

                                                </tr>
                                            ),
                                        )}

                                        {subjects.length ===
                                            0 && (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-6 py-14 text-center"
                                                    >
                                                        <BookOpen
                                                            size={34}
                                                            className="mx-auto opacity-35"
                                                        />

                                                        <div className="mt-3 font-semibold">
                                                            No subjects added
                                                        </div>

                                                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                                            Add the subjects for{' '}
                                                            {
                                                                selectedClass.name
                                                            }{' '}
                                                            to use them in Annual and Final exams.
                                                        </p>
                                                    </td>
                                                </tr>
                                            )}

                                    </tbody>
                                </table>
                            </div>

                            {/* =================================================
                  FOOTER
                  ================================================= */}
                            {subjects.length >
                                0 && (
                                    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                                        Active subjects:{' '}
                                        <strong className="text-[hsl(var(--foreground))]">
                                            {
                                                subjects.filter(
                                                    (subject) =>
                                                        subject.active,
                                                ).length
                                            }
                                        </strong>{' '}
                                        /{' '}
                                        {subjects.length}
                                    </div>
                                )}

                        </div>
                    )}
                </div>
            )}
        </div>
    );
}