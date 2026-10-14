"use client";
import { cacheApiValue, readCachedApiValue, enqueueAttendance } from "@/lib/offline-store";

import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query";

export type AttendanceItemInputStatus = "present" | "absent" | "late" | "half_day" | "leave";
export type StudentInput = {
  admissionNumber: string; rollNumber?: string | null; firstName: string; lastName: string; dateOfBirth?: string | null;
  gender?: string | null; email?: string | null; phone?: string | null; classId: string; sectionId: string;
  parentName?: string | null; parentPhone?: string | null;
  photoUrl?: string | null; fatherName?: string | null; fatherPhone?: string | null; fatherOccupation?: string | null;
  motherName?: string | null; motherPhone?: string | null; motherOccupation?: string | null; bloodGroup?: string | null;
  address?: string | null; idNumber?: string | null; admissionDate?: string | null; previousSchool?: string | null;
  emergencyContact?: string | null; medicalNotes?: string | null; feeAmount?: number;
};
export type Student = StudentInput & {
  id: string; status: "active" | "archived"; className: string; sectionName: string;
  createdAt: string; feeAmount: number;
};

type Opts = { query?: { enabled?: boolean; queryKey?: QueryKey; staleTime?: number } };


async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isBrowser = typeof window !== "undefined";
  const pathname = isBrowser
    ? new URL(url, window.location.origin).pathname
    : "";

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;

      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch { }

      throw new Error(message);
    }

    if (res.status === 204) return undefined as T;

    const data = await res.json() as T;

    if (isBrowser && method === "GET") {
      void cacheApiValue(`GET:${url}`, data).catch(() => undefined);
    }

    return data;
  } catch (error) {
    if (isBrowser && method === "GET") {
      const cached = await readCachedApiValue<T>(`GET:${url}`)
        .catch(() => undefined);

      if (cached !== undefined) return cached;
    }

    const isAttendanceSave =
      isBrowser &&
      method === "PUT" &&
      pathname === "/api/attendance";

    const isNetworkFailure =
      typeof error === "object" &&
      error !== null &&
      error instanceof TypeError;

    if (isAttendanceSave && (!navigator.onLine || isNetworkFailure)) {
      const body = typeof init?.body === "string" ? init.body : "";

      if (!body) throw error;

      // Queue only genuine offline/network failures.
      // HTTP errors such as 401, 403 or 500 are not queued.
      await enqueueAttendance(url, body);

      let count = 0;

      try {
        count =
          (JSON.parse(body) as { records?: unknown[] }).records?.length ?? 0;
      } catch { }

      return { saved: count, offlineQueued: true } as T;
    }

    throw error;
  }
}

const key = (name: string, params?: unknown) => params === undefined ? [name] : [name, params];

export const getGetDashboardQueryKey = () => ["dashboard"];
export const getGetSchoolSettingsQueryKey = () => ["school-settings"];
export const getGetStudentQueryKey = (id: string) => ["student", id];
export const getListClassesQueryKey = () => ["classes"];
export const getListFeeDuesQueryKey = (params?: unknown) => key("fee-dues", params);
export const getListPaymentsQueryKey = (params?: unknown) => key("payments", params);
export const getListStudentsQueryKey = (params?: unknown) => key("students", params);
export const getListTeachersQueryKey = (params?: unknown) => key("teachers", params);
export const getGetAttendanceRegisterQueryKey = (params?: unknown) => key("attendance", params);
export const getGetSetupStatusQueryKey = () => ["setup-status"];

export function useGetDashboard() { return useQuery({ queryKey: getGetDashboardQueryKey(), queryFn: () => request<any>("/api/dashboard") }); }
export function useGetSchoolSettings() { return useQuery({ queryKey: getGetSchoolSettingsQueryKey(), queryFn: () => request<any>("/api/settings/school") }); }
export function useGetStudent(id: string) { return useQuery({ queryKey: getGetStudentQueryKey(id), queryFn: () => request<Student>(`/api/students/${encodeURIComponent(id)}`), enabled: !!id }); }

export function useListClasses() { return useQuery({ queryKey: getListClassesQueryKey(), queryFn: () => request<any[]>("/api/academic/classes") }); }
export function useListStudents(params?: { search?: string; classId?: string; status?: string }) {
  const qs = new URLSearchParams(); if (params?.search) qs.set("search", params.search); if (params?.classId) qs.set("classId", params.classId); if (params?.status) qs.set("status", params.status);
  return useQuery({ queryKey: getListStudentsQueryKey(params), queryFn: () => request<{ items: Student[]; total: number }>(`/api/students${qs.toString() ? `?${qs}` : ""}`) });
}
export function useListTeachers(params?: { search?: string }) { const qs = new URLSearchParams(); if (params?.search) qs.set("search", params.search); return useQuery({ queryKey: getListTeachersQueryKey(params), queryFn: () => request<any[]>(`/api/teachers${qs.toString() ? `?${qs}` : ""}`) }); }
export function useListFeeDues(params?: { search?: string; classId?: string }) { const qs = new URLSearchParams(); if (params?.search) qs.set("search", params.search); if (params?.classId) qs.set("classId", params.classId); return useQuery({ queryKey: getListFeeDuesQueryKey(params), queryFn: () => request<any[]>(`/api/finance/fee-dues${qs.toString() ? `?${qs}` : ""}`) }); }
export function useListPayments(params?: { search?: string }) { const qs = new URLSearchParams(); if (params?.search) qs.set("search", params.search); return useQuery({ queryKey: getListPaymentsQueryKey(params), queryFn: () => request<any[]>(`/api/finance/payments${qs.toString() ? `?${qs}` : ""}`) }); }
export function useGetAttendanceRegister(params: { date: string; classId: string; sectionId: string }, opts?: Opts) { const qs = new URLSearchParams(params); return useQuery({ queryKey: opts?.query?.queryKey ?? getGetAttendanceRegisterQueryKey(params), queryFn: () => request<any>(`/api/attendance?${qs}`), enabled: opts?.query?.enabled ?? true }); }

export function useCreateInitialAdministrator() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/auth/setup", { method: "POST", body: JSON.stringify(data) }) }); }
export function useCreateStudent() { return useMutation({ mutationFn: ({ data }: { data: StudentInput }) => request<Student>("/api/students", { method: "POST", body: JSON.stringify(data) }) }); }
export function useUpdateStudent() { return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<StudentInput> }) => request<Student>(`/api/students/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }) }); }
export function useArchiveStudent() { return useMutation({ mutationFn: ({ id }: { id: string }) => request<void>(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" }) }); }
export function useCreateTeacher() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/teachers", { method: "POST", body: JSON.stringify(data) }) }); }
export function useUpdateTeacher() {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        employeeId?: string;
        name?: string;
        designation?: string;
        email?: string | null;
        phone?: string | null;
      };
    }) =>
      request<any>(
        `/api/teachers/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      ),
  });
}

export function useDeleteTeacher() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      request<void>(
        `/api/teachers/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
  });
}
export function useCreateClass() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/academic/classes", { method: "POST", body: JSON.stringify(data) }) }); }
export function useCreateSection() { return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => request<any>(`/api/academic/classes/${encodeURIComponent(id)}/sections`, { method: "POST", body: JSON.stringify(data) }) }); }
export function useRecordPayment() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/finance/payments", { method: "POST", body: JSON.stringify(data) }) }); }
export function useSaveAttendanceRegister() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/attendance", { method: "PUT", body: JSON.stringify(data) }) }); }
export function useUpdateSchoolSettings() { return useMutation({ mutationFn: ({ data }: { data: any }) => request<any>("/api/settings/school", { method: "PUT", body: JSON.stringify(data) }) }); }

export function useGetSetupStatus() { return useQuery({ queryKey: getGetSetupStatusQueryKey(), queryFn: () => request<{ needsSetup: boolean }>("/api/auth/setup-status") }); }


