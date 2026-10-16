// QR images supplied by the teacher. Keys are the existing school slugs.
// Keep the source image unchanged so previously shared QR codes remain identical.
export type SchoolQrCode = { imageSrc: string; encodedUrl: string; filename?: string };

export const SCHOOL_QR_CODES: Record<string, SchoolQrCode> = {
  dongguro: {
    imageSrc: "/images/school-qr/dongguro.jpg",
    // Verified redirect: https://sunlab.me.kr/student/classroom/dongguro
    encodedUrl: "https://m.site.naver.com/2iKVN",
  },
};
