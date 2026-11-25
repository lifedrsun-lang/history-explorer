import Link from "next/link";

export type TravelCard = { title: string; description: string; emoji: string; style: string; href?: string };
export const timelineCards: TravelCard[] = [
  { title: "별꼼역사 연표", description: "교재 중심 한국사 학습과 복습", emoji: "📗", style: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  { title: "통합한국사 연표", description: "기존 전체 한국사 연표와 추가 학습 자료", emoji: "📚", style: "border-blue-200 bg-blue-50 text-blue-950" },
  { title: "공개 관리 설정", description: "학생별 연표 공개 및 교재 호수 열람 권한", emoji: "🔐", style: "border-amber-200 bg-amber-50 text-amber-950" },
  { title: "자료 열람 설정", description: "연표별 추가 학습 자료의 열람 권한 관리", emoji: "⚙️", style: "border-violet-200 bg-violet-50 text-violet-950" },
];

export default function TravelCards({ cards }: { cards: TravelCard[] }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {cards.map(card => {
      const content = <>
        <span aria-hidden="true" className="text-4xl">{card.emoji}</span>
        <h2 className="mt-3 text-xl font-black">{card.title}</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed opacity-80">{card.description}</p>
        {!card.href && <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold">준비 중</span>}
      </>;
      const className = "block min-h-40 rounded-3xl border p-5 shadow-sm " + card.style;
      return card.href ? <Link key={card.title} href={card.href} className={className + " transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"}>{content}</Link>
        : <article key={card.title} aria-disabled="true" className={className}>{content}</article>;
    })}
  </div>;
}
