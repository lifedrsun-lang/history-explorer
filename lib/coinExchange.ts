export const COIN_EXCHANGE_COLLECTION = "coinExchangeRequests";
export const SILVER_COIN_WON_VALUE = 1000;

export type CoinExchangeVendor = "daiso" | "cu" | "gs25";
export type CoinExchangeStatus = "pending" | "completed" | "cancelled";

export const COIN_EXCHANGE_VENDOR_OPTIONS: Array<{
  value: CoinExchangeVendor;
  label: string;
}> = [
  { value: "daiso", label: "다이소 상품권" },
  { value: "cu", label: "CU 편의점 상품권" },
  { value: "gs25", label: "GS25 편의점 상품권" },
];

export const isCoinExchangeVendor = (
  value: unknown
): value is CoinExchangeVendor => {
  return COIN_EXCHANGE_VENDOR_OPTIONS.some(
    (option) => option.value === value
  );
};

export const getCoinExchangeVendorLabel = (
  vendor: CoinExchangeVendor
) => {
  return (
    COIN_EXCHANGE_VENDOR_OPTIONS.find(
      (option) => option.value === vendor
    )?.label || "상품권"
  );
};

export const formatCoinExchangeWon = (amount: number) => {
  return `${Math.max(0, Number(amount || 0)).toLocaleString("ko-KR")}원`;
};

export type CoinExchangeRequestSummary = {
  id: string;
  schemaVersion: 1;
  studentId: string;
  studentCollection: string;
  studentKey: string;
  studentSnapshot: {
    name: string;
    school: string;
    grade: string;
    class: string;
    studentNumber: string;
  };
  vendor: CoinExchangeVendor;
  vendorLabel: string;
  amountSilver: number;
  amountWon: number;
  status: CoinExchangeStatus;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
};
