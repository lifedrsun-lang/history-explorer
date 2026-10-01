export const atcPrintCss = `/* ATC 참여확인서는 원본 양식의 색감과 인쇄 구조를 최대한 유지한다. */
.atc-print-sheet {
  position: relative;
  color: #111827;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.atc-print-sheet .atc-print-logo {
  width: 51.87mm;
  height: 13.29mm;
  max-width: 51.87mm;
  max-height: 13.29mm;
  object-fit: contain;
  object-position: right center;
}

.atc-print-sheet .class4edu-print-logo {
  width: 56mm;
  height: auto;
  max-width: 56mm;
  max-height: 19.6mm;
}

.atc-print-sheet.class4edu-print-sheet .atc-logo-row {
  min-height: 19.6mm;
  margin-bottom: 3mm;
}

.atc-print-sheet .atc-logo-row {
  display: flex;
  min-height: 13.29mm;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 5mm;
}

.atc-print-sheet h2 {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 34px;
  padding: 7px 0 8px 34px;
  border-top: 1px solid #86a9c8;
  border-right: 0;
  border-bottom: 3px solid #86a9c8;
  border-left: 0;
  line-height: 1.25;
  text-align: left;
}

.atc-print-sheet .atc-title {
  font-family: "HYHeadLineM", "HY헤드라인M", "Malgun Gothic", sans-serif;
  font-size: 16pt;
  font-weight: 700 !important;
}

.atc-print-sheet.class4edu-print-sheet .atc-title {
  font-size: 14.5pt;
}

.atc-print-sheet h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 24px;
  height: 24px;
  transform: translateY(-58%);
  border: 1px solid #4b5563;
  background: #f3dc78;
}

.atc-print-sheet .atc-form-table th,
.atc-print-sheet .atc-form-table td {
  border-color: #334155 !important;
  font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
  font-size: 10pt;
  text-align: center;
}

.atc-print-sheet .atc-form-table th {
  background: #dbe8f3 !important;
  color: #111827;
  font-weight: 700;
}

.atc-print-sheet .atc-form-table thead th {
  background: #c9ddec !important;
}

.atc-print-sheet .atc-summary-table td {
  font-weight: 700;
}

.atc-print-sheet .atc-lesson-table tbody td {
  font-weight: 400;
}

.atc-print-sheet .atc-lesson-table .atc-remarks-cell {
  text-align: left;
}

.atc-print-sheet .atc-lesson-table .atc-example-row td {
  color: rgb(128, 128, 128);
  font-style: italic;
  font-weight: 400;
}

.atc-print-sheet .atc-lesson-table .atc-total-row td {
  background: #f8fafc;
  font-weight: 400;
}

.atc-print-sheet .atc-lesson-table .atc-total-row td.font-bold {
  font-weight: 700;
}

.atc-print-sheet .atc-attendance-note {
  font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
  font-size: 10pt;
  font-weight: 700;
}

.atc-print-sheet .atc-footer-statement,
.atc-print-sheet .atc-footer-date,
.atc-print-sheet .atc-footer-signature {
  font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
  font-size: 13pt;
  font-weight: 400;
}

.atc-print-sheet .atc-educator-name {
  font-weight: 700;
}

/* 확인자 행은 서명이 길어져도 셀 밖으로 밀리지 않도록 고정 그리드로 배치한다. */
.atc-print-sheet .atc-verifier-row {
  display: grid !important;
  grid-template-columns: 40.5% minmax(0, 1fr) 82px;
  align-items: center;
  gap: 4px !important;
  width: 100%;
  min-height: 54px;
  overflow: hidden;
}

.atc-print-sheet .atc-verifier-row > span {
  min-width: 0;
  line-height: 1.3;
}

.atc-print-sheet .atc-verifier-affiliation {
  padding-left: 8px;
  text-align: left;
}

.atc-signature-slot {
  position: relative;
  display: inline-flex;
  width: 82px;
  height: 46px;
  max-width: 82px;
  max-height: 46px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  line-height: 1;
  flex: 0 0 82px;
}

.atc-signature-button {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.atc-signature-slot > span {
  color: #334155;
  white-space: nowrap;
}

.atc-signature-slot .atc-signature-img {
  position: absolute;
  inset: 1px;
  width: calc(100% - 2px) !important;
  height: calc(100% - 2px) !important;
  max-width: 80px !important;
  max-height: 44px !important;
  object-fit: contain !important;
  object-position: center;
  filter: contrast(1.8);
  opacity: 1;
}

.atc-signature-preview {
  filter: contrast(1.8);
  opacity: 1;
}

/* 하단 날짜와 에듀케이터 성명은 원본 양식처럼 오른쪽에 정렬한다. */
.atc-print-sheet .atc-footer-date {
  text-align: right;
}

.atc-print-sheet .atc-footer-signature {
  display: grid !important;
  grid-template-columns: auto 92px 82px;
  align-items: center;
  justify-content: end;
  gap: 5px !important;
  width: 100%;
  overflow: hidden;
  text-align: right;
}

.atc-print-sheet .atc-footer-signature > span,
.atc-print-sheet .atc-footer-signature > img {
  min-width: 0;
}

@media print {
  .atc-print-sheet,
  .atc-print-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .atc-print-sheet h2::before,
  .atc-print-sheet .atc-print-logo,
  .atc-print-sheet .atc-form-table th,
  .atc-print-sheet .atc-form-table thead th {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}


        .atc-print-sheet { font-family: Arial, "Noto Sans KR", sans-serif; }
        .atc-form-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .atc-form-table th, .atc-form-table td { border: 1px solid #111827; padding: 5px 6px; vertical-align: middle; }
        .atc-signature-img { object-fit: contain; mix-blend-mode: multiply; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .atc-print-sheet, .atc-print-sheet * { visibility: visible !important; }
          .atc-print-sheet { position: absolute !important; left: 0; top: 0; display: flex !important; flex-direction: column !important; width: 194mm !important; height: 281mm !important; box-sizing: border-box !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .no-print { display: none !important; }
          .atc-logo-row { margin-bottom: 3mm !important; }
          .atc-title { min-height: 8mm !important; padding-top: 1.5mm !important; padding-bottom: 1.5mm !important; }
          .atc-summary-table { margin-top: 3mm !important; }
          .atc-lesson-table { margin-top: 3mm !important; }
          .atc-form-table th, .atc-form-table td { padding: 1mm 1.4mm !important; font-size: 10pt !important; line-height: 1.15 !important; }
          .atc-lesson-table tr { height: 5.6mm !important; }
          .atc-lesson-table thead tr { height: 6.2mm !important; }
          .atc-lesson-table th, .atc-lesson-table td { height: 5.6mm !important; padding-top: 0.55mm !important; padding-bottom: 0.55mm !important; }
          .atc-lesson-table .atc-total-row { height: 7.4mm !important; }
          .atc-lesson-table .atc-total-row td { height: 7.4mm !important; padding-top: 1mm !important; padding-bottom: 1mm !important; }
          .atc-verifier-row { min-height: 11mm !important; }
          .atc-attendance-note { margin-top: 3mm !important; }
          .atc-footer-block { margin-top: auto !important; padding-bottom: 3mm !important; }
          .atc-footer-statement { margin-top: 0 !important; }
          .atc-footer-date { margin-top: 5mm !important; }
          .atc-footer-signature { margin-top: 5mm !important; }
        }
      

@font-face { font-family: AtcNoto; src: url('/fonts/noto-sans-kr-400.woff2') format('woff2'); font-weight: 400; }
@font-face { font-family: AtcNoto; src: url('/fonts/noto-sans-kr-700.woff2') format('woff2'); font-weight: 700; }
.atc-print-sheet, .atc-print-sheet * { font-family: AtcNoto, sans-serif !important; }
.atc-print-sheet { box-sizing: border-box; width: 194mm; min-height: 281mm; }
.atc-print-sheet .font-bold { font-weight: 700; }
.atc-print-sheet .text-center { text-align: center; }
.atc-print-sheet .border-b { border-bottom: 1px solid #64748b; }
.atc-print-sheet .atc-lesson-table tr { height: 5.6mm; }
.atc-print-sheet .atc-lesson-table .atc-total-row { height: 7.4mm; }
@media print { .atc-print-sheet { max-width: 194mm; } }
`;
