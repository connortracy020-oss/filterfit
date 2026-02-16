import { CaseStatus, EvidenceType } from "@prisma/client";

const transitions: Record<CaseStatus, CaseStatus[]> = {
  NEW: [CaseStatus.NEEDS_INFO, CaseStatus.READY_TO_SUBMIT, CaseStatus.CLOSED],
  NEEDS_INFO: [CaseStatus.READY_TO_SUBMIT, CaseStatus.CLOSED],
  READY_TO_SUBMIT: [CaseStatus.SUBMITTED, CaseStatus.NEEDS_INFO],
  SUBMITTED: [CaseStatus.APPROVED, CaseStatus.DENIED, CaseStatus.NEEDS_INFO],
  APPROVED: [CaseStatus.CREDIT_RECEIVED, CaseStatus.CLOSED],
  DENIED: [CaseStatus.CLOSED, CaseStatus.NEEDS_INFO],
  CREDIT_RECEIVED: [CaseStatus.CLOSED],
  CLOSED: []
};

export function canTransition(current: CaseStatus, next: CaseStatus) {
  if (current === next) {
    return true;
  }
  return transitions[current].includes(next);
}

export function openStatuses() {
  return [
    CaseStatus.NEW,
    CaseStatus.NEEDS_INFO,
    CaseStatus.READY_TO_SUBMIT,
    CaseStatus.SUBMITTED,
    CaseStatus.APPROVED,
    CaseStatus.DENIED
  ];
}

interface ReadinessInput {
  requiredFieldKeys: string[];
  caseData: {
    serialNumber: string | null;
    sku: string | null;
    unitCost: unknown;
    qty: number;
    expectedCredit: unknown;
    customerReturnReason: string | null;
  };
  evidenceTypes: EvidenceType[];
  requiredChecklistPending: number;
}

const fieldCheckers: Record<string, (input: ReadinessInput["caseData"]) => boolean> = {
  serialNumber: (value) => Boolean(value.serialNumber),
  sku: (value) => Boolean(value.sku),
  unitCost: (value) => value.unitCost !== null && value.unitCost !== undefined,
  qty: (value) => value.qty > 0,
  expectedCredit: (value) => value.expectedCredit !== null && value.expectedCredit !== undefined,
  failureDescription: (value) => Boolean(value.customerReturnReason)
};

const evidenceTypeByField: Record<string, EvidenceType> = {
  receipt: EvidenceType.RECEIPT,
  photo: EvidenceType.PHOTO,
  invoice: EvidenceType.INVOICE
};

export function validateReadyToSubmit(input: ReadinessInput) {
  const missingFields: string[] = [];
  const missingEvidence: string[] = [];

  for (const key of input.requiredFieldKeys) {
    const checker = fieldCheckers[key];
    if (checker && !checker(input.caseData)) {
      missingFields.push(key);
    }

    const mappedType = evidenceTypeByField[key];
    if (mappedType && !input.evidenceTypes.includes(mappedType)) {
      missingEvidence.push(mappedType);
    }
  }

  return {
    ok: missingFields.length === 0 && missingEvidence.length === 0 && input.requiredChecklistPending === 0,
    missingFields,
    missingEvidence,
    missingChecklistSteps: input.requiredChecklistPending
  };
}
