'use client';

import { useEffect, useMemo, useState } from 'react';

type Exam = {
    id: string;
    name: string;
    examType: string;
    startDate: string;
    endDate: string;
    totalMarks: number;
    status: string;
    class?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
    subjects?: ExamSubject[];
};

type ExamSubject = {
    id: string;
    name: string;
    code?: string | null;
    maxMarks: number;
    passMarks: number;
};

type Student = {
    studentId: string;
    enrollmentId: string;
    admissionNumber: string;
    studentName: string;
    rollNumber?: string | null;
};

type Routine = {
    id: string;
    examId: string;
    examSubjectId: string;
    examDate: string;
    startTime: string;
    endTime: string;
    room?: string | null;
    remarks?: string | null;
    exam?: Exam;
    subject?: ExamSubject;
};

const inputClass =
    'w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]';

const buttonClass =
    'inline-flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';

const secondaryButton =
    'inline-flex items-center justify-center rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]';

/* =========================================================
   SAFE JSON RESPONSE READER
   ========================================================= */

async function readJsonResponse(
    response: Response | string,
): Promise<any> {
    const actualResponse =
        typeof response === 'string'
            ? await fetch(response, {
                cache: 'no-store',
            })
            : response;

    const text = await actualResponse.text();

    if (!text.trim()) {
        if (!actualResponse.ok) {
            throw new Error(
                `Request failed with status ${actualResponse.status}.`,
            );
        }

        return {};
    }

    let data: any;

    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(
            `Server returned invalid JSON (HTTP ${actualResponse.status}).`,
        );
    }

    if (!actualResponse.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            `Request failed with status ${actualResponse.status}.`,
        );
    }

    return data;
}

function money(value: number) {
    return Number(value || 0).toFixed(2);
}

function grade(percentage: number) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
}

/* =========================================================
   RESULTS PAGE
   ========================================================= */

export function ResultsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [examId, setExamId] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<ExamSubject[]>([]);
    const [marks, setMarks] = useState<
        Record<string, Record<string, string>>
    >({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadExams() {
        try {
            const response = await fetch('/api/exams', {
                cache: 'no-store',
            });

            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(
                    data.error || 'Could not load exams.',
                );
            }

            setExams(data.items ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load exams.',
            );
        }
    }

    async function loadResults(selectedExamId: string) {
        if (!selectedExamId) {
            setStudents([]);
            setSubjects([]);
            setMarks({});
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await fetch(
                `/api/results?examId=${encodeURIComponent(selectedExamId)}`,
                {
                    cache: 'no-store',
                    credentials: 'same-origin',
                },
            );

            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    'Could not load results.',
                );
            }

            const apiStudents = Array.isArray(data?.items)
                ? data.items
                : [];

            const apiSubjects = Array.isArray(
                data?.exam?.subjects,
            )
                ? data.exam.subjects
                : [];

            setSubjects(apiSubjects);

            const nextStudents: Student[] =
                apiStudents.map((item: any) => ({
                    studentId: item.studentId,
                    enrollmentId: item.enrollmentId,
                    admissionNumber:
                        item.admissionNumber ?? '',
                    studentName:
                        item.name ?? '',
                    rollNumber:
                        item.rollNumber ?? null,
                }));

            setStudents(nextStudents);

            /*
             * API structure:
             *
             * student.subjects = [
             *   {
             *     examSubjectId: "...",
             *     marks: 12
             *   }
             * ]
             *
             * Convert that into the frontend marks state:
             *
             * marks[studentId][subjectId] = marks
             */
            const nextMarks: Record<
                string,
                Record<string, string>
            > = {};

            for (const item of apiStudents) {
                const studentMarks: Record<
                    string,
                    string
                > = {};

                const subjectRows = Array.isArray(
                    item?.subjects,
                )
                    ? item.subjects
                    : [];

                for (const row of subjectRows) {
                    if (
                        row?.examSubjectId &&
                        row?.marks !== null &&
                        row?.marks !== undefined
                    ) {
                        studentMarks[
                            row.examSubjectId
                        ] = String(row.marks);
                    }
                }

                nextMarks[item.studentId] =
                    studentMarks;
            }

            setMarks(nextMarks);        } catch (err) {
            console.error(
                'Load results error:',
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load results.',
            );

            setStudents([]);
            setMarks({});
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadExams();
    }, []);

    useEffect(() => {
        if (examId) {
            void loadResults(examId);
        }
    }, [examId]);

    function setMark(
        studentId: string,
        subjectId: string,
        value: string,
    ) {
        setMarks((previous) => ({
            ...previous,
            [studentId]: {
                ...(previous[studentId] ?? {}),
                [subjectId]: value,
            },
        }));
    }

    async function saveResults() {
        if (!examId) {
            setError('Please select an examination.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const results: {
                studentId: string;
                enrollmentId: string;
                examSubjectId: string;
                marksObtained: number;
            }[] = [];

            /*
             * Collect all entered marks.
             */
            for (const student of students) {
                for (const subject of subjects) {
                    const value =
                        marks[student.studentId]?.[subject.id] ?? '';

                    if (
                        value === '' ||
                        value === null ||
                        value === undefined
                    ) {
                        continue;
                    }

                    const numericValue = Number(value);

                    if (!Number.isFinite(numericValue)) {
                        throw new Error(
                            `Invalid marks entered for ${student.studentName} - ${subject.name}.`,
                        );
                    }

                    if (
                        numericValue < 0 ||
                        numericValue > Number(subject.maxMarks)
                    ) {
                        throw new Error(
                            `${subject.name}: marks must be between 0 and ${subject.maxMarks}.`,
                        );
                    }

                    results.push({
                        studentId: student.studentId,
                        enrollmentId: student.enrollmentId,
                        examSubjectId: subject.id,
                        marksObtained: numericValue,
                    });
                }
            }

            /*
             * At least one mark is required.
             */
            if (!results.length) {
                throw new Error(
                    'Please enter marks for at least one subject.',
                );
            }

            /*
             * -------------------------------------------------------
             * 1. SAVE RESULTS
             * -------------------------------------------------------
             */
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    examId,
                    results,
                }),
            });

            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    `Could not save results. (${response.status})`,
                );
            }

            const savedCount =
                typeof data?.saved === 'number'
                    ? data.saved
                    : results.length;

            /*
             * Start with normal successful save message.
             */
            let successMessage =
                `${savedCount} result ${savedCount === 1 ? 'entry' : 'entries'} saved successfully.`;

            /*
             * -------------------------------------------------------
             * 2. AUTOMATIC FINAL EXAM PROMOTION
             * -------------------------------------------------------
             *
             * The API itself checks whether this is a FINAL exam.
             *
             * Therefore normal exams will simply return:
             * finalExam: false
             *
             * For a final exam:
             *
             * Class 5  -> Class 6
             * Class 6  -> Class 7
             * Class 7  -> Class 8
             *
             * The next academic session is also created/used:
             *
             * 2026-2027 -> 2027-2028
             *
             * Only students who pass every subject are promoted.
             */
            try {
                const promotionResponse = await fetch(
                    '/api/students/promote',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            examId,
                        }),
                    },
                );

                const promotionData =
                    await readJsonResponse(
                        promotionResponse,
                    );

                /*
                 * Promotion failure should NOT make the already
                 * saved marks look like they failed to save.
                 */
                if (!promotionResponse.ok) {
                    console.error(
                        'Results saved, but auto-promotion failed:',
                        promotionData,
                    );

                    successMessage +=
                        ' Results were saved, but automatic promotion could not be completed.';
                } else if (promotionData?.finalExam) {
                    /*
                     * Final exam was processed.
                     */
                    if (
                        typeof promotionData.message ===
                        'string' &&
                        promotionData.message.trim()
                    ) {
                        successMessage +=
                            ` ${promotionData.message.trim()}`;
                    }
                }
            } catch (promotionError) {
                /*
                 * Important:
                 *
                 * Marks are already saved successfully.
                 * Promotion error must NOT show:
                 * "Could not save results."
                 */
                console.error(
                    'Results saved, but auto-promotion failed:',
                    promotionError,
                );

                successMessage +=
                    ' Results were saved, but automatic promotion could not be completed.';
            }

            /*
             * -------------------------------------------------------
             * 3. SHOW SUCCESS MESSAGE
             * -------------------------------------------------------
             */
            setMessage(successMessage);

            /*
             * -------------------------------------------------------
             * 4. REFRESH RESULTS TABLE
             * -------------------------------------------------------
             */
            try {
                await loadResults(examId);
            } catch (refreshError) {
                console.error(
                    'Results saved, but refresh failed:',
                    refreshError,
                );

                /*
                 * Do not replace the successful save message.
                 */
            }
        } catch (err) {
            console.error(
                'Save results error:',
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save results.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold">
                    Result Creation
                </h1>

                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Enter subject-wise marks and save
                    student results.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {message}
                </div>
            )}

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <label className="mb-2 block text-sm font-semibold">
                    Select Examination
                </label>

                <select
                    className={inputClass}
                    value={examId}
                    onChange={(event) =>
                        setExamId(
                            event.target.value,
                        )
                    }
                >
                    <option value="">
                        Select exam
                    </option>

                    {exams.map((exam) => (
                        <option
                            key={exam.id}
                            value={exam.id}
                        >
                            {exam.name}
                            {exam.class?.name
                                ? ` — ${exam.class.name}`
                                : ''}
                        </option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="rounded-xl border p-5 text-sm">
                    Loading students and subjects...
                </div>
            )}

            {!loading &&
                examId &&
                subjects.length === 0 && (
                    <div className="rounded-xl border p-5 text-sm text-amber-700">
                        No subjects found for this
                        examination. Add subjects from
                        Exams first.
                    </div>
                )}

            {!loading &&
                students.length > 0 &&
                subjects.length > 0 && (
                    <>
                    <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                        <table className="w-full min-w-[1000px] text-sm">
                            <thead>
                                <tr className="border-b bg-[hsl(var(--muted))]">
                                    <th className="px-4 py-3 text-left">
                                        Student
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Admission No.
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Roll No.
                                    </th>

                                    {subjects.map(
                                        (
                                            subject,
                                        ) => (
                                            <th
                                                key={subject.id}
                                                className="px-4 py-3 text-center"
                                            >
                                                {subject.name}

                                                <div className="text-[10px] font-normal">
                                                    Max{' '}
                                                    {subject.maxMarks}
                                                </div>
                                            </th>
                                        ),
                                    )}

                                        <th className="px-4 py-3 text-center">
                                            Total
                                        </th>

                                        <th className="px-4 py-3 text-center">
                                            %
                                        </th>

                                        <th className="px-4 py-3 text-center">
                                            Grade
                                        </th>

                                        <th className="px-4 py-3 text-center">
                                            Result
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {students.map(
                                        (
                                            student,
                                        ) => {
                                            let total = 0;
                                            let maximum = 0;
                                            let passed =
                                                true;

                                            for (const subject of subjects) {
                                                const value =
                                                    Number(
                                                        marks[
                                                        student
                                                            .studentId
                                                        ]?.[
                                                        subject
                                                            .id
                                                        ] ||
                                                        0,
                                                    );

                                                total +=
                                                    value;

                                                maximum +=
                                                    Number(
                                                        subject.maxMarks,
                                                    );

                                                if (
                                                    value <
                                                    Number(
                                                        subject.passMarks,
                                                    )
                                                ) {
                                                    passed =
                                                        false;
                                                }
                                            }

                                            const percentage =
                                                maximum >
                                                    0
                                                    ? (total /
                                                        maximum) *
                                                    100
                                                    : 0;

                                            return (
                                                <tr
                                                    key={
                                                        student.studentId
                                                    }
                                                    className="border-b last:border-b-0"
                                                >
                                                    <td className="px-4 py-3 font-semibold">
                                                        {
                                                            student.studentName
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-xs">
                                                        {
                                                            student.admissionNumber
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {student.rollNumber || '—'}
                                                    </td>

                                                    {subjects.map(
                                                        (
                                                            subject,
                                                        ) => (
                                                            <td
                                                                key={
                                                                    subject.id
                                                                }
                                                                className="px-3 py-3"
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={Number(
                                                                        subject.maxMarks,
                                                                    )}
                                                                    step="0.01"
                                                                    className={`${inputClass} w-24 text-center`}
                                                                    value={
                                                                        marks[
                                                                        student
                                                                            .studentId
                                                                        ]?.[
                                                                        subject
                                                                            .id
                                                                        ] ??
                                                                        ''
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setMark(
                                                                            student.studentId,
                                                                            subject.id,
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                        ),
                                                    )}

                                                    <td className="px-4 py-3 text-center font-bold">
                                                        {money(
                                                            total,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center font-semibold">
                                                        {percentage.toFixed(
                                                            2,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center font-bold">
                                                        {grade(
                                                            percentage,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        <span
                                                            className={
                                                                passed
                                                                    ? 'font-bold text-emerald-600'
                                                                    : 'font-bold text-red-600'
                                                            }
                                                        >
                                                            {passed
                                                                ? 'PASS'
                                                                : 'FAIL'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                className={
                                    buttonClass
                                }
                                disabled={saving}
                                onClick={() =>
                                    void saveResults()
                                }
                            >
                                {saving
                                    ? 'Saving...'
                                    : 'Save Results'}
                            </button>
                        </div>
                    </>
                )}
        </div>
    );
}

/* =========================================================
   ROUTINE PAGE
   ========================================================= */

export function RoutinePage() {
    const [exams, setExams] = useState<Exam[]>(
        [],
    );

    const [routines, setRoutines] = useState<
        Routine[]
    >([]);

    const [form, setForm] = useState({
        examId: '',
        examSubjectId: '',
        examDate: '',
        startTime: '',
        endTime: '',
        room: '',
        remarks: '',
    });

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function loadExams() {
        const response = await fetch(
            '/api/exams',
            {
                cache: 'no-store',
            },
        );

        const data =
            await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(
                data.error ||
                'Could not load exams.',
            );
        }

        setExams(data.items ?? []);
    }

    async function loadRoutines() {
        const response = await fetch(
            '/api/exam-routine',
            {
                cache: 'no-store',
            },
        );

        const data =
            await readJsonResponse(response);

        if (!response.ok) {
            throw new Error(
                data.error ||
                'Could not load routine.',
            );
        }

        setRoutines(data.items ?? []);
    }

    useEffect(() => {
        Promise.all([
            loadExams(),
            loadRoutines(),
        ]).catch((err) => {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not load routine.',
            );
        });
    }, []);

    const selectedExam = useMemo(
        () =>
            exams.find(
                (exam) =>
                    exam.id === form.examId,
            ),
        [exams, form.examId],
    );

    async function saveRoutine() {
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (!form.examId) {
                throw new Error(
                    'Please select an exam.',
                );
            }

            if (!form.examSubjectId) {
                throw new Error(
                    'Please select a subject.',
                );
            }

            if (!form.examDate) {
                throw new Error(
                    'Please select exam date.',
                );
            }

            if (!form.startTime) {
                throw new Error(
                    'Please select start time.',
                );
            }

            if (!form.endTime) {
                throw new Error(
                    'Please select end time.',
                );
            }

            const response = await fetch(
                editingId
                    ? `/api/exam-routine/${editingId}`
                    : '/api/exam-routine',
                {
                    method: editingId
                        ? 'PATCH'
                        : 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify(form),
                },
            );

            const data =
                await readJsonResponse(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Could not save routine.',
                );
            }

            setMessage(
                editingId
                    ? 'Routine updated successfully.'
                    : 'Routine created successfully.',
            );

            setEditingId(null);

            setForm({
                examId: '',
                examSubjectId: '',
                examDate: '',
                startTime: '',
                endTime: '',
                room: '',
                remarks: '',
            });

            await loadRoutines();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save routine.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteRoutine(
        id: string,
    ) {
        if (
            !window.confirm(
                'Delete this routine entry?',
            )
        ) {
            return;
        }

        setError('');
        setMessage('');

        try {
            const response = await fetch(
                `/api/exam-routine/${id}`,
                {
                    method: 'DELETE',
                },
            );

            const data =
                await readJsonResponse(
                    response,
                );

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    'Could not delete routine.',
                );
            }

            await loadRoutines();

            setMessage(
                'Routine deleted successfully.',
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not delete routine.',
            );
        }
    }

    function editRoutine(row: Routine) {
        setEditingId(row.id);

        setForm({
            examId: row.examId,
            examSubjectId:
                row.examSubjectId,
            examDate:
                row.examDate.slice(0, 10),
            startTime: row.startTime,
            endTime: row.endTime,
            room: row.room ?? '',
            remarks: row.remarks ?? '',
        });
    }

    function resetForm() {
        setEditingId(null);

        setForm({
            examId: '',
            examSubjectId: '',
            examDate: '',
            startTime: '',
            endTime: '',
            room: '',
            remarks: '',
        });
    }

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold">
                    Exam Routine
                </h1>

                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Create and manage examination
                    schedules.
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {message}
                </div>
            )}

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
                <h2 className="mb-5 text-lg font-bold">
                    {editingId
                        ? 'Edit Routine'
                        : 'Add Routine'}
                </h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            Exam
                        </label>

                        <select
                            className={
                                inputClass
                            }
                            value={
                                form.examId
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        examId:
                                            event
                                                .target
                                                .value,
                                        examSubjectId:
                                            '',
                                    }),
                                )
                            }
                        >
                            <option value="">
                                Select exam
                            </option>

                            {exams.map(
                                (
                                    exam,
                                ) => (
                                    <option
                                        key={
                                            exam.id
                                        }
                                        value={
                                            exam.id
                                        }
                                    >
                                        {
                                            exam.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            Subject
                        </label>

                        <select
                            className={
                                inputClass
                            }
                            value={
                                form.examSubjectId
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        examSubjectId:
                                            event
                                                .target
                                                .value,
                                    }),
                                )
                            }
                            disabled={
                                !form.examId
                            }
                        >
                            <option value="">
                                Select subject
                            </option>

                            {(
                                selectedExam?.subjects ??
                                []
                            ).map(
                                (
                                    subject,
                                ) => (
                                    <option
                                        key={
                                            subject.id
                                        }
                                        value={
                                            subject.id
                                        }
                                    >
                                        {
                                            subject.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            Exam Date
                        </label>

                        <input
                            type="date"
                            className={
                                inputClass
                            }
                            value={
                                form.examDate
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        examDate:
                                            event
                                                .target
                                                .value,
                                    }),
                                )
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            Start Time
                        </label>

                        <input
                            type="time"
                            className={
                                inputClass
                            }
                            value={
                                form.startTime
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        startTime:
                                            event
                                                .target
                                                .value,
                                    }),
                                )
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            End Time
                        </label>

                        <input
                            type="time"
                            className={
                                inputClass
                            }
                            value={
                                form.endTime
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        endTime:
                                            event
                                                .target
                                                .value,
                                    }),
                                )
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            Room
                        </label>

                        <input
                            className={
                                inputClass
                            }
                            value={
                                form.room
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm(
                                    (
                                        prev,
                                    ) => ({
                                        ...prev,
                                        room: event
                                            .target
                                            .value,
                                    }),
                                )
                            }
                            placeholder="Room / Hall"
                        />
                    </div>
                </div>

                <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold">
                        Remarks
                    </label>

                    <textarea
                        className={`${inputClass} min-h-24 resize-y`}
                        value={
                            form.remarks
                        }
                        onChange={(
                            event,
                        ) =>
                            setForm(
                                (
                                    prev,
                                ) => ({
                                    ...prev,
                                    remarks:
                                        event
                                            .target
                                            .value,
                                }),
                            )
                        }
                        placeholder="Optional remarks"
                    />
                </div>

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        className={
                            buttonClass
                        }
                        disabled={
                            saving
                        }
                        onClick={() =>
                            void saveRoutine()
                        }
                    >
                        {saving
                            ? 'Saving...'
                            : editingId
                                ? 'Update Routine'
                                : 'Add Routine'}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className={
                                secondaryButton
                            }
                            onClick={
                                resetForm
                            }
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <table className="w-full min-w-[850px] text-sm">
                    <thead>
                        <tr className="border-b bg-[hsl(var(--muted))]">
                            <th className="px-4 py-3 text-left">
                                Exam
                            </th>

                            <th className="px-4 py-3 text-left">
                                Subject
                            </th>

                            <th className="px-4 py-3">
                                Date
                            </th>

                            <th className="px-4 py-3">
                                Time
                            </th>

                            <th className="px-4 py-3">
                                Room
                            </th>

                            <th className="px-4 py-3">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {routines.map(
                            (row) => (
                                <tr
                                    key={
                                        row.id
                                    }
                                    className="border-b last:border-b-0"
                                >
                                    <td className="px-4 py-3 font-semibold">
                                        {
                                            row
                                                .exam
                                                ?.name ??
                                            '—'
                                        }
                                    </td>

                                    <td className="px-4 py-3">
                                        {
                                            row
                                                .subject
                                                ?.name ??
                                            '—'
                                        }
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {row.examDate.slice(
                                            0,
                                            10,
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {
                                            row.startTime
                                        }{' '}
                                        -{' '}
                                        {
                                            row.endTime
                                        }
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {
                                            row.room ||
                                            '—'
                                        }
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                type="button"
                                                className={
                                                    secondaryButton
                                                }
                                                onClick={() =>
                                                    editRoutine(
                                                        row,
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                                                onClick={() =>
                                                    void deleteRoutine(
                                                        row.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}

                        {routines.length ===
                            0 && (
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        className="px-4 py-10 text-center text-sm text-[hsl(var(--muted-foreground))]"
                                    >
                                        No exam
                                        routine
                                        created
                                        yet.
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* =========================================================
   PRINT PAGE
   ========================================================= */
export function PrintPage() {
const [exams, setExams] = useState<Exam[]>([]);
const [students, setStudents] = useState<Student[]>([]);

const [selectedExamId, setSelectedExamId] =
    useState<string>('');

const [selectedStudentId, setSelectedStudentId] =
    useState<string>('');

const [loadingExams, setLoadingExams] =
    useState<boolean>(true);

const [loadingStudents, setLoadingStudents] =
    useState<boolean>(false);

const [error, setError] =
    useState<string>('');

/**
 * -------------------------------------------------------
 * LOAD EXAMS
 * -------------------------------------------------------
 */
const loadExams = async () => {
    try {
        setLoadingExams(true);
        setError('');

        const data = await readJsonResponse(
            '/api/exams',
        );

        let examList: Exam[] = [];

        if (Array.isArray(data)) {
            examList = data;
        } else if (Array.isArray(data?.items)) {
            examList = data.items;
        } else if (Array.isArray(data?.exams)) {
            examList = data.exams;
        }

        const mappedExams: Exam[] = examList
            .filter(
                (exam: any) =>
                    exam &&
                    exam.id,
            )
            .map((exam: any) => ({
                id: String(exam.id),
                name: String(
                    exam.name ?? 'Unnamed Exam',
                ),
                examType: String(
                    exam.examType ?? 'TERM',
                ),
                startDate: String(
                    exam.startDate ?? '',
                ),
                endDate: String(
                    exam.endDate ?? '',
                ),
                totalMarks: Number(
                    exam.totalMarks ?? 0,
                ),
                status: String(
                    exam.status ?? 'DRAFT',
                ),
                class: exam.class
                    ? {
                        id: String(
                            exam.class.id ?? '',
                        ),
                        name: String(
                            exam.class.name ?? '',
                        ),
                    }
                    : null,
                section: exam.section
                    ? {
                        id: String(
                            exam.section.id ?? '',
                        ),
                        name: String(
                            exam.section.name ?? '',
                        ),
                    }
                    : null,
                subjects: Array.isArray(
                    exam.subjects,
                )
                    ? exam.subjects.map(
                        (subject: any) => ({
                            id: String(
                                subject.id ?? '',
                            ),
                            name: String(
                                subject.name ?? '',
                            ),
                            code:
                                subject.code !==
                                    null &&
                                    subject.code !==
                                    undefined
                                    ? String(
                                        subject.code,
                                    )
                                    : null,
                            maxMarks: Number(
                                subject.maxMarks ??
                                0,
                            ),
                            passMarks: Number(
                                subject.passMarks ??
                                0,
                            ),
                        }),
                    )
                    : [],
            }));

        setExams(mappedExams);

        /**
         * Automatically select first exam
         * and immediately load its students.
         */
        if (mappedExams.length > 0) {
            const firstExamId =
                mappedExams[0].id;

            setSelectedExamId(
                firstExamId,
            );

            await loadStudents(
                firstExamId,
            );
        } else {
            setSelectedExamId('');
            setStudents([]);
            setSelectedStudentId('');
        }
    } catch (err) {
        console.error(
            'Failed to load exams:',
            err,
        );

        setExams([]);
        setStudents([]);
        setSelectedExamId('');
        setSelectedStudentId('');

        setError(
            err instanceof Error
                ? err.message
                : 'Failed to load exams.',
        );
    } finally {
        setLoadingExams(false);
    }
};

/**
 * -------------------------------------------------------
 * LOAD STUDENTS FOR SELECTED EXAM
 * -------------------------------------------------------
 */
    const loadStudents = async (examId: string) => {
        if (!examId) {
            setStudents([]);
            setSelectedStudentId('');
            return;
        }

        try {
            setLoadingStudents(true);
            setError('');

            const url =
                `/api/results?examId=${encodeURIComponent(examId)}`;

            console.log('Loading students:', url);

            // IMPORTANT:
            // readJsonResponse() needs a Response object,
            // not a URL string.
            const response = await fetch(url, {
                cache: 'no-store',
            });

            const data = await readJsonResponse(response);

            const items = Array.isArray(data?.items)
                ? data.items
                : [];

            const mappedStudents: Student[] = items
                .filter(
                    (item: any) =>
                        item &&
                        item.studentId,
                )
                .map(
                    (item: any) => ({
                        studentId: String(
                            item.studentId ?? '',
                        ),

                        enrollmentId: String(
                            item.enrollmentId ?? '',
                        ),

                        admissionNumber: String(
                            item.admissionNumber ?? '',
                        ),

                        studentName: String(
                            item.name ??
                            item.studentName ??
                            '',
                        ),

                        rollNumber:
                            item.rollNumber !== null &&
                                item.rollNumber !== undefined
                                ? String(
                                    item.rollNumber,
                                )
                                : null,
                    }),
                );

            console.log(
                'Students loaded:',
                mappedStudents,
            );

            setStudents(mappedStudents);

            if (mappedStudents.length > 0) {
                setSelectedStudentId(
                    mappedStudents[0].studentId,
                );
            } else {
                setSelectedStudentId('');
            }
        } catch (err) {
            console.error(
                'Failed to load students:',
                err,
            );

            setStudents([]);
            setSelectedStudentId('');

            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load students.',
            );
        } finally {
            setLoadingStudents(false);
        }
    };

/**
 * -------------------------------------------------------
 * INITIAL LOAD
 * -------------------------------------------------------
 */
useEffect(() => {
    void loadExams();
}, []);

/**
 * -------------------------------------------------------
 * PRINT ROUTINE
 * -------------------------------------------------------
 */
const printRoutine = () => {
    if (!selectedExamId) {
        setError(
            'Please select an exam first.',
        );
        return;
    }

    setError('');

    const url =
        `/api/print?type=routine&examId=${encodeURIComponent(
            selectedExamId,
        )}`;

    window.open(
        url,
        '_blank',
        'noopener,noreferrer',
    );
};

/**
 * -------------------------------------------------------
 * PRINT MARKSHEET
 * -------------------------------------------------------
 */
const printMarksheet = () => {
    if (!selectedExamId) {
        setError(
            'Please select an exam first.',
        );
        return;
    }

    if (!selectedStudentId) {
        setError(
            'Please select a student first.',
        );
        return;
    }

    setError('');

    const url =
        `/api/print?type=marksheet&examId=${encodeURIComponent(
            selectedExamId,
        )}&studentId=${encodeURIComponent(
            selectedStudentId,
        )}`;

    window.open(
        url,
        '_blank',
        'noopener,noreferrer',
    );
};

/**
 * -------------------------------------------------------
 * SELECTED EXAM
 * -------------------------------------------------------
 */
const selectedExam = useMemo(
    () =>
        exams.find(
            (exam) =>
                exam.id ===
                selectedExamId,
        ) ?? null,
    [exams, selectedExamId],
);

/**
 * -------------------------------------------------------
 * SELECTED STUDENT
 * -------------------------------------------------------
 */
const selectedStudent = useMemo(
    () =>
        students.find(
            (student) =>
                student.studentId ===
                selectedStudentId,
        ) ?? null,
    [
        students,
        selectedStudentId,
    ],
);

return (
    <div className="space-y-6">
        {/* =====================================================
                HEADER
               ===================================================== */}
        <div>
            <h1 className="text-2xl font-bold">
                Print
            </h1>

            <p className="mt-1 text-sm text-gray-500">
                Print exam routine and
                student marksheet.
            </p>
        </div>

        {/* =====================================================
                ERROR
               ===================================================== */}
        {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        )}

        {/* =====================================================
                PRINT CARD
               ===================================================== */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
                {/* =================================================
                        EXAM
                       ================================================= */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select Exam
                    </label>

                    <select
                        value={
                            selectedExamId
                        }
                        onChange={async (
                            e,
                        ) => {
                            const examId =
                                e.target
                                    .value;

                            setSelectedExamId(
                                examId,
                            );

                            setSelectedStudentId(
                                '',
                            );

                            setStudents(
                                [],
                            );

                            if (examId) {
                                await loadStudents(
                                    examId,
                                );
                            }
                        }}
                        className={
                            inputClass
                        }
                        disabled={
                            loadingExams
                        }
                    >
                        <option value="">
                            {loadingExams
                                ? 'Loading Exams...'
                                : 'Select Exam'}
                        </option>

                        {exams.map(
                            (
                                exam,
                            ) => (
                                <option
                                    key={
                                        exam.id
                                    }
                                    value={
                                        exam.id
                                    }
                                >
                                    {
                                        exam.name
                                    }
                                    {' - '}
                                    {
                                        exam.examType
                                    }
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {/* =================================================
                        STUDENT
                       ================================================= */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select Student
                    </label>

                    <select
                        value={
                            selectedStudentId
                        }
                        onChange={(
                            e,
                        ) => {
                            setSelectedStudentId(
                                e.target
                                    .value,
                            );
                            setError(
                                '',
                            );
                        }}
                        className={
                            inputClass
                        }
                        disabled={
                            !selectedExamId ||
                            loadingStudents
                        }
                    >
                        <option value="">
                            {loadingStudents
                                ? 'Loading Students...'
                                : students.length ===
                                    0
                                    ? 'No Students Found'
                                    : 'Select Student'}
                        </option>

                        {students.map(
                            (
                                student,
                            ) => (
                                <option
                                    key={
                                        student.studentId
                                    }
                                    value={
                                        student.studentId
                                    }
                                >
                                    {student.admissionNumber
                                        ? `${student.admissionNumber} - `
                                        : ''}
                                    {
                                        student.studentName
                                    }
                                    {student.rollNumber
                                        ? ` (Roll ${student.rollNumber})`
                                        : ''}
                                </option>
                            ),
                        )}
                    </select>
                </div>
            </div>

            {/* =====================================================
                    SELECTED DETAILS
                   ===================================================== */}
            {(selectedExam ||
                selectedStudent) && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {/* Exam info */}
                        {selectedExam && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Selected Exam
                                </div>

                                <div className="text-base font-semibold text-gray-900">
                                    {
                                        selectedExam.name
                                    }
                                </div>

                                <div className="mt-1 text-sm text-gray-600">
                                    Type:{' '}
                                    {
                                        selectedExam.examType
                                    }
                                </div>

                                {selectedExam.class && (
                                    <div className="text-sm text-gray-600">
                                        Class:{' '}
                                        {
                                            selectedExam
                                                .class
                                                .name
                                        }
                                    </div>
                                )}

                                {selectedExam.section && (
                                    <div className="text-sm text-gray-600">
                                        Section:{' '}
                                        {
                                            selectedExam
                                                .section
                                                .name
                                        }
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Student info */}
                        {selectedStudent && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Selected Student
                                </div>

                                <div className="text-base font-semibold text-gray-900">
                                    {
                                        selectedStudent.studentName
                                    }
                                </div>

                                {selectedStudent.admissionNumber && (
                                    <div className="mt-1 text-sm text-gray-600">
                                        Admission No:{' '}
                                        {
                                            selectedStudent.admissionNumber
                                        }
                                    </div>
                                )}

                                {selectedStudent.rollNumber && (
                                    <div className="text-sm text-gray-600">
                                        Roll No:{' '}
                                        {
                                            selectedStudent.rollNumber
                                        }
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            {/* =====================================================
                    BUTTONS
                   ===================================================== */}
            <div className="mt-6 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={
                        printRoutine
                    }
                    disabled={
                        !selectedExamId
                    }
                    className={
                        buttonClass
                    }
                >
                    🖨️ Print Exam Routine
                </button>

                <button
                    type="button"
                    onClick={
                        printMarksheet
                    }
                    disabled={
                        !selectedExamId ||
                        !selectedStudentId
                    }
                    className={
                        buttonClass
                    }
                >
                    🧾 Print Marksheet
                </button>

                <button
                    type="button"
                    onClick={async () => {
                        if (
                            selectedExamId
                        ) {
                            await loadStudents(
                                selectedExamId,
                            );
                        }
                    }}
                    disabled={
                        !selectedExamId ||
                        loadingStudents
                    }
                    className={
                        secondaryButton
                    }
                >
                    {loadingStudents
                        ? 'Loading...'
                        : '↻ Refresh Students'}
                </button>
            </div>
        </div>

        {/* =====================================================
                STUDENT LIST PREVIEW
               ===================================================== */}
        {selectedExamId && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Students
                        </h2>

                        <p className="text-sm text-gray-500">
                            {loadingStudents
                                ? 'Loading students...'
                                : `${students.length} student${students.length ===
                                    1
                                    ? ''
                                    : 's'
                                } found`}
                        </p>
                    </div>
                </div>

                {loadingStudents ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                        Loading students...
                    </div>
                ) : students.length ===
                    0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                        No students found
                        for this exam.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50 text-left">
                                    <th className="px-4 py-3 font-semibold">
                                        #
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Admission No.
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Student Name
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Roll No.
                                    </th>

                                    <th className="px-4 py-3 text-right font-semibold">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {students.map(
                                    (
                                        student,
                                        index,
                                    ) => (
                                        <tr
                                            key={
                                                student.studentId
                                            }
                                            className={`border-b last:border-0 ${selectedStudentId ===
                                                    student.studentId
                                                    ? 'bg-blue-50'
                                                    : ''
                                                }`}
                                        >
                                            <td className="px-4 py-3">
                                                {index +
                                                    1}
                                            </td>

                                            <td className="px-4 py-3">
                                                {
                                                    student.admissionNumber
                                                }
                                            </td>

                                            <td className="px-4 py-3 font-medium">
                                                {
                                                    student.studentName
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                {student.rollNumber ??
                                                    '-'}
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStudentId(
                                                            student.studentId,
                                                        );
                                                        setError(
                                                            '',
                                                        );
                                                    }}
                                                    className={
                                                        secondaryButton
                                                    }
                                                >
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
    </div>
);
}