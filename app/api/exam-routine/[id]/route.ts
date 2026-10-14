import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Params = {
    params: Promise<{ id: string }>;
};

export async function PATCH(
    request: Request,
    { params }: Params,
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const data: {
            examId?: string;
            examSubjectId?: string;
            examDate?: Date;
            startTime?: string;
            endTime?: string;
            room?: string | null;
            remarks?: string | null;
        } = {};

        if (body.examId) {
            data.examId = String(body.examId);
        }

        if (body.examSubjectId) {
            data.examSubjectId = String(
                body.examSubjectId,
            );
        }

        if (body.examDate) {
            data.examDate = new Date(
                `${body.examDate}T00:00:00.000Z`,
            );
        }

        if (body.startTime) {
            data.startTime = String(body.startTime);
        }

        if (body.endTime) {
            data.endTime = String(body.endTime);
        }

        data.room = body.room
            ? String(body.room)
            : null;

        data.remarks = body.remarks
            ? String(body.remarks)
            : null;

        const updated = await prisma.examRoutine.update({
            where: { id },
            data,

            include: {
                exam: true,
                subject: true,
            },
        });

        return NextResponse.json({
            item: {
                ...updated,
                examDate:
                    updated.examDate.toISOString(),
                subject: {
                    ...updated.subject,
                    maxMarks: Number(
                        updated.subject.maxMarks,
                    ),
                    passMarks: Number(
                        updated.subject.passMarks,
                    ),
                },
            },
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                error:
                    'Could not update routine.',
            },
            { status: 500 },
        );
    }
}

export async function DELETE(
    _request: Request,
    { params }: Params,
) {
    try {
        const { id } = await params;

        await prisma.examRoutine.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: 'Routine deleted successfully.',
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                error:
                    'Could not delete routine.',
            },
            { status: 500 },
        );
    }
}