"use client";

import { useMemo, useState } from "react";
import {
  type DepositAllocation, type FeeBatchDeposit, depositAllocationKey,
  feeDepositDeductions, feeDepositPredictedNet, getMatchedAllocations, amountWon,
} from "@/lib/feeBatchDeposits";

export type BatchCandidate = {
  contractId: string;
  unitKey: string;
  classKey: "A" | "B" | "";
  schoolName: string;
  label: string;
  serviceMonth: string;
  expectedAmount: number;
  blocked: boolean;
  payerName: string;
  businessNumber: string;
  industryCode: string;
};

type Props = {
  candidates: BatchCandidate[];
  deposits: FeeBatchDeposit[];
  requestJson: (url: string, init?: RequestInit) => Promise<unknown>;
  onSaved: () => Promise<void>;
};

type DeductionField = "grossAmount" | "incomeTax" | "residentTax" | "employmentInsurance" | "industrialInsurance";
const integer = (text: string) => Number(text.replace(/[^0-9]/g, "") || 0);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const candidateKey = (candidate: BatchCandidate) => depositAllocationKey(candidate);
const payerKey = (item: Pick<BatchCandidate, "payerName" | "businessNumber">) =>
  `${item.payerName}|${item.businessNumber}`;

export default function FeeBatchDepositsPanel({ candidates, deposits, requestJson, onSaved }: Props) {
  const payers = useMemo(() => {
    const map = new Map<string, { name: string; number: string; industryCode: string }>();
    candidates.forEach((item) => {
      if (item.payerName && item.payerName !== "업체 미지정") {
        map.set(payerKey(item), { name: item.payerName, number: item.businessNumber, industryCode: item.industryCode });
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  }, [candidates]);
  const [selectedPayer, setSelectedPayer] = useState("");
  const [mode, setMode] = useState<"class" | "school" | "company">("company");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [allMonths, setAllMonths] = useState(false);
  const [receivedDate, setReceivedDate] = useState(today());
  const [receivedAmount, setReceivedAmount] = useState("");
  const [note, setNote] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<DeductionField, string>>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const payer = payers.find((p) => `${p.name}|${p.number}` === selectedPayer);
  const matched = useMemo(() => getMatchedAllocations(deposits), [deposits]);
  const used = useMemo(() => {
    const result = new Map<string, number>();
    matched.forEach((item) => {
      const key = depositAllocationKey(item);
      result.set(key, (result.get(key) || 0) + item.grossAmount);
    });
    return result;
  }, [matched]);
  const visible = candidates.filter((item) =>
    payer && payerKey(item) === selectedPayer && (allMonths || item.serviceMonth === month));
  const rows = visible.map((item) => ({
    ...item, key: candidateKey(item),
    remaining: Math.max(0, item.expectedAmount - (used.get(candidateKey(item)) || 0)),
  }));
  const selectedRows = rows.filter((row) => selection.includes(row.key) && !row.blocked && row.remaining > 0);

  const getFields = (row: typeof rows[number]) => {
    const edited = overrides[row.key] || {};
    const gross = edited.grossAmount !== undefined ? integer(edited.grossAmount) : row.remaining;
    const tax = feeDepositDeductions(gross);
    const incomeTax = edited.incomeTax !== undefined ? integer(edited.incomeTax) : tax.incomeTax;
    const residentTax = edited.residentTax !== undefined ? integer(edited.residentTax) : tax.residentTax;
    const employmentInsurance = integer(edited.employmentInsurance || "");
    const industrialInsurance = integer(edited.industrialInsurance || "");
    const received = gross - incomeTax - residentTax - employmentInsurance - industrialInsurance;
    return { gross, incomeTax, residentTax, employmentInsurance, industrialInsurance, received };
  };
  const allocations: DepositAllocation[] = selectedRows.map((row) => {
    const f = getFields(row);
    return {
      contractId: row.contractId, unitKey: row.unitKey, classKey: row.classKey,
      schoolName: row.schoolName, label: row.label, serviceMonth: row.serviceMonth,
      expectedAmount: row.expectedAmount, grossAmount: f.gross, receivedAmount: f.received,
      incomeTax: f.incomeTax, residentTax: f.residentTax,
      employmentInsurance: f.employmentInsurance, industrialInsurance: f.industrialInsurance,
    };
  });
  const netTotal = allocations.reduce((sum, row) => sum + row.receivedAmount, 0);
  const actual = integer(receivedAmount);
  const matchedAmount = allocations.length > 0 && actual > 0 && netTotal === actual &&
    selectedRows.every((row) => {
      const f = getFields(row);
      return f.gross > 0 && f.gross <= row.remaining && f.received >= 0 &&
        [f.incomeTax, f.residentTax, f.employmentInsurance, f.industrialInsurance].every((v) => v >= 0);
    });

  const changeMode = (value: typeof mode) => {
    setMode(value); setSelection([]); setOverrides({}); setSuccess("");
  };
  const toggleRow = (row: typeof rows[number]) => {
    if (row.blocked || row.remaining <= 0) return;
    const exists = selection.includes(row.key);
    if (exists) { setSelection((curr) => curr.filter((value) => value !== row.key)); return; }
    if (mode === "class") { setSelection([row.key]); return; }
    if (mode === "school") {
      const first = rows.find((item) => selection.includes(item.key));
      if (first && first.schoolName !== row.schoolName) {
        setError("학교별 합산은 같은 학교의 A/B반만 선택해 주세요."); return;
      }
    }
    setSelection((curr) => [...curr, row.key]);
    setError("");
  };
  const changeOverride = (key: string, field: DeductionField, value: string) => {
    setOverrides((curr) => ({ ...curr, [key]: { ...curr[key], [field]: value.replace(/[^0-9]/g, "") } }));
  };

  const save = async (reviewOnly: boolean) => {
    if (!payer || busy) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      await requestJson("/api/teacher/fee-batch-deposits", {
        method: "POST",
        body: JSON.stringify({
          payerName: payer.name, businessNumber: payer.number, industryCode: payer.industryCode,
          receivedDate, receivedAmount: actual, note,
          allocations: reviewOnly ? [] : allocations,
        }),
      });
      setSelection([]); setOverrides({}); setReceivedAmount(""); setNote("");
      await onSaved();
      setSuccess(reviewOnly ? "입금 거래만 기록했습니다. 배분 확인 전까지 학교별 정산에는 반영되지 않습니다." : "선택한 학교·반의 수당을 통합 입금에 연결했습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "입금내역 저장에 실패했습니다."); }
    finally { setBusy(false); }
  };
  const deleteDeposit = async (deposit: FeeBatchDeposit) => {
    if (!window.confirm(`${deposit.payerName} ${deposit.receivedDate} ${amountWon(deposit.receivedAmount)} 입금내역을 삭제할까요? 연결된 학교별 정산 및 세금 집계에서도 제외됩니다.`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await requestJson(`/api/teacher/fee-batch-deposits?id=${encodeURIComponent(deposit.id)}`, { method: "DELETE" });
      await onSaved();
      setSuccess("입금내역과 연결된 정산 정보를 삭제했습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
    finally { setBusy(false); }
  };
  return (
    <section className="mt-3 rounded-[28px] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">업체·학교·반 통합 입금</h2>
          <p className="mt-1 text-xs text-slate-500">실제 통장 입금 한 건에 여러 수업을 연결합니다. 기존 학교별 정산 기록은 보존합니다.</p>
        </div>
        <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">통합 입금 내역 {deposits.length}건</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">입금 업체
          <select value={selectedPayer} onChange={(e) => { setSelectedPayer(e.target.value); setSelection([]); setOverrides({}); }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm">
            <option value="">업체 선택</option>
            {payers.map((p) => <option key={p.name+"|"+p.number} value={p.name+"|"+p.number}>{p.name}{p.number ? ` (${p.number})` : ""}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">수업 해당 월
          <input type="month" value={month} disabled={allMonths} onChange={(e) => { setMonth(e.target.value); setSelection([]); }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={allMonths} onChange={(e) => { setAllMonths(e.target.checked); setSelection([]); }} />
          여러 달 합산 조회
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="입금 방식">
        {([{ id: "class", label: "A/B반 각각" }, { id: "school", label: "한 학교 A+B" }, { id: "company", label: "업체 여러 학교" }] as const).map((item) => (
          <button type="button" key={item.id} onClick={() => changeMode(item.id)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${mode === item.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>
        ))}
      </div>
      {!payer ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">업체를 선택하면 연결 가능한 미입금 수업이 표시됩니다. 업체가 목록에 없다면 종합소득세 메뉴에서 학교별 지급 업체를 먼저 지정해 주세요.</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">이 조건에 해당하는 수업이 없습니다. 수업월 또는 여러 달 합산 조회를 확인해 주세요.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row) => {
            const selected = selection.includes(row.key);
            const fields = getFields(row);
            return (
              <div key={row.key} className={`rounded-xl border p-3 ${selected ? "border-blue-300 bg-blue-50/40" : "border-slate-200"}`}>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input type="checkbox" checked={selected} disabled={row.blocked || row.remaining <= 0}
                    onChange={() => toggleRow(row)} className="mt-1" />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-slate-800">{row.schoolName} · {row.label}</strong>
                    <span className="block text-xs text-slate-500">{row.serviceMonth} · 남은 세전 {amountWon(row.remaining)} · 예상 실수령 {amountWon(feeDepositPredictedNet(row.remaining))}</span>
                    {row.blocked && <span className="block text-xs font-bold text-amber-700">기존 입금 기록이 있어 중복 연결할 수 없습니다.</span>}
                    {!row.blocked && row.remaining === 0 && <span className="block text-xs font-bold text-emerald-700">통합 입금 연결 완료</span>}
                  </span>
                </label>
                {selected && (
                  <details className="mt-3 rounded-lg bg-white p-3" open={false}>
                    <summary className="cursor-pointer text-xs font-black text-blue-700">수당·공제금액 확인 / 직접 수정</summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {([
                        ["grossAmount", "세전 수당"], ["incomeTax", "소득세"], ["residentTax", "지방소득세"],
                        ["employmentInsurance", "고용보험"], ["industrialInsurance", "산재보험"],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="text-xs text-slate-600">{label}
                          <input inputMode="numeric" value={overrides[row.key]?.[field] ?? String(fields[field])}
                            onChange={(e) => changeOverride(row.key, field, e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" />
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">계산된 실수령액: {amountWon(fields.received)}. 실제 명세서의 공제액이 다르면 위 값을 수정하세요.</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">실제 입금일
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2" />
        </label>
        <label className="text-sm font-bold text-slate-700">통장 입금액 (원)
          <input inputMode="numeric" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="실제 입금된 금액" className="mt-1 w-full rounded-xl border border-blue-200 p-2" />
        </label>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between"><span>선택 수업 실수령 합계</span><strong>{amountWon(netTotal)}</strong></div>
          <div className="mt-2 flex justify-between"><span>차액 (입금−선택)</span><strong className={actual === netTotal ? "text-emerald-700" : "text-rose-700"}>{amountWon(actual-netTotal)}</strong></div>
        </div>
      </div>
      <label className="mt-3 block text-sm font-bold text-slate-700">메모 (선택)
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="입금자명, 수당 명세서 참고사항 등"
          className="mt-1 w-full rounded-xl border border-slate-200 p-2" />
      </label>
      <p className="mt-3 text-xs text-slate-500">예상 공제는 소득세 3%·지방소득세 0.3%, 보험료 0원으로 시작합니다. 실제 공제액이 다를 수 있으므로 명세서와 대조해 주세요. 차액이 있으면 학교별로 임의 배분하지 않습니다.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      {success && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{success}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !payer || !receivedDate || actual <= 0 || !matchedAmount} onClick={() => void save(false)}
          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          선택한 수업 일괄 입금처리
        </button>
        <button type="button" disabled={busy || !payer || !receivedDate || actual <= 0 || matchedAmount} onClick={() => void save(true)}
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 disabled:cursor-not-allowed disabled:opacity-40">
          금액 불일치 · 입금만 기록
        </button>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="mb-3 text-sm font-black text-slate-800">등록된 통합 입금 내역</h3>
        {deposits.length === 0 ? <p className="text-sm text-slate-500">아직 등록된 통합 입금 내역이 없습니다.</p> : (
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div key={deposit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-black text-slate-800">{deposit.payerName} · {amountWon(deposit.receivedAmount)}</div>
                  <p className="mt-1 text-xs text-slate-500">{deposit.receivedDate} · {deposit.status === "matched" ? `${deposit.allocations.length}개 학교·반 정산 연결` : "배분 확인 대기"}</p>
                  {deposit.allocations.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{deposit.allocations.map((item) => `${item.schoolName} ${item.label}`).join(" / ")}</p>
                  )}
                  {deposit.note && <p className="mt-1 text-xs text-slate-500">{deposit.note}</p>}
                </div>
                <button type="button" disabled={busy} onClick={() => void deleteDeposit(deposit)}
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
