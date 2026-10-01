import { z } from "zod";

const AttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  .refine(val => ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(val), {
    message: "Invalid attendance status"
  });

export const CheckinSchema = z.object({
  studentId: z.string().uuid().optional(),
  studentName: z.string().optional(),
  studentEmail: z.string().email().optional(),
  date: z.string().datetime(),
  status: AttendanceStatusEnum,
  notes: z.string().max(500).optional(),
  sessionId: z.string().uuid().optional(),
  manualOverride: z.boolean().optional(),
  courseCode: z.string().optional(),
  courseId: z.string().optional(),
}).refine(data => data.studentId || data.studentName, {
  message: "Either studentId or studentName is required",
  path: ["studentId"]
});

export const BatchAttendanceSchema = z.object({
  date: z.string().datetime(),
  sessionId: z.string().uuid().optional(),
  sessionTitle: z.string().optional(),
  records: z.array(z.object({
    studentId: z.string().uuid().optional(),
    studentName: z.string().optional(),
    status: AttendanceStatusEnum,
    notes: z.string().max(500).optional(),
  })).min(1),
});

export const OverrideAttendanceSchema = z.object({
  studentId: z.string().uuid().optional(),
  studentName: z.string().optional(),
  date: z.string().datetime(),
  status: AttendanceStatusEnum,
  reason: z.string().max(500).optional(),
  sessionId: z.string().uuid().optional(),
});

export const ExcuseAttendanceSchema = z.object({
  studentId: z.string().uuid().optional(),
  studentName: z.string().optional(),
  date: z.string().datetime(),
  reason: z.string().max(500),
  documentUrl: z.string().url().optional(),
  courseCode: z.string().optional(),
  courseId: z.string().optional(),
}).refine(data => data.studentId || data.studentName, {
  message: "Either studentId or studentName is required",
  path: ["studentId"]
});
