// QR images supplied by the teacher. Keys are the existing school slugs.
// Keep the source image unchanged so previously shared QR codes remain identical.
export const SCHOOL_QR_CODES: Record<string, { imageSrc: string; encodedUrl: string }> = {
  dongguro: {
    imageSrc: "/images/school-qr/dongguro.jpg",
    // Verified redirect: https://sunlab.me.kr/student/classroom/dongguro
    encodedUrl: "https://m.site.naver.com/2iKVN",
  },
};
