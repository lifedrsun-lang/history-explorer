import "server-only";

export const HOMEWORK_APPROVAL_REWARD_AMOUNT = 1;
export const HOMEWORK_APPROVAL_REWARD_TEXT =
  "과제 승인으로 동엽전 1개가 지급되었습니다.";
export const HOMEWORK_APPROVAL_REVOKE_TEXT =
  "과제 승인 취소로 동엽전 1개가 회수되었습니다.";

export type CoinBalanceInput = {
  bronze?: unknown;
  silver?: unknown;
  totalBronze?: unknown;
  totalSilver?: unknown;
};

export type HomeworkRewardCalculation = {
  bronze: number;
  silver: number;
  totalBronze: number;
  totalSilver: number;
  exchangeCount: number;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const calculateHomeworkApprovalReward = (
  student: CoinBalanceInput,
  amount = HOMEWORK_APPROVAL_REWARD_AMOUNT
): HomeworkRewardCalculation => {
  const currentBronze = toNumber(student.bronze);
  const currentSilver = toNumber(student.silver);
  const afterAddBronze = currentBronze + amount;
  const exchangeCount = Math.floor(afterAddBronze / 10);

  return {
    bronze: afterAddBronze % 10,
    silver: currentSilver + exchangeCount,
    totalBronze: toNumber(student.totalBronze) + amount,
    totalSilver: toNumber(student.totalSilver) + exchangeCount,
    exchangeCount,
  };
};

export const calculateHomeworkApprovalRevoke = (
  student: CoinBalanceInput,
  rewardExchangeCount = 0,
  amount = HOMEWORK_APPROVAL_REWARD_AMOUNT
) => {
  const currentBronze = toNumber(student.bronze);
  const currentSilver = toNumber(student.silver);
  const currentValue = currentSilver * 10 + currentBronze;

  if (currentValue < amount) {
    throw new Error("insufficient_coin_balance");
  }

  const nextValue = currentValue - amount;

  return {
    bronze: nextValue % 10,
    silver: Math.floor(nextValue / 10),
    totalBronze: Math.max(toNumber(student.totalBronze) - amount, 0),
    totalSilver: Math.max(toNumber(student.totalSilver) - rewardExchangeCount, 0),
  };
};

export const getTodayString = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const appendCoinHistory = (
  currentHistory: unknown,
  items: Record<string, unknown>[]
) => {
  const baseHistory = Array.isArray(currentHistory) ? currentHistory : [];

  return [...baseHistory, ...items].slice(-100);
};
