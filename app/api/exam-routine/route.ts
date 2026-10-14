import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const examId = new URL(request.url).searchParams.get('examId');

        const rows = await prisma.examRoutine.findMany({
            where: examId ? { examId } : undefined,

            include: {
                exam: {
                    include: {
                        class: true,
                        section: true,
                    },
                },
                subject: true,
            },

            orderBy: [
                { examDate: 'asc' },
                { startTime: 'asc' },
            ],
        });

        return NextResponse.json({
            items: rows.map((row) => ({
                id: row.id,
                examId: row.examId,
                examSubjectId: row.examSubjectId,
                examDate: row.examDate.toISOString(),
                startTime: row.startTime,
                endTime: row.endTime,
                room: row.room,
                remarks: row.remarks,
                exam: row.exam,
                subject: {
                    ...row.subject,
                    maxMarks: Number(row.subject.maxMarks),
                    passMarks: Number(row.subject.passMarks),
                },
            })),
        });
    } catch (error) {
        console.error('EXAM ROUTINE GET ERROR:', error);

        return NextResponse.json(
            {
                error: 'Could not load examination routine.',
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const examId = String(body.examId || '');
        const examSubjectId = String(body.examSubjectId || '');
        const examDate = String(body.examDate || '');
        const startTime = String(body.startTime || '');
        const endTime = String(body.endTime || '');

        if (
            !examId ||
            !examSubjectId ||
            !examDate ||
            !startTime ||
            !endTime
        ) {
            return NextResponse.json(
                {
                    error:
                        'Exam, subject, date, start time and end time are required.',
                },
                { status: 400 },
            );
        }

        const subject = await prisma.examSubject.findFirst({
            where: {
                id: examSubjectId,
                examId,
            },
        });

        if (!subject) {
            return NextResponse.json(
                {
                    error:
                        'Selected subject does not belong to this exam.',
                },
                { status: 400 },
            );
        }

        const created = await prisma.examRoutine.create({
            data: {
                examId,
                examSubjectId,
                examDate: new Date(
                    `${examDate}T00:00:00.000Z`,
                ),
                startTime,
                endTime,
                room: body.room
                    ? String(body.room)
                    : null,
                remarks: body.remarks
                    ? String(body.remarks)
                    : null,
            },

            include: {
                exam: true,
                subject: true,
            },
        });

        return NextResponse.json(
            {
                item: {
                    ...created,
                    examDate:
                        created.examDate.toISOString(),
                    subject: {
                        ...created.subject,
                        maxMarks: Number(
                            created.subject.maxMarks,
                        ),
                        passMarks: Number(
                            created.subject.passMarks,
                        ),
                    },
                },
                message: `Routine entry created for ${created.subject.name}.`,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('EXAM ROUTINE POST ERROR:', error);

        return NextResponse.json(
            {
                error:
                    'Could not create routine. The same subject/date may already exist.',
                details:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 },
        );
    }
}