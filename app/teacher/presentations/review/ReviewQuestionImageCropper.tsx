"use client";

import { useEffect, useMemo, useState } from "react";

type CropInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

const EMPTY_CROP: CropInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundedPercent = (value: number) => Math.round(value * 10) / 10;

async function detectContentCrop(file: File): Promise<CropInsets> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("image_load_failed"));
      next.src = url;
    });
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return EMPTY_CROP;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const isNearWhite =
          pixels[offset] >= 244 &&
          pixels[offset + 1] >= 244 &&
          pixels[offset + 2] >= 244;
        if (isNearWhite) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return EMPTY_CROP;
    const padding = Math.max(4, Math.round(Math.min(width, height) * 0.012));
    minX = clamp(minX - padding, 0, width - 1);
    minY = clamp(minY - padding, 0, height - 1);
    maxX = clamp(maxX + padding, minX + 1, width - 1);
    maxY = clamp(maxY + padding, minY + 1, height - 1);

    return {
      top: roundedPercent((minY / height) * 100),
      right: roundedPercent(((width - maxX - 1) / width) * 100),
      bottom: roundedPercent(((height - maxY - 1) / height) * 100),
      left: roundedPercent((minX / width) * 100),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function cropFile(file: File, crop: CropInsets): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error("image_load_failed"));
      next.src = url;
    });
    const sourceX = Math.round((crop.left / 100) * image.naturalWidth);
    const sourceY = Math.round((crop.top / 100) * image.naturalHeight);
    const sourceWidth = Math.max(
      1,
      Math.round(((100 - crop.left - crop.right) / 100) * image.naturalWidth)
    );
    const sourceHeight = Math.max(
      1,
      Math.round(((100 - crop.top - crop.bottom) / 100) * image.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, sourceWidth, sourceHeight);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );
    const outputType = file.type === "image/png" ? "image/png" : "image/webp";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("image_crop_failed"))),
        outputType,
        0.92
      );
    });
    const baseName = file.name.replace(/\.[^.]+$/, "") || "question";
    const extension = outputType === "image/png" ? "png" : "webp";
    return new File([blob], `${baseName}-question.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReviewQuestionImageCropper({ file, onCancel, onConfirm }: Props) {
  const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState<CropInsets>(EMPTY_CROP);
  const [autoCrop, setAutoCrop] = useState<CropInsets>(EMPTY_CROP);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void detectContentCrop(file)
      .then((detected) => {
        if (cancelled) return;
        setAutoCrop(detected);
        setCrop(detected);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("자동 여백 감지를 완료하지 못했습니다. 직접 영역을 조절해 주세요.");
      })
      .finally(() => {
        if (!cancelled) setIsPreparing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);

  const visibleWidth = 100 - crop.left - crop.right;
  const visibleHeight = 100 - crop.top - crop.bottom;
  const isValid = visibleWidth >= 10 && visibleHeight >= 10;
  const sliders = useMemo(
    () => [
      { key: "top" as const, label: "위쪽 자르기", max: 45 },
      { key: "bottom" as const, label: "아래쪽 자르기", max: 75 },
      { key: "left" as const, label: "왼쪽 자르기", max: 40 },
      { key: "right" as const, label: "오른쪽 자르기", max: 40 },
    ],
    []
  );

  const confirm = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await onConfirm(await cropFile(file, crop));
    } catch {
      setErrorMessage("사진을 자르지 못했습니다. 영역을 확인한 뒤 다시 시도해 주세요.");
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border-2 border-violet-300 bg-white p-3">
      <div className="text-sm font-black text-violet-800">문제 사진 영역 확인</div>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
        문제 번호·자료·질문까지만 남겨 주세요. 글자로 된 ①~⑤ 선택지는 사진에서 제외하고 아래 선택지 입력란에 적습니다.
      </p>
      <p className="mt-1 text-xs font-black text-amber-700">
        선택지 자체가 그림인 문항만 그림 선택지까지 사진에 남깁니다.
      </p>

      <div className="mt-3 flex justify-center rounded-xl bg-slate-100">
        <div className="relative inline-block max-w-full overflow-hidden rounded-xl">
          {sourceUrl && (
            <img src={sourceUrl} alt="자를 문제 사진" className="block max-h-[440px] w-auto max-w-full object-contain" />
          )}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-0 w-full bg-slate-950/55" style={{ height: `${crop.top}%` }} />
            <div className="absolute bottom-0 left-0 w-full bg-slate-950/55" style={{ height: `${crop.bottom}%` }} />
            <div className="absolute left-0 bg-slate-950/55" style={{ top: `${crop.top}%`, bottom: `${crop.bottom}%`, width: `${crop.left}%` }} />
            <div className="absolute right-0 bg-slate-950/55" style={{ top: `${crop.top}%`, bottom: `${crop.bottom}%`, width: `${crop.right}%` }} />
            <div className="absolute border-2 border-violet-500" style={{ top: `${crop.top}%`, left: `${crop.left}%`, width: `${visibleWidth}%`, height: `${visibleHeight}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {sliders.map(({ key, label, max }) => (
          <label key={key} className="rounded-xl bg-slate-50 p-2 text-xs font-black text-slate-700">
            <span className="flex items-center justify-between gap-2"><span>{label}</span><span>{crop[key]}%</span></span>
            <input
              type="range"
              min="0"
              max={max}
              step="0.5"
              value={crop[key]}
              disabled={isPreparing || isSaving}
              onChange={(event) => setCrop((current) => ({ ...current, [key]: Number(event.target.value) }))}
              className="mt-2 w-full accent-violet-600"
            />
          </label>
        ))}
      </div>

      {!isValid && <p className="mt-2 text-xs font-black text-red-600">남기는 영역이 너무 작습니다.</p>}
      {errorMessage && <p className="mt-2 text-xs font-black text-red-600">{errorMessage}</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <button type="button" disabled={isPreparing || isSaving} onClick={() => setCrop(autoCrop)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">흰 여백 자동 제거</button>
        <button type="button" disabled={isPreparing || isSaving} onClick={() => setCrop(EMPTY_CROP)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">전체 이미지</button>
        <button type="button" disabled={isSaving} onClick={onCancel} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40">취소</button>
        <button type="button" disabled={!isValid || isPreparing || isSaving} onClick={() => void confirm()} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">{isSaving ? "사진 처리 중..." : "이 영역으로 사진 사용"}</button>
      </div>
    </div>
  );
}
