"use client";

import { useState } from "react";

import {
  SUN_LAB_PERMISSION_OPTIONS,
  type SunLabPermission,
} from "@/lib/sunLabMember";

type MemberProfile = {
  birthDate: string;
  allAccess: boolean;
  permissions: SunLabPermission[];
  helloMapleId: string;
  helloMaplePassword: string;
};

type Member = {
  studentId: string;
  name: string;
  school: string;
  profile: MemberProfile;
  profileLinked: boolean;
};

type Props = {
  member: Member;
  onClose: () => void;
  onSave: (profile: MemberProfile) => Promise<void>;
};

export default function SunLabMemberEditModal({
  member,
  onClose,
  onSave,
}: Props) {
  const [birthDate, setBirthDate] = useState(member.profile.birthDate || "");
  const [allAccess, setAllAccess] = useState(member.profile.allAccess === true);
  const [permissions, setPermissions] = useState<SunLabPermission[]>(
    member.profile.permissions || []
  );
  const [helloMapleId, setHelloMapleId] = useState(
    member.profile.helloMapleId || ""
  );
  const [helloMaplePassword, setHelloMaplePassword] = useState(
    member.profile.helloMaplePassword || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const togglePermission = (permission: SunLabPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({
        birthDate,
        allAccess,
        permissions,
        helloMapleId,
        helloMaplePassword,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "회원정보를 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5">
        <div className="text-2xl font-black text-slate-900">
          🌞 SUN LAB 회원정보
        </div>
        <div className="mt-1 text-sm font-bold text-slate-500">
          {member.name} · {member.school || "학교 미지정"}
        </div>
        <div className="mt-1 text-[11px] font-bold text-slate-400">
          학생 고유 ID · {member.studentId}
        </div>

        <label className="mt-5 grid gap-1.5 text-xs font-black text-slate-600">
          로그인용 생년월일 8자리
          <input
            value={birthDate}
            onChange={(event) =>
              setBirthDate(event.target.value.replace(/\D/g, "").slice(0, 8))
            }
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
            placeholder="예: 20180713"
            className="rounded-xl border px-4 py-3 text-sm"
          />
        </label>

        <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black text-amber-800">
          <input
            type="checkbox"
            checked={allAccess}
            onChange={(event) => setAllAccess(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>전체권한</span>
        </label>

        <div className="mt-4">
          <div className="text-xs font-black text-slate-600">개별 이용권한</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SUN_LAB_PERMISSION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2 text-xs font-black text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(option.value)}
                  onChange={() => togglePermission(option.value)}
                  className="h-4 w-4"
                />
                <span>
                  {option.emoji} {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
          <div className="text-sm font-black text-emerald-700">
            🍁 헬로메이플 계정 · 선택
          </div>
          <div className="mt-2 grid gap-2">
            <input
              value={helloMapleId}
              onChange={(event) => setHelloMapleId(event.target.value)}
              autoComplete="off"
              placeholder="헬로메이플 아이디"
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2"
            />
            <input
              value={helloMaplePassword}
              onChange={(event) => setHelloMaplePassword(event.target.value)}
              autoComplete="off"
              placeholder="헬로메이플 비밀번호"
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="flex-1 rounded-xl bg-emerald-600 py-3 font-black text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : "회원정보 저장"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-200 py-3 font-black text-slate-700"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

