"use client";

import Image from "next/image";
import { useRef, useState } from "react";

const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 700 * 1024;
const MAX_COVER_EDGE = 720;

function estimateDataUrlBytes(dataUrl: string) {
  const payload = dataUrl.split(",")[1] || "";
  return Math.ceil((payload.length * 3) / 4);
}

async function resizeCoverImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 선택할 수 있습니다.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("원본 사진은 8MB 이하만 사용할 수 있습니다.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();

    const scale = Math.min(1, MAX_COVER_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 처리하지 못했습니다.");

    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/webp", 0.82);
    if (estimateDataUrlBytes(dataUrl) > MAX_STORED_IMAGE_BYTES) {
      throw new Error("사진을 줄인 뒤에도 너무 큽니다. 다른 사진을 선택해 주세요.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function BoardgameCardFields({
  brandName,
  coverImageDataUrl,
  onBrandNameChange,
  onCoverImageChange,
}: {
  brandName: string;
  coverImageDataUrl: string;
  onBrandNameChange: (value: string) => void;
  onCoverImageChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleFile = async (file?: File) => {
    if (!file || isProcessing) return;
    setIsProcessing(true);
    setImageError("");

    try {
      onCoverImageChange(await resizeCoverImage(file));
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "사진을 처리하지 못했습니다."
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="rounded-3xl border border-orange-100 bg-orange-50/60 p-4">
      <div className="text-sm font-black text-orange-800">보드게임 카드 정보</div>
      <p className="mt-1 text-xs font-bold leading-5 text-orange-700/70">
        이 정보는 개별 링크가 아니라 같은 보드게임 카드 전체에 적용됩니다.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-orange-100 bg-white">
            {coverImageDataUrl ? (
              <Image
                src={coverImageDataUrl}
                alt="보드게임 대표 사진 미리보기"
                fill
                sizes="144px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl" aria-label="기본 주사위 이미지">
                🎲
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-black text-orange-700 transition enabled:hover:bg-orange-100 disabled:opacity-50"
          >
            {isProcessing ? "사진 처리 중..." : coverImageDataUrl ? "사진 변경" : "사진 선택"}
          </button>
          {coverImageDataUrl ? (
            <button
              type="button"
              onClick={() => {
                onCoverImageChange("");
                setImageError("");
              }}
              className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-white"
            >
              사진 삭제
            </button>
          ) : null}
        </div>

        <label className="text-sm font-black text-slate-700">
          업체명·브랜드명 (선택)
          <input
            type="text"
            value={brandName}
            maxLength={80}
            placeholder="예: 코리아보드게임즈"
            onChange={(event) => onBrandNameChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          />
          <span className="mt-2 block text-xs font-bold leading-5 text-slate-400">
            같은 게임명이어도 업체가 다르면 새 카드를 만들 때 별도 카드로 구분됩니다.
          </span>
        </label>
      </div>

      {imageError ? (
        <p className="mt-3 text-xs font-black text-red-600" role="alert">
          {imageError}
        </p>
      ) : null}
    </section>
  );
}
