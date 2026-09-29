This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ATC 참여확인서 Gmail 발송 설정

ATC 발송은 기존 Google Calendar/Drive 연동과 동일한 OAuth 웹 클라이언트
(`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`) 및 등록된
`https://sunlab.me.kr/api/teacher/google-calendar/callback` 리디렉션을 사용합니다.
Google Cloud 프로젝트에서 Gmail API를 사용 설정하고 OAuth 동의 화면에
`https://www.googleapis.com/auth/gmail.send` 권한을 추가하세요.
계정 확인용으로 `openid email`도 요청하며 Gmail 권한은 보내기만 요청합니다.

Vercel Production 환경변수 `ATC_GMAIL_TOKEN_ENCRYPTION_KEY`에 `openssl rand -base64 32`로
생성한 값을 설정하고 재배포하세요. 값을 GitHub나 채팅에 공유하지 마세요.
이 키를 바꾸면 기존 Gmail 연결을 해독할 수 없어 계정을 다시 연결해야 합니다.
기존 Google OAuth 클라이언트 환경변수도 Production에 있어야 합니다.

교사로 로그인하여 ATC 참여확인서 화면에서 **Gmail 계정 연결**을 누르고,
Google 인증 화면에서 `lifedr.sun@gmail.com`을 선택해 승인합니다. 다른 계정은
서버에서 거부합니다. 서버는 갱신 토큰을 AES-256-GCM으로 암호화해 Firestore에
보관하며 브라우저에는 연결 상태만 반환합니다. 재연결 전까지 매번 로그인하지
않아도 서버에서 액세스 토큰을 갱신합니다. OAuth 동의 화면이 Testing 상태면
Gmail 권한의 갱신 토큰이 7일 뒤 만료될 수 있으므로, 장기 사용 전 Google의
게시 및 검증 요건을 확인하세요.

**메일로 제출**은 저장된 서명·서명일로 기존 PDF 렌더러를 사용합니다.
미리보기에서 PDF와 From/To/BCC/제목/본문/파일명을 확인한 다음 **메일 발송**을
눌러야 Gmail API를 호출합니다. Gmail의 message ID가 반환된 경우에만 제출완료와
발송 이력을 기록합니다. API 응답을 받지 못한 경우 중복 발송을 막기 위해
발송 상태를 `unknown`으로 두고 Gmail 보낸편지함을 확인하도록 안내합니다.
