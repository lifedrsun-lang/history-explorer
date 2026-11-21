/** One real bank transfer can settle multiple schools/classes without changing legacy fee entries. */
export type DepositAllocation = {
  contractId: string;
  unitKey: string;
  classKey: "A" | "B" | "";
  schoolName: string;
  label: string;
  serviceMonth: string;
  expectedAmount: number;
  grossAmount: number;
  receivedAmount: number;
  incomeTax: number;
  residentTax: number;
  employmentInsurance: number;
  industrialInsurance: number;
};

export type FeeBatchDeposit = {
  id: string;
  payerName: string;
  businessNumber: string;
  industryCode: string;
  receivedDate: string;
  receivedAmount: number;
  status: "matched" | "review";
  note: string;
  allocations: DepositAllocation[];
  createdAt?: string;
};

export const depositAllocationKey = (allocation: Pick<DepositAllocation, "contractId" | "unitKey" | "classKey">) =>
  `${allocation.contractId}:${allocation.unitKey}:${allocation.classKey}`;

export const feeDepositDeductions = (gross: number) => ({
  incomeTax: Math.round(gross * 0.03),
  residentTax: Math.round(gross * 0.003),
});

export const feeDepositPredictedNet = (gross: number) => {
  const deductions = feeDepositDeductions(gross);
  return Math.max(0, gross - deductions.incomeTax - deductions.residentTax);
};

export const getMatchedAllocations = (deposits: FeeBatchDeposit[]) =>
  deposits.filter((deposit) => deposit.status === "matched").flatMap((deposit) => deposit.allocations);

export const amountWon = (amount: number) => `${Math.round(amount).toLocaleString("ko-KR")}원`;
