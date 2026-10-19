"use client";

import { useState } from "react";
import {
  getFeePaymentEntries,
  isPaidFeeInstallment,
  type FeeSettlement,
  type FeeInstallment,
  type SettlementInputField,
  type SettlementManualField,
} from "@/lib/feeSettlement";

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const numberInput = (value: unknown) => {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
};
const fields: { key: SettlementManualField; label: string }[] = [
  { key: "grossAmount", label: "세전 수당" },
  { key: "incomeTax", label: "소득세" },
  { key: "residentTax", label: "지방소득세" },
  { key: "employmentInsurance", label: "고용보험" },
  { key: "industrialInsurance", label: "산재보험" },
];

type Props = {
  label: string;
  expectedAmount: number;
  settlement: FeeSettlement;
  onAdd: () => void;
  onChange: (id: string, field: SettlementInputField | "reset", value?: string) => void;
  onRemove: (id: string) => void;
  onCancelSplit: () => void;
};

export default function FeeSplitPaymentsPanel({
  label, expectedAmount, settlement, onAdd, onChange, onRemove, onCancelSplit,
}: Props) {
  const [editingId, setEditingId] = useState("");
  const items: FeeInstallment[] = settlement.installments || [];
  const paymentEntries = getFeePaymentEntries(settlement, expectedAmount);
  const confirmed = paymentEntries.filter(isPaidFeeInstallment);
  const paidGross = confirmed.reduce((sum, item) => sum + Number(item.grossAmount || 0), 0);
  const received = confirmed.reduce((sum, item) => sum + Number(item.receivedAmount || 0), 0);
  const withholding = confirmed.reduce((sum, item) => sum + Number(item.taxAmount || 0) + Number(item.insuranceFee || 0), 0);
  const remaining = Math.max(0, expectedAmount - paidGross);
  const needsReview = confirmed.some((item) => (
    !Number(item.grossAmount || 0) ||
    (item.receivedAmount !== undefined &&
      Math.abs(Number(item.grossAmount || 0) - Number(item.taxAmount || 0) -
        Number(item.insuranceFee || 0) - Number(item.receivedAmount || 0)) >= 1)
  ));
  const overpaid = paidGross > expectedAmount;

  const status = needsReview || overpaid ? "금액 확인 필요"
    : paidGross === 0 ? "미수령"
    : paidGross < expectedAmount ? "부분입금" : "입금완료";

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-800">{label}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">지급예정 세전 {won(expectedAmount)} · {items.length}건 분할입금</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAdd} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">+ 분할입금 추가</button>
          <button type="button" onClick={() => {
            if (window.confirm("분할입금 내역을 취소하고 기존 1건 기록으로 되돌릴까요? 추가 입력한 내역은 사라집니다.")) onCancelSplit();
          }} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">기존 방식으로 복원</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white p-3 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-slate-500">실수령 합계</p><p className="font-black">{won(received)}</p></div>
        <div><p className="text-xs text-slate-500">지급분 세전 합계</p><p className="font-black">{won(paidGross)}</p></div>
        <div><p className="text-xs text-slate-500">공제 합계</p><p className="font-black">{won(withholding)}</p></div>
        <div><p className="text-xs text-slate-500">미지급 세전</p><p className="font-black text-blue-700">{won(remaining)}</p></div>
      </div>
      <div role="status" className={`mt-2 rounded-lg px-3 py-2 text-sm font-bold ${needsReview || overpaid ? "bg-rose-50 text-rose-700" : remaining > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
        {status}{overpaid ? ` · 예상보다 ${won(paidGross - expectedAmount)} 초과` : ""}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        각 차수의 실제 명세서 기준으로 세전 수당·실수령액·공제액을 입력하세요. 입금일을 입력하면 종합소득세 카드에서 각 지급일의 연도·월별로 집계합니다.
        기존 단일 기록은 보관되며 분할입금 합계에 중복 포함되지 않습니다.
      </p>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => {
          const entry = paymentEntries[index];
          const canEdit = editingId === item.id;
          const rowKey = `${item.id}-${index}`;
          const rowMismatch = isPaidFeeInstallment(entry) && entry.receivedAmount !== undefined &&
            Math.abs(Number(entry.grossAmount || 0) - Number(entry.taxAmount || 0) -
              Number(entry.insuranceFee || 0) - Number(entry.receivedAmount || 0)) >= 1;
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-800">{index + 1}차 입금</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(canEdit ? "" : item.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{canEdit ? "수정 마침" : "공제 직접 수정"}</button>
                  <button type="button" onClick={() => onChange(item.id, "reset")} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">공제 자동계산</button>
                  {items.length > 1 && <button type="button" onClick={() => {
                    if (window.confirm(`${index + 1}차 입금 기록을 삭제할까요?`)) onRemove(item.id);
                  }} className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">삭제</button>}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
                <label className="text-xs font-bold text-slate-600">
                  받은 금액
                  <input key={`${rowKey}-net-${item.receivedAmount ?? "empty"}`} inputMode="numeric"
                    defaultValue={numberInput(item.receivedAmount)}
                    onChange={(event) => { event.target.value = numberInput(event.target.value); }}
                    onBlur={(event) => onChange(item.id, "receivedAmount", event.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="실수령액"
                    className="mt-1 w-full rounded-lg border border-blue-200 p-2 text-sm font-bold" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  입금일
                  <input key={`${rowKey}-date-${item.receivedDate || ""}`} type="date"
                    defaultValue={item.receivedDate || ""}
                    onChange={(event) => onChange(item.id, "receivedDate", event.target.value)}
                    className="mt-1 w-full min-w-0 rounded-lg border border-slate-200 p-2 text-sm font-bold" />
                </label>
                {fields.map((field) => (
                  <label key={field.key} className="text-xs font-bold text-slate-600">
                    {field.label}
                    <input key={`${rowKey}-${field.key}-${entry[field.key] ?? 0}`} inputMode="numeric"
                      readOnly={field.key !== "grossAmount" && !canEdit}
                      defaultValue={numberInput(entry[field.key] ?? 0)}
                      onChange={(event) => { event.target.value = numberInput(event.target.value); }}
                      onBlur={(event) => {
                        if (field.key !== "grossAmount" && !canEdit) return;
                        const value = event.target.value.replace(/[^0-9]/g, "");
                        if (Number(value || 0) !== Number(entry[field.key] || 0)) onChange(item.id, field.key, value);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-bold read-only:bg-slate-50 read-only:text-slate-500" />
                    <span className="mt-1 block text-[10px] font-normal text-slate-400">
                      {entry.manualFields?.includes(field.key) ? "직접 입력" : "자동 계산"}
                    </span>
                  </label>
                ))}
              </div>
              {rowMismatch && <p role="alert" className="mt-2 text-xs font-bold text-rose-700">
                차수별 세전 수당 - 공제액과 실수령액이 일치하지 않습니다. 입금 명세서를 확인해 주세요.
              </p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
