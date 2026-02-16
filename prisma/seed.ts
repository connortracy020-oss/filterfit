import {
  CaseEventType,
  CaseStatus,
  EvidenceType,
  ImportDedupeMode,
  ImportJobStatus,
  MembershipRole,
  PrismaClient,
  SubscriptionPlan
} from "@prisma/client";

const prisma = new PrismaClient();

const statuses: CaseStatus[] = [
  CaseStatus.NEW,
  CaseStatus.NEEDS_INFO,
  CaseStatus.READY_TO_SUBMIT,
  CaseStatus.SUBMITTED,
  CaseStatus.APPROVED,
  CaseStatus.DENIED,
  CaseStatus.CREDIT_RECEIVED,
  CaseStatus.CLOSED
];

const templates = [
  {
    name: "Acme Warranty RMA",
    vendorName: "Acme Tools",
    slaDays: 14,
    requiredFields: ["serialNumber", "receipt", "photo", "failureDescription"],
    steps: [
      {
        id: "collect-evidence",
        title: "Collect receipt and photos",
        description: "Capture item condition and include receipt copy",
        required: true,
        fieldsNeeded: ["receipt", "photo"],
        defaultDueDays: 2
      },
      {
        id: "submit-portal",
        title: "Submit in Acme vendor portal",
        description: "Open claim and attach documents",
        required: true,
        fieldsNeeded: ["serialNumber", "failureDescription"],
        defaultDueDays: 5
      }
    ]
  },
  {
    name: "VoltWorks Supplier Credit",
    vendorName: "VoltWorks Distribution",
    slaDays: 21,
    requiredFields: ["receipt", "sku", "photo"],
    steps: [
      {
        id: "qa-check",
        title: "QA confirmation",
        description: "Verify defect and update notes",
        required: true,
        fieldsNeeded: ["photo", "failureDescription"],
        defaultDueDays: 3
      },
      {
        id: "submit-rma",
        title: "Submit supplier RMA form",
        description: "Include sku and quantity",
        required: true,
        fieldsNeeded: ["sku", "receipt"],
        defaultDueDays: 7
      }
    ]
  },
  {
    name: "Northstar Parts Claim",
    vendorName: "Northstar Appliance Parts",
    slaDays: 30,
    requiredFields: ["receipt", "serialNumber", "invoice"],
    steps: [
      {
        id: "validate-serial",
        title: "Validate serial and model",
        description: "Cross-check serial with invoice",
        required: true,
        fieldsNeeded: ["serialNumber", "invoice"],
        defaultDueDays: 4
      },
      {
        id: "ship-return",
        title: "Ship return and upload tracking",
        description: "Attach tracking and confirmation",
        required: true,
        fieldsNeeded: ["photo"],
        defaultDueDays: 10
      }
    ]
  }
];

function shouldCompleteChecklist(status: CaseStatus) {
  const statusesToComplete = new Set<CaseStatus>([
    CaseStatus.READY_TO_SUBMIT,
    CaseStatus.SUBMITTED,
    CaseStatus.APPROVED,
    CaseStatus.DENIED,
    CaseStatus.CREDIT_RECEIVED,
    CaseStatus.CLOSED
  ]);
  return statusesToComplete.has(status);
}

function expectedCredit(index: number) {
  return Number((35 + (index % 8) * 11.5).toFixed(2));
}

async function main() {
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.evidenceFile.deleteMany();
  await prisma.caseChecklistItem.deleteMany();
  await prisma.case.deleteMany();
  await prisma.vendorTemplate.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const [adminUser, staffUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Demo Admin",
        email: "admin@vendorcredit.local"
      }
    }),
    prisma.user.create({
      data: {
        name: "Demo Staff",
        email: "staff@vendorcredit.local"
      }
    }),
    prisma.user.create({
      data: {
        name: "Demo Viewer",
        email: "viewer@vendorcredit.local"
      }
    })
  ]);

  const org = await prisma.organization.create({
    data: {
      name: "Demo Hardware Co",
      timezone: "America/New_York"
    }
  });

  await prisma.membership.createMany({
    data: [
      { orgId: org.id, userId: adminUser.id, role: MembershipRole.ADMIN },
      { orgId: org.id, userId: staffUser.id, role: MembershipRole.STAFF },
      { orgId: org.id, userId: viewerUser.id, role: MembershipRole.VIEWER }
    ]
  });

  await prisma.subscription.create({
    data: {
      orgId: org.id,
      stripeCustomerId: "cus_demo_123",
      stripeSubscriptionId: "sub_demo_123",
      status: "active",
      plan: SubscriptionPlan.PRO,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }
  });

  const vendorRecords = [] as Array<{ id: string; name: string }>;
  const templateRecords = [] as Array<{ id: string; vendorId: string; name: string; steps: unknown[]; slaDays: number }>;

  for (const entry of templates) {
    const vendor = await prisma.vendor.create({
      data: {
        orgId: org.id,
        name: entry.vendorName,
        contactEmail: `support@${entry.vendorName.toLowerCase().replace(/\s+/g, "")}.example.com`,
        portalUrl: `https://${entry.vendorName.toLowerCase().replace(/\s+/g, "")}.example.com/claims`,
        notes: "Demo seed vendor"
      }
    });

    const template = await prisma.vendorTemplate.create({
      data: {
        orgId: org.id,
        vendorId: vendor.id,
        name: entry.name,
        steps: entry.steps,
        requiredFields: entry.requiredFields,
        slaDays: entry.slaDays
      }
    });

    vendorRecords.push({ id: vendor.id, name: vendor.name });
    templateRecords.push({
      id: template.id,
      vendorId: vendor.id,
      name: template.name,
      steps: entry.steps,
      slaDays: entry.slaDays
    });
  }

  for (let i = 0; i < 30; i += 1) {
    const status = statuses[i % statuses.length];
    const vendor = vendorRecords[i % vendorRecords.length];
    const template = templateRecords.find((entry) => entry.vendorId === vendor.id)!;

    const createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dueDate = new Date(createdAt.getTime() + template.slaDays * 24 * 60 * 60 * 1000);

    const created = await prisma.case.create({
      data: {
        orgId: org.id,
        vendorId: vendor.id,
        templateId: template.id,
        status,
        createdAt,
        dueDate,
        purchaseDate: new Date(createdAt.getTime() - 7 * 24 * 60 * 60 * 1000),
        returnDate: createdAt,
        receiptId: `R-${1000 + i}`,
        sku: `SKU-${(i + 1).toString().padStart(4, "0")}`,
        brand: i % 2 === 0 ? "Acme" : "VoltWorks",
        model: `MDL-${(200 + i).toString()}`,
        serialNumber: `SN-${5000 + i}`,
        qty: (i % 3) + 1,
        unitCost: Number((20 + i * 1.5).toFixed(2)),
        expectedCredit: expectedCredit(i),
        actualCredit:
          status === CaseStatus.CREDIT_RECEIVED || status === CaseStatus.CLOSED
            ? Number((expectedCredit(i) - 3).toFixed(2))
            : null,
        customerReturnReason: i % 2 === 0 ? "Defective on arrival" : "Stopped working under normal use",
        internalNotes: "Seed demo case"
      }
    });

    const steps = template.steps as Array<{
      id: string;
      title: string;
      description: string;
      required: boolean;
      fieldsNeeded: string[];
      defaultDueDays: number;
    }>;

    for (const step of steps) {
      await prisma.caseChecklistItem.create({
        data: {
          orgId: org.id,
          caseId: created.id,
          stepId: step.id,
          title: step.title,
          description: step.description,
          required: step.required,
          fieldsNeeded: step.fieldsNeeded,
          defaultDueDays: step.defaultDueDays,
          completedAt: shouldCompleteChecklist(status) ? createdAt : null,
          completedByUserId: shouldCompleteChecklist(status) ? staffUser.id : null
        }
      });
    }

    if (i % 2 === 0) {
      await prisma.evidenceFile.create({
        data: {
          orgId: org.id,
          caseId: created.id,
          type: EvidenceType.RECEIPT,
          filename: `receipt-${created.receiptId}.pdf`,
          url: `${org.id}/${created.id}/receipt-${created.receiptId}.pdf`,
          mimeType: "application/pdf",
          size: 25000 + i,
          uploadedByUserId: staffUser.id
        }
      });

      await prisma.evidenceFile.create({
        data: {
          orgId: org.id,
          caseId: created.id,
          type: EvidenceType.PHOTO,
          filename: `photo-${created.receiptId}.jpg`,
          url: `${org.id}/${created.id}/photo-${created.receiptId}.jpg`,
          mimeType: "image/jpeg",
          size: 70000 + i,
          uploadedByUserId: staffUser.id
        }
      });
    }

    await prisma.caseEvent.create({
      data: {
        orgId: org.id,
        caseId: created.id,
        actorUserId: staffUser.id,
        type: CaseEventType.CASE_CREATED,
        message: "Case created from seed data"
      }
    });

    if (status !== CaseStatus.NEW) {
      await prisma.caseEvent.create({
        data: {
          orgId: org.id,
          caseId: created.id,
          actorUserId: staffUser.id,
          type: CaseEventType.STATUS_CHANGED,
          message: `Status changed to ${status}`
        }
      });
    }
  }

  const importJob = await prisma.importJob.create({
    data: {
      orgId: org.id,
      status: ImportJobStatus.COMPLETED,
      originalFilename: "demo-import.csv",
      dedupeMode: ImportDedupeMode.SKIP,
      mapping: {
        receiptId: "receiptId",
        sku: "sku",
        returnReason: "returnReason",
        unitCost: "unitCost",
        qty: "qty",
        vendor: "vendor",
        returnDate: "returnDate",
        expectedCredit: "expectedCredit"
      },
      previewRows: [
        {
          receiptId: "R-2001",
          sku: "SKU-2001",
          returnReason: "Failed under warranty",
          unitCost: "89.95",
          qty: "1",
          vendor: "Acme Tools",
          returnDate: "2026-01-28",
          expectedCredit: "74.50"
        }
      ],
      createdByUserId: adminUser.id,
      completedAt: new Date(),
      rows: {
        createMany: {
          data: [
            {
              raw: {
                receiptId: "R-2001",
                sku: "SKU-2001",
                returnReason: "Failed under warranty",
                unitCost: "89.95",
                qty: "1",
                vendor: "Acme Tools",
                returnDate: "2026-01-28",
                expectedCredit: "74.50"
              },
              action: "CREATED"
            }
          ]
        }
      }
    }
  });

  console.log("Seed completed");
  console.log({
    demoOrgId: org.id,
    users: [adminUser.email, staffUser.email, viewerUser.email],
    importJobId: importJob.id
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
