import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function grade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
}

/*
 * SchoolSettings-এর logo/signature Prisma generated type-এ
 * না থাকলেও database থেকে safely পড়ার জন্য raw query ব্যবহার করা হচ্ছে।
 */
type SchoolBranding = {
    logoUrl: string | null;
    headSignatureUrl: string | null;
};

async function getSchoolBranding(): Promise<SchoolBranding> {
    try {
        const rows = await prisma.$queryRaw<SchoolBranding[]>`
            SELECT
                "logoUrl",
                "headSignatureUrl"
            FROM "SchoolSettings"
            WHERE "id" = 'school'
            LIMIT 1
        `;

        return {
            logoUrl: rows[0]?.logoUrl ?? null,
            headSignatureUrl: rows[0]?.headSignatureUrl ?? null,
        };
    } catch (error) {
        /*
         * যদি কোনো পুরোনো database-এ column এখনও না থাকে,
         * print system যেন পুরোপুরি crash না করে।
         */
        console.error(
            'Could not load school logo/signature:',
            error,
        );

        return {
            logoUrl: null,
            headSignatureUrl: null,
        };
    }
}

/* ============================================================
   COMMON PRINT PAGE
   ============================================================ */

function page(
    title: string,
    body: string,
    pageSize: 'A4' | 'A6' = 'A4',
): string {
    const isA6 = pageSize === 'A6';

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${escapeHtml(title)}</title>

<style>

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
}

@page {
    size: ${pageSize};
    margin: ${isA6 ? '5mm' : '10mm'};
}

body {
    padding: ${isA6 ? '5mm' : '10mm'};
}

/* ============================================================
   PRINT ACTIONS
   ============================================================ */

.print-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.print-actions button {
    padding: 9px 16px;
    border: 0;
    border-radius: 6px;
    background: #111827;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
}

.print-actions button.close {
    background: #6b7280;
}

/* ============================================================
   SCHOOL HEADER
   ============================================================ */

.school-header {
    text-align: center;
    border-bottom: 2px solid #111;
    padding-bottom: 14px;
    margin-bottom: 20px;
}

.school-name {
    font-size: ${isA6 ? '19px' : '25px'};
    font-weight: 800;
}

.school-details {
    font-size: ${isA6 ? '9px' : '12px'};
    margin-top: 5px;
    line-height: 1.5;
}

.school-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
    display: block;
    margin: 0 auto 10px;
}

/* ============================================================
   TABLE
   ============================================================ */

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

th,
td {
    border: 1px solid #333;
    padding: 9px;
    font-size: 13px;
}

th {
    background: #f1f1f1;
}

.text-center {
    text-align: center;
}

/* ============================================================
   STUDENT
   ============================================================ */

.student-box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 15px;
}

/* ============================================================
   SUMMARY
   ============================================================ */

.summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 15px;
}

.summary div {
    border: 1px solid #333;
    padding: 10px;
    text-align: center;
}

/* ============================================================
   SIGNATURES
   ============================================================ */

.signatures {
    display: flex;
    justify-content: space-between;
    gap: 25px;
    margin-top: 80px;
}

.signature {
    width: 180px;
    border-top: 1px solid #111;
    text-align: center;
    padding-top: 6px;
}

/* ============================================================
   HEAD SIGNATURE IMAGE
   ============================================================ */

.head-signature-area {
    width: 180px;
    height: 58px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    margin-bottom: 5px;
}

.head-signature-image {
    max-width: 150px;
    max-height: 50px;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
}

/* ============================================================
   PAYMENT RECEIPT
   ============================================================ */

.payment-receipt {
    width: 100%;
    margin: 0 auto;
    border: 2px solid #111;
    padding: ${isA6 ? '7mm' : '12mm'};
}

.payment-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.payment-title {
    font-size: ${isA6 ? '15px' : '20px'};
    font-weight: 800;
    margin-top: 2px;
}

.payment-subtitle {
    margin-top: 4px;
    font-size: ${isA6 ? '8px' : '10px'};
    text-transform: uppercase;
    letter-spacing: .12em;
}

.receipt-number {
    text-align: right;
    font-size: ${isA6 ? '9px' : '12px'};
    line-height: 1.5;
}

.receipt-number strong {
    display: block;
    font-size: ${isA6 ? '11px' : '14px'};
}

.payment-divider {
    height: 1px;
    background: #111;
    margin: ${isA6 ? '12px 0' : '18px 0'};
}

.payment-info {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
}

.payment-info tr {
    border-bottom: 1px solid #d1d5db;
}

.payment-info td {
    border: 0;
    padding: ${isA6 ? '5px 2px' : '8px 2px'};
    font-size: ${isA6 ? '9px' : '12px'};
    vertical-align: top;
}

.payment-info td:first-child {
    width: 36%;
    font-weight: 700;
    color: #374151;
}

.payment-info td:last-child {
    font-weight: 600;
}

.amount-box {
    margin-top: ${isA6 ? '12px' : '18px'};
    border: 2px solid #111;
    padding: ${isA6 ? '8px' : '12px'};
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.amount-label {
    font-size: ${isA6 ? '9px' : '11px'};
    text-transform: uppercase;
    letter-spacing: .1em;
    font-weight: 700;
}

.amount-value {
    font-size: ${isA6 ? '17px' : '24px'};
    font-weight: 900;
}

.payment-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-top: ${isA6 ? '30px' : '55px'};
}

.thank-you {
    font-size: ${isA6 ? '8px' : '10px'};
    color: #4b5563;
    max-width: 60%;
    line-height: 1.5;
}

.received-sign {
    width: ${isA6 ? '100px' : '150px'};
    border-top: 1px solid #111;
    padding-top: 5px;
    text-align: center;
    font-size: ${isA6 ? '8px' : '10px'};
}

.print-size {
    text-align: center;
    margin-top: 12px;
    font-size: 8px;
    color: #6b7280;
}

/* ============================================================
   PRINT
   ============================================================ */

@media print {

    .print-actions,
    .print-size {
        display: none !important;
    }

    body {
        padding: 0;
    }

    .payment-receipt {
        page-break-inside: avoid;
    }

    .school-header {
        page-break-inside: avoid;
    }

    .signatures {
        page-break-inside: avoid;
    }
}

</style>
</head>

<body>

<div class="print-actions">
    <button onclick="window.print()">Print</button>
    <button class="close" onclick="window.close()">Close</button>
</div>

${body}

<div class="print-size">
    ${pageSize} document
</div>

</body>
</html>
`;
}

/* ============================================================
   GET
   ============================================================ */

export async function GET(request: Request) {
    try {
        const search =
            new URL(request.url).searchParams;

        const type =
            search.get('type') || 'routine';

        const examId =
            search.get('examId');

        const studentId =
            search.get('studentId');

        const paymentId =
            search.get('paymentId');

        /* ========================================================
           PAYMENT RECEIPT
           Logo/signature intentionally NOT loaded here.
           ======================================================== */

        if (type === 'payment') {

            if (!paymentId) {
                return new NextResponse(
                    'Payment ID is required.',
                    { status: 400 },
                );
            }

            const requestedSize =
                String(
                    search.get('size') || 'A4',
                ).toUpperCase();

            const pageSize: 'A4' | 'A6' =
                requestedSize === 'A6'
                    ? 'A6'
                    : 'A4';

            const payment =
                await prisma.payment.findUnique({
                    where: {
                        id: paymentId,
                    },

                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                admissionNumber: true,
                            },
                        },
                    },
                });

            if (!payment) {
                return new NextResponse(
                    'Payment not found.',
                    { status: 404 },
                );
            }

            /*
             * Logo/signature intentionally NOT fetched.
             */
            const school =
                await prisma.schoolSettings.findUnique({
                    where: {
                        id: 'school',
                    },
                });

            const studentName =
                `${payment.student.firstName} ${payment.student.lastName}`
                    .trim();

            const method =
                String(payment.method || '')
                    .toLowerCase()
                    .replaceAll('_', ' ');

            const amount =
                Number(payment.amount || 0)
                    .toFixed(2);

            const paidDate =
                payment.paidAt.toLocaleString(
                    'en-IN',
                    {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                    },
                );

            const schoolAddress = [
                school?.address,
                school?.city,
                school?.state,
                school?.country,
            ]
                .filter(Boolean)
                .join(', ');

            const contact = [
                school?.phone
                    ? `Phone: ${escapeHtml(
                        school.phone,
                    )}`
                    : '',

                school?.email
                    ? `Email: ${escapeHtml(
                        school.email,
                    )}`
                    : '',
            ]
                .filter(Boolean)
                .join(
                    ' &nbsp; | &nbsp; ',
                );

            const html = page(
                `${payment.receiptNumber} - Payment Receipt`,
                `
<div class="payment-receipt">

    <div class="payment-top">

        <div>

            <div class="payment-title">
                ${escapeHtml(
                    school?.schoolName ||
                    'School',
                )}
            </div>

            ${schoolAddress
                    ? `
            <div class="school-details">
                ${escapeHtml(
                        schoolAddress,
                    )}
            </div>
            `
                    : ''
                }

            ${contact
                    ? `
            <div class="school-details">
                ${contact}
            </div>
            `
                    : ''
                }

            <div class="payment-subtitle">
                Official Fee Payment Receipt
            </div>

        </div>

        <div class="receipt-number">

            Receipt No.

            <strong>
                ${escapeHtml(
                    payment.receiptNumber,
                )}
            </strong>

        </div>

    </div>

    <div class="payment-divider"></div>

    <table class="payment-info">

        <tbody>

            <tr>
                <td>Student Name</td>

                <td>
                    ${escapeHtml(
                    studentName,
                )}
                </td>
            </tr>

            <tr>
                <td>Admission No.</td>

                <td>
                    ${escapeHtml(
                    payment.student
                        .admissionNumber,
                )}
                </td>
            </tr>

            <tr>
                <td>Payment Date</td>

                <td>
                    ${escapeHtml(
                    paidDate,
                )}
                </td>
            </tr>

            <tr>
                <td>Payment Method</td>

                <td
                    style="text-transform:capitalize;"
                >
                    ${escapeHtml(method)}
                </td>
            </tr>

            ${payment.transactionId
                    ? `
            <tr>

                <td>
                    Transaction Reference
                </td>

                <td>
                    ${escapeHtml(
                        payment.transactionId,
                    )}
                </td>

            </tr>
            `
                    : ''
                }

        </tbody>

    </table>

    <div class="amount-box">

        <div class="amount-label">
            Amount Received
        </div>

        <div class="amount-value">
            ₹${escapeHtml(amount)}
        </div>

    </div>

    <div class="payment-footer">

        <div class="thank-you">
            Thank you for your payment.
            Please retain this receipt
            for your records.
        </div>

        <div class="received-sign">
            Authorized Signature
        </div>

    </div>

</div>
`,
                pageSize,
            );

            return new NextResponse(
                html,
                {
                    headers: {
                        'Content-Type':
                            'text/html; charset=utf-8',

                        'Cache-Control':
                            'no-store, no-cache, must-revalidate',
                    },
                },
            );
        }

        /* ========================================================
           EXAM ID REQUIRED FOR ROUTINE / MARKSHEET
           ======================================================== */

        if (!examId) {
            return new NextResponse(
                'Exam ID is required.',
                { status: 400 },
            );
        }

        /* ========================================================
           NORMAL SCHOOL SETTINGS
           Logo/signature are NOT selected by Prisma here.
           ======================================================== */

        const school =
            await prisma.schoolSettings.findUnique({
                where: {
                    id: 'school',
                },
            });

        /* ========================================================
           ROUTINE
           Logo/signature intentionally NOT used.
           ======================================================== */

        if (type === 'routine') {

            const exam =
                await prisma.exam.findUnique({
                    where: {
                        id: examId,
                    },

                    include: {
                        class: true,
                        section: true,

                        routines: {
                            include: {
                                subject: true,
                            },

                            orderBy: [
                                {
                                    examDate: 'asc',
                                },
                                {
                                    startTime: 'asc',
                                },
                            ],
                        },
                    },
                });

            if (!exam) {
                return new NextResponse(
                    'Exam not found.',
                    { status: 404 },
                );
            }

            const rows =
                exam.routines
                    .map(
                        (row) => `
<tr>

<td>
${escapeHtml(
                            row.examDate
                                .toISOString()
                                .slice(0, 10),
                        )}
</td>

<td>
${escapeHtml(
                            row.subject.name,
                        )}
</td>

<td class="text-center">
${escapeHtml(
                            row.startTime,
                        )}
</td>

<td class="text-center">
${escapeHtml(
                            row.endTime,
                        )}
</td>

<td class="text-center">
${escapeHtml(
                            row.room || '—',
                        )}
</td>

</tr>
`,
                    )
                    .join('');

            const html = page(
                `${exam.name} - Exam Routine`,
                `
<div class="school-header">

    <div class="school-name">
        ${escapeHtml(
                    school?.schoolName ||
                    'School',
                )}
    </div>

    <div class="school-details">

        ${escapeHtml(
                    school?.address || '',
                )}

        ${school?.phone
                    ? ` | ${escapeHtml(
                        school.phone,
                    )}`
                    : ''
                }

        ${school?.email
                    ? ` | ${escapeHtml(
                        school.email,
                    )}`
                    : ''
                }

    </div>

    <h2>
        ${escapeHtml(exam.name)}
        - Examination Routine
    </h2>

    <div>

        Class:
        ${escapeHtml(
                    exam.class.name,
                )}

        ${exam.section
                    ? ` | Section: ${escapeHtml(
                        exam.section.name,
                    )}`
                    : ''
                }

    </div>

</div>

<table>

<thead>

<tr>
    <th>Date</th>
    <th>Subject</th>
    <th>Start Time</th>
    <th>End Time</th>
    <th>Room</th>
</tr>

</thead>

<tbody>

${rows ||
                `
<tr>
    <td
        colspan="5"
        class="text-center"
    >
        No routine entries found.
    </td>
</tr>
`
                }

</tbody>

</table>

<div class="signatures">

    <div class="signature">
        Class Teacher
    </div>

    <div class="signature">
        Principal / Head
    </div>

</div>
`,
                'A4',
            );

            return new NextResponse(
                html,
                {
                    headers: {
                        'Content-Type':
                            'text/html; charset=utf-8',
                    },
                },
            );
        }

        /* ========================================================
           MARKSHEET
           Logo + Head Signature ONLY HERE
           ======================================================== */

        if (type === 'marksheet') {

            if (!studentId) {
                return new NextResponse(
                    'Student ID is required.',
                    { status: 400 },
                );
            }

            /*
             * Load logo/signature ONLY for marksheet.
             */
            const branding =
                await getSchoolBranding();

            const exam =
                await prisma.exam.findUnique({
                    where: {
                        id: examId,
                    },

                    include: {
                        class: true,
                        section: true,

                        subjects: {
                            orderBy: {
                                name: 'asc',
                            },
                        },
                    },
                });

            if (!exam) {
                return new NextResponse(
                    'Exam not found.',
                    { status: 404 },
                );
            }

            const student =
                await prisma.student.findUnique({
                    where: {
                        id: studentId,
                    },

                    include: {

                        enrollments: {
                            where: {
                                sessionId:
                                    exam.sessionId,
                            },

                            include: {
                                class: true,
                                section: true,
                            },
                        },

                        examResults: {
                            where: {
                                subject: {
                                    examId,
                                },
                            },

                            include: {
                                subject: true,
                            },
                        },

                    },
                });

            if (!student) {
                return new NextResponse(
                    'Student not found.',
                    { status: 404 },
                );
            }

            const resultMap =
                new Map(
                    student.examResults.map(
                        (result) => [
                            result.examSubjectId,
                            result,
                        ],
                    ),
                );

            let total = 0;
            let maximum = 0;
            let passed = true;

            const rows =
                exam.subjects
                    .map((subject) => {

                        const result =
                            resultMap.get(
                                subject.id,
                            );

                        const obtained =
                            Number(
                                result?.marksObtained ||
                                0,
                            );

                        const maxMarks =
                            Number(
                                subject.maxMarks,
                            );

                        const passMarks =
                            Number(
                                subject.passMarks,
                            );

                        total += obtained;
                        maximum += maxMarks;

                        if (
                            obtained <
                            passMarks
                        ) {
                            passed = false;
                        }

                        return `
<tr>

<td>
${escapeHtml(
                            subject.name,
                        )}
</td>

<td class="text-center">
${escapeHtml(
                            subject.code || '—',
                        )}
</td>

<td class="text-center">
${maxMarks}
</td>

<td class="text-center">
${obtained}
</td>

<td class="text-center">
${obtained >= passMarks
                                ? 'PASS'
                                : 'FAIL'
                            }
</td>

</tr>
`;
                    })
                    .join('');

            const percentage =
                maximum > 0
                    ? (total / maximum) * 100
                    : 0;

            const enrollment =
                student.enrollments[0];

            /* ====================================================
               LOGO HTML
               ==================================================== */

            const logoHtml =
                branding.logoUrl
                    ? `
<div>
    <img
        src="${escapeHtml(
                        branding.logoUrl,
                    )}"
        alt="School Logo"
        class="school-logo"
    >
</div>
`
                    : '';

            /* ====================================================
               HEAD SIGNATURE HTML
               ==================================================== */

            const headSignatureHtml =
                branding.headSignatureUrl
                    ? `
<div class="head-signature-area">

    <img
        src="${escapeHtml(
                        branding.headSignatureUrl,
                    )}"
        alt="Head of School Signature"
        class="head-signature-image"
    >

</div>
`
                    : '';

            const html = page(
                `${student.firstName} ${student.lastName} - Marksheet`,
                `
<div class="school-header">

    ${logoHtml}

    <div class="school-name">
        ${escapeHtml(
                    school?.schoolName ||
                    'School',
                )}
    </div>

    <div class="school-details">

        ${escapeHtml(
                    school?.address || '',
                )}

        ${school?.phone
                    ? ` | ${escapeHtml(
                        school.phone,
                    )}`
                    : ''
                }

        ${school?.email
                    ? ` | ${escapeHtml(
                        school.email,
                    )}`
                    : ''
                }

    </div>

    <h2>
        MARKSHEET
    </h2>

    <div>
        ${escapeHtml(
                    exam.name,
                )}
    </div>

</div>

<div class="student-box">

    <div>
        <strong>Student:</strong>

        ${escapeHtml(
                    `${student.firstName} ${student.lastName}`,
                )}
    </div>

    <div>
        <strong>Admission No:</strong>

        ${escapeHtml(
                    student.admissionNumber,
                )}
    </div>

    <div>
        <strong>Class:</strong>

        ${escapeHtml(
                    enrollment?.class?.name ||
                    exam.class.name,
                )}
    </div>

    <div>
        <strong>Section:</strong>

        ${escapeHtml(
                    enrollment?.section?.name ||
                    exam.section?.name ||
                    '—',
                )}
    </div>

    <div>
        <strong>Roll No:</strong>

        ${escapeHtml(
                    enrollment?.rollNumber ||
                    '—',
                )}
    </div>

</div>

<table>

<thead>

<tr>
    <th>Subject</th>
    <th>Code</th>
    <th>Max Marks</th>
    <th>Obtained</th>
    <th>Status</th>
</tr>

</thead>

<tbody>

${rows}

</tbody>

</table>

<div class="summary">

    <div>
        <strong>Total</strong>
        <br>
        ${total} / ${maximum}
    </div>

    <div>
        <strong>Percentage</strong>
        <br>
        ${percentage.toFixed(2)}%
    </div>

    <div>
        <strong>Grade</strong>
        <br>
        ${grade(percentage)}
    </div>

    <div>
        <strong>Result</strong>
        <br>
        ${passed ? 'PASS' : 'FAIL'}
    </div>

</div>

<div class="signatures">

    <div class="signature">
        Class Teacher
    </div>

    <div class="signature">
        Guardian Signature(must be present)
    </div>

    <div class="signature">

        ${headSignatureHtml}

        <div
            style="
                border-top:1px solid #111;
                padding-top:6px;
            "
        >
            Principal / Head
        </div>

        

    </div>
    

</div>
<div
                style=" font-size: 8px;
        line-height: 1.25;
        text-align: bottom;
        margin-top: 8px;
        padding-top: 5px;
        color: #222;
        "
        >
           !! Must be present for verification of marksheet, and signature must be verified with the school records.
            If the signature is not verified with the school records, then the marksheet will be considered invalid
            and the student will not be allowed to appear for any further exams or assessments. The school will not
            be responsible for any consequences that may arise from the use of an invalid marksheet. It is important
            to ensure that the signature is verified with the school records before using the marksheet for any
            official purposes. If any part of the signature is missing or altered, then the marksheet will be
            considered invalid. If any part or number is doubtful, contact the class teacher or principal for
            verification of marks.
    </div>
`,
                'A4',
            );

            return new NextResponse(
                html,
                {
                    headers: {
                        'Content-Type':
                            'text/html; charset=utf-8',

                        'Cache-Control':
                            'no-store, no-cache, must-revalidate',
                    },
                },
            );
        }

        /* ========================================================
           INVALID TYPE
           ======================================================== */

        return new NextResponse(
            'Invalid print type.',
            { status: 400 },
        );

    } catch (error) {

        console.error(
            'Print route error:',
            error,
        );

        return new NextResponse(
            'Could not generate print document.',
            { status: 500 },
        );
    }
}