'use client';

import { useEffect, useState, type FormEvent } from 'react';

import {
    ClipboardList,
    Plus,
    Search,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Eye,
    Pencil,
    X,
} from 'lucide-react';

type SchoolClass = {
    id: string;
    name: string;
    sections?: {
        id: string;
        name: string;
    }[];
};

type ClassSubject = {
    id: string;
    classId: string;
    name: string;
    code?: string | null;
    defaultMaxMarks: number;
    defaultPassMarks: number;
    active: boolean;
};

type ExamSubject = {
    id: string;
    name: string;
    code?: string | null;
    maxMarks: number;
    passMarks: number;
    _count?: {
        results: number;
    };
};

type Exam = {
    id: string;
    name: string;
    examType: string;
    startDate: string;
    endDate: string;
    totalMarks: number;
    status: string;
    remarks?: string | null;
    class: {
        id: string;
        name: string;
    };
    section?: {
        id: string;
        name: string;
    } | null;
    subjects: ExamSubject[];
};

const inputClass =
    'w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]';

const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

function formatDate(value: string) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function StatusBadge({ status }: { status: string }) {
    const normalizedStatus = status
        .toUpperCase()
        .trim();

    const isPublished =
        normalizedStatus === 'PUBLISHED';

    const isCompleted =
        normalizedStatus === 'COMPLETED';

    const isDraft =
        normalizedStatus === 'DRAFT';

    const label = isPublished
        ? 'Published'
        : isCompleted
            ? 'Completed'
            : isDraft
                ? 'Draft'
                : status.replaceAll('_', ' ');

    const className = isPublished
        ? 'bg-emerald-100 text-emerald-800'
        : isCompleted
            ? 'bg-blue-100 text-blue-800'
            : 'bg-amber-100 text-amber-800';

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}
        >
            {label}
        </span>
    );
}

export function ExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);

    const [classes, setClasses] =
        useState<SchoolClass[]>([]);

    const [classSubjects, setClassSubjects] =
        useState<ClassSubject[]>([]);

    const [loadingClassSubjects, setLoadingClassSubjects] =
        useState(false);

    const [sessionName, setSessionName] =
        useState('');

    const [search, setSearch] =
        useState('');

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [showForm, setShowForm] =
        useState(false);

    const [editingExamId, setEditingExamId] =
        useState<string | null>(null);

    const [viewingExam, setViewingExam] =
        useState<Exam | null>(null);

    const [selectedExam, setSelectedExam] =
        useState<Exam | null>(null);

    const [message, setMessage] =
        useState('');

    const [error, setError] =
        useState('');

    /*
     * Exam filters
     */
    const [examTypeFilter, setExamTypeFilter] =
        useState('');

    const [classFilter, setClassFilter] =
        useState('');

    const [statusFilter, setStatusFilter] =
        useState('');

    const [form, setForm] = useState({
        name: '',
        examType: 'TERM',
        classId: '',
        sectionId: '',
        startDate: '',
        endDate: '',
        totalMarks: '100',
        remarks: '',
    });

    const [subjectForm, setSubjectForm] =
        useState({
            name: '',
            code: '',
            maxMarks: '100',
            passMarks: '33',
        });

    const selectedClass = classes.find(
        (item) => item.id === form.classId,
    );

    const availableSections =
        selectedClass?.sections ?? [];

    async function loadData() {
        setLoading(true);
        setError('');

        try {
            const [
                examResponse,
                classResponse,
            ] = await Promise.all([
                fetch('/api/exams', {
                    cache: 'no-store',
                }),

                fetch('/api/academic/classes', {
                    cache: 'no-store',
                }),
            ]);

            const examData =
                await examResponse
                    .json()
                    .catch(() => ({}));

            const classData =
                await classResponse
                    .json()
                    .catch(() => ({}));

            if (!examResponse.ok) {
                throw new Error(
                    examData.error ||
                    'Could not load exams.',
                );
            }

            if (!classResponse.ok) {
                throw new Error(
                    classData.error ||
                    'Could not load classes.',
                );
            }

            setExams(
                Array.isArray(examData.items)
                    ? examData.items
                    : [],
            );

            setSessionName(
                examData.session?.name ?? '',
            );

            const classItems: SchoolClass[] =
                Array.isArray(classData)
                    ? classData
                    : Array.isArray(
                        classData?.items,
                    )
                        ? classData.items
                        : Array.isArray(
                            classData?.classes,
                        )
                            ? classData.classes
                            : [];

            setClasses(classItems);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load exam data.',
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadClassSubjects(classId: string) {
        if (!classId) {
            setClassSubjects([]);
            return;
        }

        setLoadingClassSubjects(true);

        try {
            const response = await fetch(
                `/api/class-subjects?classId=${encodeURIComponent(classId)}`,
                {
                    method: 'GET',
                    cache: 'no-store',
                    credentials: 'same-origin',
                },
            );

            const text = await response.text();

            let data: any = {};

            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                throw new Error(
                    `Server returned invalid JSON (HTTP ${response.status}).`,
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    'Could not load class subjects.',
                );
            }

            const items = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : [];

            setClassSubjects(
                items.filter(
                    (subject: ClassSubject) =>
                        subject &&
                        subject.active !== false,
                ),
            );
        } catch (err) {
            console.error(
                'Load class subjects error:',
                err,
            );

            setClassSubjects([]);
        } finally {
            setLoadingClassSubjects(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    async function createExam(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const normalizedExamType =
                (form.examType ?? 'TERM')
                    .trim()
                    .toUpperCase();

            const isAnnualOrFinal =
                normalizedExamType === 'ANNUAL' ||
                normalizedExamType === 'FINAL';

            /*
             * Annual / Final:
             * Use subjects assigned to the selected class.
             */
            const examSubjects =
                isAnnualOrFinal
                    ? classSubjects.map(
                        (subject) => ({
                            classSubjectId:
                                subject.id,

                            maxMarks:
                                Number(
                                    subject.defaultMaxMarks,
                                ),

                            passMarks:
                                Number(
                                    subject.defaultPassMarks,
                                ),
                        }),
                    )
                    : [];

            /*
             * Prevent creating Annual / Final
             * without class subjects.
             */
            if (
                isAnnualOrFinal &&
                examSubjects.length === 0
            ) {
                throw new Error(
                    'No subjects found for the selected class. Please add subjects from Subjects first.',
                );
            }

            /*
             * Annual / Final total marks are
             * automatically calculated from subjects.
             */
            const calculatedTotalMarks =
                isAnnualOrFinal
                    ? examSubjects.reduce(
                        (
                            total,
                            subject,
                        ) =>
                            total +
                            Number(
                                subject.maxMarks,
                            ),
                        0,
                    )
                    : Number(
                        form.totalMarks,
                    );

            const response = await fetch(
                '/api/exams',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',
                    },

                    credentials:
                        'same-origin',

                    body: JSON.stringify({
                        ...form,

                        examType:
                            normalizedExamType,

                        sectionId:
                            form.sectionId ||
                            null,

                        totalMarks:
                            calculatedTotalMarks,

                        remarks:
                            form.remarks ||
                            null,

                        subjects:
                            examSubjects,
                    }),
                },
            );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    'Could not create exam.',
                );
            }

            setMessage(
                isAnnualOrFinal
                    ? 'Exam created successfully with class subjects.'
                    : 'Exam created successfully.',
            );

            setShowForm(false);
            setEditingExamId(null);

            setClassSubjects([]);

            setForm({
                name: '',
                examType: 'TERM',
                classId: '',
                sectionId: '',
                startDate: '',
                endDate: '',
                totalMarks: '100',
                remarks: '',
            });

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not create exam.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function publishExam(exam: Exam) {
        const status =
            exam.status.toUpperCase();

        if (status !== 'DRAFT') {
            return;
        }

        const confirmed =
            window.confirm(
                `Publish "${exam.name}"?\n\nAfter publishing, this exam cannot be edited.`,
            );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `/api/exams/${encodeURIComponent(
                    exam.id,
                )}`,
                {
                    method: 'POST',
                    cache: 'no-store',
                },
            );

            const text =
                await response.text();

            let data: any = {};

            try {
                data = text
                    ? JSON.parse(text)
                    : {};
            } catch {
                throw new Error(
                    'Server returned invalid response.',
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    'Could not publish exam.',
                );
            }

            /*
             * Reload the page so the newly
             * published status is immediately shown.
             */
            window.location.reload();
        } catch (publishError) {
            console.error(
                'Publish exam error:',
                publishError,
            );

            window.alert(
                publishError instanceof Error
                    ? publishError.message
                    : 'Could not publish exam.',
            );
        }
    }

    function openEditExam(exam: Exam) {
        const status = exam.status.toUpperCase();

        // Only COMPLETED exams are locked.
        // PUBLISHED exams can still be edited.
        if (status === 'COMPLETED') {
            setError(
                'Completed examinations cannot be edited.',
            );
            return;
        }

        setError('');
        setMessage('');

        setEditingExamId(exam.id);

        setForm({
            name: exam.name,
            examType: exam.examType,
            classId: exam.class.id,
            sectionId: exam.section?.id ?? '',
            startDate: exam.startDate.slice(0, 10),
            endDate: exam.endDate.slice(0, 10),
            totalMarks: String(exam.totalMarks),
            remarks: exam.remarks ?? '',
        });

        setShowForm(true);
    }

    async function updateExam(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!editingExamId) {
            await createExam(event);
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const response =
                await fetch(
                    `/api/exams/${encodeURIComponent(
                        editingExamId,
                    )}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            ...form,
                            sectionId:
                                form.sectionId ||
                                null,
                            totalMarks:
                                Number(
                                    form.totalMarks,
                                ),
                            remarks:
                                form.remarks ||
                                null,
                        }),
                    },
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Could not update exam.',
                );
            }

            setMessage(
                'Exam updated successfully.',
            );

            setShowForm(false);
            setEditingExamId(null);

            setForm({
                name: '',
                examType: 'TERM',
                classId: '',
                sectionId: '',
                startDate: '',
                endDate: '',
                totalMarks: '100',
                remarks: '',
            });

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not update exam.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function openViewExam(
        exam: Exam,
    ) {
        setError('');
        setMessage('');

        try {
            const response =
                await fetch(
                    `/api/exams/${encodeURIComponent(
                        exam.id,
                    )}`,
                    {
                        cache: 'no-store',
                    },
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Could not load exam details.',
                );
            }

            const item =
                data.item ??
                data.exam ??
                data;

            setViewingExam(
                item as Exam,
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load exam details.',
            );
        }
    }

    async function addSubject(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!selectedExam) {
            return;
        }

        const status =
            selectedExam.status.toUpperCase();

        if (
            status === 'PUBLISHED' ||
            status === 'COMPLETED'
        ) {
            setError(
                status === 'COMPLETED'
                    ? 'Completed examinations cannot be modified.'
                    : 'Published examinations cannot be modified.',
            );
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const response =
                await fetch(
                    `/api/exams/${encodeURIComponent(
                        selectedExam.id,
                    )}/subjects`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body: JSON.stringify({
                            ...subjectForm,
                            maxMarks:
                                Number(
                                    subjectForm.maxMarks,
                                ),
                            passMarks:
                                Number(
                                    subjectForm.passMarks,
                                ),
                        }),
                    },
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Could not add subject.',
                );
            }

            setMessage(
                `Subject "${data.name}" added successfully.`,
            );

            setSubjectForm({
                name: '',
                code: '',
                maxMarks: '100',
                passMarks: '33',
            });

            await loadData();

            const updatedResponse =
                await fetch('/api/exams', {
                    cache: 'no-store',
                });

            const updatedData =
                await updatedResponse
                    .json()
                    .catch(() => ({}));

            if (updatedResponse.ok) {
                const updatedExam =
                    (
                        updatedData.items ??
                        []
                    ).find(
                        (item: Exam) =>
                            item.id ===
                            selectedExam.id,
                    );

                if (updatedExam) {
                    setSelectedExam(
                        updatedExam,
                    );
                }
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not add subject.',
            );
        } finally {
            setSaving(false);
        }
    }

    /*
     * Dynamic filter options
     */
    const examTypes = Array.from(
        new Set(
            exams
                .map(
                    (exam) =>
                        exam.examType,
                )
                .filter(Boolean),
        ),
    ).sort((a, b) =>
        a.localeCompare(b),
    );

    const examClasses = Array.from(
        new Map(
            exams
                .filter(
                    (exam) =>
                        Boolean(
                            exam.class?.id,
                        ),
                )
                .map((exam) => [
                    exam.class.id,
                    exam.class.name,
                ]),
        ).entries(),
    ).sort((a, b) =>
        a[1].localeCompare(b[1]),
    );

    /*
     * Filtered exam list
     */
    const filteredExams = exams.filter(
        (exam) => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            const status =
                exam.status.toUpperCase();

            const matchesSearch =
                !query ||
                exam.name
                    .toLowerCase()
                    .includes(query) ||
                exam.class.name
                    .toLowerCase()
                    .includes(query) ||
                exam.examType
                    .toLowerCase()
                    .includes(query);

            const matchesExamType =
                !examTypeFilter ||
                exam.examType ===
                examTypeFilter;

            const matchesClass =
                !classFilter ||
                exam.class.id ===
                classFilter;

            const matchesStatus =
                !statusFilter ||
                status ===
                statusFilter;

            return (
                matchesSearch &&
                matchesExamType &&
                matchesClass &&
                matchesStatus
            );
        },
    );

    /*
     * Summary counts
     */
    const publishedCount =
        exams.filter(
            (exam) =>
                exam.status.toUpperCase() ===
                'PUBLISHED',
        ).length;

    const completedCount =
        exams.filter(
            (exam) =>
                exam.status.toUpperCase() ===
                'COMPLETED',
        ).length;

    const draftCount =
        exams.filter(
            (exam) =>
                exam.status.toUpperCase() ===
                'DRAFT',
        ).length;

    const activeFilterCount =
        Number(Boolean(search.trim())) +
        Number(Boolean(examTypeFilter)) +
        Number(Boolean(classFilter)) +
        Number(Boolean(statusFilter));

    function clearFilters() {
        setSearch('');
        setExamTypeFilter('');
        setClassFilter('');
        setStatusFilter('');
    }

    return (
        <div className="space-y-6 pb-10">
            {/* HEADER */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <ClipboardList size={17} />
                        School / Exams & Results
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight">
                        Exams & Results
                    </h1>

                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Create examinations and manage their subjects.
                        {sessionName
                            ? ` Academic session: ${sessionName}`
                            : ''}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setError('');
                        setMessage('');
                        setEditingExamId(null);

                        setForm({
                            name: '',
                            examType: 'TERM',
                            classId: '',
                            sectionId: '',
                            startDate: '',
                            endDate: '',
                            totalMarks: '100',
                            remarks: '',
                        });

                        setShowForm(true);
                    }}
                    className={buttonClass}
                >
                    <Plus size={17} />
                    Create Exam
                </button>
            </div>

            {/* ERROR */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                >
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setError('')
                        }
                        aria-label="Dismiss error"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* MESSAGE */}
            {message && (
                <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                    {message}
                </div>
            )}

            {/* SUMMARY */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="Total Exams"
                    value={exams.length}
                    icon={
                        <ClipboardList
                            size={21}
                        />
                    }
                    description="Current academic session"
                />

                <SummaryCard
                    title="Draft Exams"
                    value={draftCount}
                    icon={
                        <Clock3 size={21} />
                    }
                    description="Not yet published"
                />

                <SummaryCard
                    title="Published Exams"
                    value={publishedCount}
                    icon={
                        <CheckCircle2
                            size={21}
                        />
                    }
                    description="Published examination records"
                />

                <SummaryCard
                    title="Completed Exams"
                    value={completedCount}
                    icon={
                        <CheckCircle2
                            size={21}
                        />
                    }
                    description="End date has passed"
                />

                <SummaryCard
                    title="Subjects"
                    value={exams.reduce(
                        (sum, exam) =>
                            sum +
                            exam.subjects
                                .length,
                        0,
                    )}
                    icon={
                        <BookOpen size={21} />
                    }
                    description="Across all examinations"
                />
            </div>

            {/* EXAMINATION LIST */}
            <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="border-b border-[hsl(var(--border))] p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div>
                            <h2 className="font-bold">
                                Examination List
                            </h2>

                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                View examinations and manage subjects.
                            </p>
                        </div>

                        {/* SEARCH */}
                        <label className="relative block w-full lg:max-w-sm">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                            />

                            <input
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search exam, class or type..."
                                className={`${inputClass} pl-9`}
                            />
                        </label>
                    </div>

                    {/* FILTERS */}
                    <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.25)] p-3">
                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                                <h3 className="text-sm font-semibold">
                                    Filter Examinations
                                </h3>

                                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                    Filter by exam type, class and status.
                                </p>
                            </div>

                            {activeFilterCount >
                                0 && (
                                    <span className="text-xs font-medium text-[hsl(var(--primary))]">
                                        {
                                            activeFilterCount
                                        }{' '}
                                        filter
                                        {activeFilterCount !==
                                            1
                                            ? 's'
                                            : ''}{' '}
                                        active
                                    </span>
                                )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {/* EXAM TYPE */}
                            <select
                                value={
                                    examTypeFilter
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setExamTypeFilter(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    All Exam Types
                                </option>

                                {examTypes.map(
                                    (type) => (
                                        <option
                                            key={
                                                type
                                            }
                                            value={
                                                type
                                            }
                                        >
                                            {type}
                                        </option>
                                    ),
                                )}
                            </select>

                            {/* CLASS */}
                            <select
                                value={
                                    classFilter
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setClassFilter(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    All Classes
                                </option>

                                {examClasses.map(
                                    ([
                                        id,
                                        name,
                                    ]) => (
                                        <option
                                            key={id}
                                            value={id}
                                        >
                                            {name}
                                        </option>
                                    ),
                                )}
                            </select>

                            {/* STATUS */}
                            <select
                                value={
                                    statusFilter
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setStatusFilter(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            >
                                <option value="">
                                    All Status
                                </option>

                                <option value="DRAFT">
                                    Draft
                                </option>

                                <option value="PUBLISHED">
                                    Published
                                </option>

                                <option value="COMPLETED">
                                    Completed
                                </option>
                            </select>

                            {/* CLEAR */}
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                disabled={
                                    activeFilterCount ===
                                    0
                                }
                                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold transition hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                {loading ? (
                    <div className="p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Loading examinations...
                    </div>
                ) : filteredExams.length ===
                    0 ? (
                    <div className="p-12 text-center">
                        <ClipboardList
                            size={38}
                            className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]"
                        />

                        <h3 className="font-semibold">
                            No examinations found
                        </h3>

                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {activeFilterCount >
                                0
                                ? 'Try changing or clearing your filters.'
                                : 'Create your first exam to get started.'}
                        </p>

                        {activeFilterCount >
                            0 ? (
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className={`${buttonClass} mt-5`}
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setError(
                                        '',
                                    );
                                    setMessage(
                                        '',
                                    );
                                    setEditingExamId(
                                        null,
                                    );
                                    setShowForm(
                                        true,
                                    );
                                }}
                                className={`${buttonClass} mt-5`}
                            >
                                <Plus size={16} />
                                Create Exam
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                                <tr>
                                    <th className="px-5 py-3">
                                        Examination
                                    </th>

                                    <th className="px-5 py-3">
                                        Class / Section
                                    </th>

                                    <th className="px-5 py-3">
                                        Exam Dates
                                    </th>

                                    <th className="px-5 py-3">
                                        Total Marks
                                    </th>

                                    <th className="px-5 py-3">
                                        Subjects
                                    </th>

                                    <th className="px-5 py-3">
                                        Status
                                    </th>

                                    <th className="px-5 py-3">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredExams.map(
                                    (exam) => {
                                        const status =
                                            exam.status.toUpperCase();

                                        const isLocked =
                                            
                                            status ===
                                            'COMPLETED';

                                        return (
                                            <tr
                                                key={
                                                    exam.id
                                                }
                                                className="border-t border-[hsl(var(--border))] transition hover:bg-[hsl(var(--muted)/.3)]"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold">
                                                        {
                                                            exam.name
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                                        {
                                                            exam.examType
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div>
                                                        {
                                                            exam
                                                                .class
                                                                .name
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                                        {exam
                                                            .section
                                                            ?.name ??
                                                            'All sections'}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={
                                                                15
                                                            }
                                                        />

                                                        {formatDate(
                                                            exam.startDate,
                                                        )}
                                                    </div>

                                                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                                        To{' '}
                                                        {formatDate(
                                                            exam.endDate,
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    {
                                                        exam.totalMarks
                                                    }
                                                </td>

                                                <td className="px-5 py-4">
                                                    {
                                                        exam
                                                            .subjects
                                                            .length
                                                    }
                                                </td>

                                                <td className="px-5 py-4">
                                                    <StatusBadge
                                                        status={
                                                            exam.status
                                                        }
                                                    />
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* VIEW */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void openViewExam(
                                                                    exam,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                                                        >
                                                            <Eye
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                            View
                                                        </button>

                                                        {/* PUBLISH - DRAFT ONLY */}
                                                        {status ===
                                                            'DRAFT' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void publishExam(
                                                                            exam,
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--primary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.08)]"
                                                                >
                                                                    Publish
                                                                </button>
                                                            )}

                                                        {/* EDIT */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditExam(
                                                                    exam,
                                                                )
                                                            }
                                                            disabled={
                                                                isLocked
                                                            }
                                                            title={
                                                                status === 'COMPLETED'
                                                                    ? 'Completed examinations cannot be edited'
                                                                    : 'Edit examination'
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Pencil
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                            Edit
                                                        </button>

                                                        {/* MANAGE SUBJECTS */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedExam(
                                                                    exam,
                                                                );
                                                                setError(
                                                                    '',
                                                                );
                                                                setMessage(
                                                                    '',
                                                                );
                                                            }}
                                                            className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold hover:bg-[hsl(var(--muted))]"
                                                        >
                                                            Manage Subjects
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* CREATE / EDIT MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
                    <section className="my-auto w-full max-w-2xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {editingExamId
                                        ? 'Edit Examination'
                                        : 'Create Examination'}
                                </h2>

                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {editingExamId
                                        ? 'Update the examination details below.'
                                        : 'Enter the examination details below.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(
                                        false,
                                    );
                                    setEditingExamId(
                                        null,
                                    );
                                }}
                                className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                editingExamId
                                    ? updateExam
                                    : createExam
                            }
                            className="space-y-4 p-5"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Exam Name *">
                                    <input
                                        required
                                        minLength={2}
                                        maxLength={120}
                                        value={
                                            form.name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                name: event
                                                    .target
                                                    .value,
                                            })
                                        }
                                        placeholder="e.g. First Term Examination"
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField label="Exam Type *">
                                    <select
                                        value={
                                            form.examType
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                examType:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className={
                                            inputClass
                                        }
                                    >
                                        <option value="UNIT_TEST">
                                            Unit Test
                                        </option>

                                        <option value="TERM">
                                            Term Examination
                                        </option>

                                        <option value="HALF_YEARLY">
                                            Half Yearly
                                        </option>

                                        <option value="ANNUAL">
                                            Annual Examination
                                        </option>

                                        <option value="PRACTICAL">
                                            Practical
                                        </option>

                                        <option value="OTHER">
                                            Other
                                        </option>
                                    </select>
                                </FormField>

                                <FormField label="Class *">
                                    <select
                                        required
                                        value={
                                            form.classId
                                        }
                                        onChange={(event) => {
                                            const classId =
                                                event.target.value;

                                            setForm({
                                                ...form,
                                                classId,
                                                sectionId: '',
                                            });

                                            void loadClassSubjects(classId);
                                        }}
                                        className={
                                            inputClass
                                        }
                                    >
                                        <option value="">
                                            Select class
                                        </option>

                                        {classes.map(
                                            (
                                                schoolClass,
                                            ) => (
                                                <option
                                                    key={
                                                        schoolClass.id
                                                    }
                                                    value={
                                                        schoolClass.id
                                                    }
                                                >
                                                    {
                                                        schoolClass.name
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </FormField>

                                <FormField label="Section">
                                    <select
                                        value={
                                            form.sectionId
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                sectionId:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className={
                                            inputClass
                                        }
                                        disabled={
                                            !form.classId
                                        }
                                    >
                                        <option value="">
                                            All sections
                                        </option>

                                        {availableSections.map(
                                            (
                                                section,
                                            ) => (
                                                <option
                                                    key={
                                                        section.id
                                                    }
                                                    value={
                                                        section.id
                                                    }
                                                >
                                                    {
                                                        section.name
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </FormField>

                                <FormField label="Start Date *">
                                    <input
                                        required
                                        type="date"
                                        value={
                                            form.startDate
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                startDate:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField label="End Date *">
                                    <input
                                        required
                                        type="date"
                                        min={
                                            form.startDate ||
                                            undefined
                                        }
                                        value={
                                            form.endDate
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                endDate:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField label="Total Marks *">
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="100000"
                                        step="0.01"
                                        value={
                                            form.totalMarks
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                totalMarks:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField label="Remarks">
                                    <input
                                        value={
                                            form.remarks
                                        }
                                        maxLength={
                                            1000
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                remarks:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        placeholder="Optional notes"
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>
                            </div>

                            <div className="flex flex-col-reverse justify-end gap-3 border-t border-[hsl(var(--border))] pt-4 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(
                                            false,
                                        );
                                        setEditingExamId(
                                            null,
                                        );
                                    }}
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={
                                        buttonClass
                                    }
                                >
                                    <Plus size={16} />

                                    {saving
                                        ? 'Saving...'
                                        : editingExamId
                                            ? 'Update Exam'
                                            : 'Create Exam'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* VIEW EXAM MODAL */}
            {viewingExam && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
                    <section className="my-auto w-full max-w-3xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {
                                        viewingExam.name
                                    }
                                </h2>

                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    Examination details and subjects
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewingExam(
                                        null,
                                    )
                                }
                                className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
                                aria-label="Close examination details"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <DetailItem
                                    label="Exam Type"
                                    value={
                                        viewingExam.examType
                                    }
                                />

                                <DetailItem
                                    label="Class"
                                    value={
                                        viewingExam
                                            .class
                                            ?.name ??
                                        '—'
                                    }
                                />

                                <DetailItem
                                    label="Section"
                                    value={
                                        viewingExam
                                            .section
                                            ?.name ??
                                        'All sections'
                                    }
                                />

                                <DetailItem
                                    label="Start Date"
                                    value={formatDate(
                                        viewingExam.startDate,
                                    )}
                                />

                                <DetailItem
                                    label="End Date"
                                    value={formatDate(
                                        viewingExam.endDate,
                                    )}
                                />

                                <DetailItem
                                    label="Total Marks"
                                    value={String(
                                        viewingExam.totalMarks,
                                    )}
                                />

                                <DetailItem
                                    label="Status"
                                    value={
                                        viewingExam.status.replaceAll(
                                            '_',
                                            ' ',
                                        )
                                    }
                                />

                                <DetailItem
                                    label="Remarks"
                                    value={
                                        viewingExam.remarks ||
                                        '—'
                                    }
                                />
                            </div>

                            <div>
                                <h3 className="mb-3 font-semibold">
                                    Subjects (
                                    {viewingExam
                                        .subjects
                                        ?.length ??
                                        0}
                                    )
                                </h3>

                                {!viewingExam.subjects
                                    ?.length ? (
                                    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                        No subjects added yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
                                        <table className="w-full min-w-[500px] text-left text-sm">
                                            <thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">
                                                        Subject
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Code
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Maximum
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Pass Marks
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {viewingExam.subjects.map(
                                                    (
                                                        subject,
                                                    ) => (
                                                        <tr
                                                            key={
                                                                subject.id
                                                            }
                                                            className="border-t border-[hsl(var(--border))]"
                                                        >
                                                            <td className="px-4 py-3 font-medium">
                                                                {
                                                                    subject.name
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {subject.code ||
                                                                    '—'}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    subject.maxMarks
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    subject.passMarks
                                                                }
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end border-t border-[hsl(var(--border))] pt-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setViewingExam(
                                            null,
                                        )
                                    }
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* MANAGE SUBJECTS MODAL */}
            {selectedExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
                    <section className="my-auto w-full max-w-3xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {
                                        selectedExam.name
                                    }
                                </h2>

                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                    {
                                        selectedExam
                                            .class
                                            .name
                                    }

                                    {selectedExam.section
                                        ? ` / ${selectedExam.section.name}`
                                        : ' / All sections'}

                                    {' · '}

                                    {
                                        selectedExam.examType
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedExam(
                                        null,
                                    )
                                }
                                className="rounded-lg p-2 hover:bg-[hsl(var(--muted))]"
                                aria-label="Close subject manager"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="font-semibold">
                                        Subjects
                                    </h3>

                                    <StatusBadge
                                        status={
                                            selectedExam.status
                                        }
                                    />
                                </div>

                                {selectedExam.subjects
                                    .length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                        No subjects added yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
                                        <table className="w-full min-w-[500px] text-left text-sm">
                                            <thead className="bg-[hsl(var(--muted)/.55)] text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">
                                                        Subject
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Code
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Maximum
                                                    </th>

                                                    <th className="px-4 py-3">
                                                        Pass Marks
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {selectedExam.subjects.map(
                                                    (
                                                        subject,
                                                    ) => (
                                                        <tr
                                                            key={
                                                                subject.id
                                                            }
                                                            className="border-t border-[hsl(var(--border))]"
                                                        >
                                                            <td className="px-4 py-3 font-medium">
                                                                {
                                                                    subject.name
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {subject.code ||
                                                                    '—'}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    subject.maxMarks
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    subject.passMarks
                                                                }
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ADD SUBJECT ONLY FOR DRAFT */}
                            {selectedExam.status.toUpperCase() ===
                                'DRAFT' && (
                                    <form
                                        onSubmit={
                                            addSubject
                                        }
                                        className="space-y-4 rounded-xl border border-[hsl(var(--border))] p-4"
                                    >
                                        <h3 className="font-semibold">
                                            Add Subject
                                        </h3>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField label="Subject Name *">
                                                <input
                                                    required
                                                    maxLength={
                                                        100
                                                    }
                                                    value={
                                                        subjectForm.name
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setSubjectForm(
                                                            {
                                                                ...subjectForm,
                                                                name: event
                                                                    .target
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="e.g. Mathematics"
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </FormField>

                                            <FormField label="Subject Code">
                                                <input
                                                    maxLength={
                                                        30
                                                    }
                                                    value={
                                                        subjectForm.code
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setSubjectForm(
                                                            {
                                                                ...subjectForm,
                                                                code: event
                                                                    .target
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="e.g. MAT101"
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </FormField>

                                            <FormField label="Maximum Marks *">
                                                <input
                                                    required
                                                    type="number"
                                                    min="0.01"
                                                    max="100000"
                                                    step="0.01"
                                                    value={
                                                        subjectForm.maxMarks
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setSubjectForm(
                                                            {
                                                                ...subjectForm,
                                                                maxMarks:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </FormField>

                                            <FormField label="Pass Marks *">
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    max={
                                                        subjectForm.maxMarks ||
                                                        undefined
                                                    }
                                                    step="0.01"
                                                    value={
                                                        subjectForm.passMarks
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setSubjectForm(
                                                            {
                                                                ...subjectForm,
                                                                passMarks:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </FormField>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className={
                                                buttonClass
                                            }
                                        >
                                            <Plus
                                                size={
                                                    16
                                                }
                                            />

                                            {saving
                                                ? 'Saving...'
                                                : 'Add Subject'}
                                        </button>
                                    </form>
                                )}

                            {/* LOCKED MESSAGE */}
                            {selectedExam.status.toUpperCase() !==
                                'DRAFT' && (
                                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.35)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                                        {selectedExam.status.toUpperCase() ===
                                            'COMPLETED'
                                            ? 'This examination is completed. Subjects cannot be modified.'
                                            : 'This examination is published. Subjects cannot be modified.'}
                                    </div>
                                )}

                            <div className="flex justify-end border-t border-[hsl(var(--border))] pt-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedExam(
                                            null,
                                        )
                                    }
                                    className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-[hsl(var(--border))] p-3">
            <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                {label}
            </div>

            <div className="mt-1 break-words text-sm font-semibold">
                {value}
            </div>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon,
    description,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    {title}
                </span>

                <span className="rounded-xl bg-[hsl(var(--primary)/.10)] p-2 text-[hsl(var(--primary))]">
                    {icon}
                </span>
            </div>

            <div className="mt-4 text-3xl font-bold">
                {value}
            </div>

            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {description}
            </p>
        </div>
    );
}

function FormField({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-sm font-medium">
                {label}
            </span>

            {children}
        </label>
    );
}