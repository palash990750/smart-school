"use client";

import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
    Pencil,
    Plus,
    Search,
    Trash2,
    Eye,
    X,
    UsersRound,
} from "lucide-react";

type StaffMember = {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    phone: string | null;
    address: string | null;
    joiningDate: string | null;
    createdAt: string;
};

const emptyForm = {
    employeeId: "",
    name: "",
    department: "",
    designation: "",
    phone: "",
    address: "",
    joiningDate: "",
};

type StaffForm = typeof emptyForm;

const inputClass =
    "h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.12)]";

const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm font-semibold transition hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50";

/*
|--------------------------------------------------------------------------
| Modal Portal
|--------------------------------------------------------------------------
| Render modal directly under <body>.
| This prevents parent layout overflow/scroll containers from clipping
| the modal.
*/
function ModalPortal({
    children,
}: {
    children: ReactNode;
}) {
    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(children, document.body);
}

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState<StaffForm>({
        ...emptyForm,
    });

    const [editing, setEditing] = useState<StaffMember | null>(null);
    const [viewing, setViewing] = useState<StaffMember | null>(null);
    const [deleting, setDeleting] = useState<StaffMember | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const modalOpen =
        formOpen || viewing !== null || deleting !== null;

    /*
    |--------------------------------------------------------------------------
    | Lock background scrolling while a modal is open
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!modalOpen) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow =
                previousOverflow;
        };
    }, [modalOpen]);

    /*
    |--------------------------------------------------------------------------
    | Escape key
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!modalOpen) {
            return;
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key !== "Escape") {
                return;
            }

            if (saving || deletingBusy) {
                return;
            }

            setFormOpen(false);
            setViewing(null);
            setDeleting(null);
        }

        document.addEventListener(
            "keydown",
            handleEscape,
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape,
            );
        };
    }, [modalOpen, saving, deletingBusy]);

    const loadStaff = useCallback(
        async (searchText = "") => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams();

                if (searchText.trim()) {
                    params.set(
                        "search",
                        searchText.trim(),
                    );
                }

                const response = await fetch(
                    `/api/staff${params.toString()
                        ? `?${params}`
                        : ""
                    }`,
                    {
                        cache: "no-store",
                    },
                );

                const result =
                    await response
                        .json()
                        .catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        result?.error ||
                        "Could not load staff records.",
                    );
                }

                setStaff(
                    Array.isArray(result)
                        ? result
                        : [],
                );
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not load staff records.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadStaff(search);
        }, 250);

        return () => {
            window.clearTimeout(timer);
        };
    }, [search, loadStaff]);

    function closeForm() {
        if (saving) {
            return;
        }

        setFormOpen(false);
        setEditing(null);
    }

    function openAddForm() {
        setError("");
        setNotice("");
        setViewing(null);
        setDeleting(null);
        setEditing(null);
        setForm({
            ...emptyForm,
        });
        setFormOpen(true);
    }

    function openEditForm(member: StaffMember) {
        setError("");
        setNotice("");
        setViewing(null);
        setDeleting(null);
        setEditing(member);

        setForm({
            employeeId: member.employeeId,
            name: member.name,
            department: member.department,
            designation: member.designation,
            phone: member.phone || "",
            address: member.address || "",
            joiningDate: member.joiningDate || "",
        });

        setFormOpen(true);
    }

    function updateField(
        field: keyof StaffForm,
        value: string,
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    async function submitForm(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setSaving(true);
        setError("");
        setNotice("");

        const data = {
            employeeId:
                form.employeeId.trim(),
            name: form.name.trim(),
            department:
                form.department.trim(),
            designation:
                form.designation.trim(),
            phone:
                form.phone.trim() || null,
            address:
                form.address.trim() || null,
            joiningDate:
                form.joiningDate || null,
        };

        try {
            const response = await fetch(
                editing
                    ? `/api/staff/${encodeURIComponent(
                        editing.id,
                    )}`
                    : "/api/staff",
                {
                    method: editing
                        ? "PATCH"
                        : "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify(data),
                },
            );

            const result =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    (editing
                        ? "Could not update the staff record."
                        : "Could not create the staff record."),
                );
            }

            setFormOpen(false);
            setEditing(null);

            setNotice(
                editing
                    ? "Staff record updated successfully."
                    : "Staff member added successfully.",
            );

            await loadStaff(search);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while saving.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteStaff() {
        if (!deleting) {
            return;
        }

        setDeletingBusy(true);
        setError("");
        setNotice("");

        try {
            const response = await fetch(
                `/api/staff/${encodeURIComponent(
                    deleting.id,
                )}`,
                {
                    method: "DELETE",
                },
            );

            const result =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    "Could not delete this staff record.",
                );
            }

            setDeleting(null);
            setNotice(
                "Staff record deleted successfully.",
            );

            await loadStaff(search);
        } catch (err) {
            setDeleting(null);

            setError(
                err instanceof Error
                    ? err.message
                    : "Could not delete the staff record.",
            );
        } finally {
            setDeletingBusy(false);
        }
    }

    return (
        <div className="page-in min-w-0">
            {/* =========================================================
                PAGE HEADER
            ========================================================== */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">
                        <UsersRound size={16} />
                        People
                    </div>

                    <h1 className="display text-2xl font-bold">
                        Staff Management
                    </h1>

                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Manage non-teaching staff,
                        departments and contact
                        information.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAddForm}
                    className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90"
                >
                    <Plus size={17} />
                    Add Staff
                </button>
            </div>

            {/* =========================================================
                NOTICE
            ========================================================== */}
            {notice && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <span>{notice}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setNotice("")
                        }
                        aria-label="Dismiss notice"
                        className="rounded p-1 hover:bg-emerald-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* =========================================================
                ERROR
            ========================================================== */}
            {error && (
                <div
                    role="alert"
                    className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                        aria-label="Dismiss error"
                        className="rounded p-1 hover:bg-rose-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* =========================================================
                STAFF TABLE
            ========================================================== */}
            <section className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] p-4">
                    <label className="relative block w-full sm:max-w-sm">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                        />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search name, employee ID, department..."
                            className={`${inputClass} pl-9`}
                        />
                    </label>

                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {staff.length} staff records
                    </span>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5">
                        {[1, 2, 3].map(
                            (item) => (
                                <div
                                    key={item}
                                    className="skeleton h-12 rounded-lg"
                                />
                            ),
                        )}
                    </div>
                ) : error &&
                    staff.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Staff records could
                            not be loaded.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadStaff(
                                    search,
                                )
                            }
                            className={`${buttonClass} mt-3`}
                        >
                            Try again
                        </button>
                    </div>
                ) : staff.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-[hsl(var(--muted))]">
                            <UsersRound
                                size={22}
                            />
                        </div>

                        <h2 className="font-bold">
                            {search
                                ? "No matching staff found"
                                : "No staff records yet"}
                        </h2>

                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {search
                                ? "Try another name, employee ID or department."
                                : "Add a staff member to begin managing staff records."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[950px] text-left text-sm">
                            <thead className="bg-[hsl(var(--muted)/.55)] text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        Staff Member
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Employee ID
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Department
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Designation
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Contact
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Joining Date
                                    </th>

                                    <th className="px-4 py-3 font-semibold">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {staff.map(
                                    (member) => (
                                        <tr
                                            key={
                                                member.id
                                            }
                                            className="border-t border-[hsl(var(--border))] transition hover:bg-[hsl(var(--muted)/.25)]"
                                        >
                                            <td className="px-4 py-3 font-semibold">
                                                {
                                                    member.name
                                                }
                                            </td>

                                            <td className="px-4 py-3 font-mono text-xs">
                                                {
                                                    member.employeeId
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                {
                                                    member.department
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                {
                                                    member.designation
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                {
                                                    member.phone ||
                                                    "—"
                                                }
                                            </td>

                                            <td className="px-4 py-3">
                                                {member.joiningDate
                                                    ? new Date(
                                                        `${member.joiningDate.slice(
                                                            0,
                                                            10,
                                                        )}T00:00:00`,
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <button
                                                        type="button"
                                                        title="View staff details"
                                                        onClick={() => {
                                                            setError(
                                                                "",
                                                            );
                                                            setViewing(
                                                                member,
                                                            );
                                                        }}
                                                        className={
                                                            buttonClass
                                                        }
                                                    >
                                                        <Eye
                                                            size={
                                                                14
                                                            }
                                                        />
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Edit staff"
                                                        onClick={() =>
                                                            openEditForm(
                                                                member,
                                                            )
                                                        }
                                                        className={
                                                            buttonClass
                                                        }
                                                    >
                                                        <Pencil
                                                            size={
                                                                14
                                                            }
                                                        />
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Delete staff"
                                                        onClick={() => {
                                                            setError(
                                                                "",
                                                            );
                                                            setDeleting(
                                                                member,
                                                            );
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                                                    >
                                                        <Trash2
                                                            size={
                                                                14
                                                            }
                                                        />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* =========================================================
                ADD / EDIT STAFF MODAL
                Rendered through portal so parent overflow cannot clip it.
            ========================================================== */}
            {formOpen && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-5"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeForm();
                            }
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="staff-form-title"
                            className="my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
                            style={{
                                maxHeight:
                                    "calc(100dvh - 2rem)",
                            }}
                        >
                            {/* Header */}
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--border))] p-4 sm:p-5">
                                <div className="min-w-0">
                                    <h2
                                        id="staff-form-title"
                                        className="display text-xl font-bold"
                                    >
                                        {editing
                                            ? "Edit Staff Member"
                                            : "Add Staff Member"}
                                    </h2>

                                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                        Enter the staff
                                        member&apos;s
                                        information.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={
                                        saving
                                    }
                                    className={`${buttonClass} shrink-0`}
                                    aria-label="Close form"
                                >
                                    <X
                                        size={17}
                                    />
                                </button>
                            </div>

                            {/* Scrollable form body */}
                            <form
                                onSubmit={
                                    submitForm
                                }
                                className="min-h-0 overflow-y-auto"
                            >
                                <div className="space-y-4 p-4 sm:p-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-sm font-semibold">
                                            Employee ID *
                                            <input
                                                required
                                                maxLength={
                                                    40
                                                }
                                                value={
                                                    form.employeeId
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "employeeId",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                                placeholder="EMP-001"
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold">
                                            Full Name *
                                            <input
                                                required
                                                minLength={
                                                    2
                                                }
                                                maxLength={
                                                    120
                                                }
                                                value={
                                                    form.name
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "name",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                                placeholder="Staff member name"
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold">
                                            Department *
                                            <input
                                                required
                                                minLength={
                                                    2
                                                }
                                                maxLength={
                                                    100
                                                }
                                                value={
                                                    form.department
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "department",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                                placeholder="Administration"
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold">
                                            Designation *
                                            <input
                                                required
                                                minLength={
                                                    2
                                                }
                                                maxLength={
                                                    100
                                                }
                                                value={
                                                    form.designation
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "designation",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                                placeholder="Office Assistant"
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold">
                                            Phone
                                            <input
                                                maxLength={
                                                    40
                                                }
                                                value={
                                                    form.phone
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "phone",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                                placeholder="Phone number"
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold">
                                            Joining Date
                                            <input
                                                type="date"
                                                value={
                                                    form.joiningDate
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "joiningDate",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5`}
                                            />
                                        </label>

                                        <label className="block text-sm font-semibold sm:col-span-2">
                                            Address
                                            <textarea
                                                maxLength={
                                                    500
                                                }
                                                value={
                                                    form.address
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "address",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} mt-1.5 h-24 resize-y py-2`}
                                                placeholder="Full address"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="sticky bottom-0 flex shrink-0 flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
                                    <button
                                        type="button"
                                        disabled={
                                            saving
                                        }
                                        onClick={
                                            closeForm
                                        }
                                        className={
                                            buttonClass
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={
                                            saving
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-50"
                                    >
                                        {saving
                                            ? "Saving..."
                                            : editing
                                                ? "Save Changes"
                                                : "Add Staff"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                </ModalPortal>
            )}

            {/* =========================================================
                VIEW STAFF DETAILS MODAL
            ========================================================== */}
            {viewing && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-5"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                setViewing(null);
                            }
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="staff-details-title"
                            className="my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
                            style={{
                                maxHeight:
                                    "calc(100dvh - 2rem)",
                            }}
                        >
                            {/* Header */}
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--border))] p-4 sm:p-5">
                                <div>
                                    <h2
                                        id="staff-details-title"
                                        className="display text-xl font-bold"
                                    >
                                        Staff Details
                                    </h2>

                                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                        Staff member
                                        information
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setViewing(
                                            null,
                                        )
                                    }
                                    className={`${buttonClass} shrink-0`}
                                    aria-label="Close details"
                                >
                                    <X
                                        size={17}
                                    />
                                </button>
                            </div>

                            {/* Scrollable details */}
                            <div className="min-h-0 overflow-y-auto">
                                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
                                    {[
                                        [
                                            "Employee ID",
                                            viewing.employeeId,
                                        ],
                                        [
                                            "Full Name",
                                            viewing.name,
                                        ],
                                        [
                                            "Department",
                                            viewing.department,
                                        ],
                                        [
                                            "Designation",
                                            viewing.designation,
                                        ],
                                        [
                                            "Phone",
                                            viewing.phone ||
                                            "—",
                                        ],
                                        [
                                            "Address",
                                            viewing.address ||
                                            "—",
                                        ],
                                        [
                                            "Joining Date",
                                            viewing.joiningDate
                                                ? new Date(
                                                    `${viewing.joiningDate.slice(
                                                        0,
                                                        10,
                                                    )}T00:00:00`,
                                                ).toLocaleDateString()
                                                : "Not specified",
                                        ],
                                        [
                                            "Record Created",
                                            new Date(
                                                viewing.createdAt,
                                            ).toLocaleDateString(),
                                        ],
                                    ].map(
                                        ([
                                            label,
                                            value,
                                        ]) => (
                                            <div
                                                key={
                                                    label
                                                }
                                                className="rounded-xl border border-[hsl(var(--border))] p-3.5"
                                            >
                                                <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                                    {
                                                        label
                                                    }
                                                </div>

                                                <div className="mt-1 break-words text-sm font-semibold">
                                                    {
                                                        value
                                                    }
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const member =
                                            viewing;

                                        setViewing(
                                            null,
                                        );

                                        openEditForm(
                                            member,
                                        );
                                    }}
                                    className={
                                        buttonClass
                                    }
                                >
                                    <Pencil
                                        size={14}
                                    />
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setViewing(
                                            null,
                                        )
                                    }
                                    className={
                                        buttonClass
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        </section>
                    </div>
                </ModalPortal>
            )}

            {/* =========================================================
                DELETE CONFIRMATION
            ========================================================== */}
            {deleting && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[10000] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-slate-950/55 p-4"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                if (
                                    !deletingBusy
                                ) {
                                    setDeleting(
                                        null,
                                    );
                                }
                            }
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="delete-staff-title"
                            className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-2xl sm:p-6"
                        >
                            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-rose-100 text-rose-700">
                                <Trash2
                                    size={21}
                                />
                            </div>

                            <h2
                                id="delete-staff-title"
                                className="display text-xl font-bold"
                            >
                                Delete Staff
                                Record?
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                                You are about to
                                delete{" "}
                                <strong className="text-[hsl(var(--foreground))]">
                                    {
                                        deleting.name
                                    }
                                </strong>{" "}
                                (
                                {
                                    deleting.employeeId
                                }
                                ). This action
                                cannot be undone.
                            </p>

                            <div className="mt-6 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        deletingBusy
                                    }
                                    onClick={() =>
                                        setDeleting(
                                            null,
                                        )
                                    }
                                    className={
                                        buttonClass
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        deletingBusy
                                    }
                                    onClick={() =>
                                        void deleteStaff()
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                                >
                                    <Trash2
                                        size={15}
                                    />

                                    {deletingBusy
                                        ? "Deleting..."
                                        : "Confirm Delete"}
                                </button>
                            </div>
                        </section>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}