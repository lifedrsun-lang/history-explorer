import ReviewQuestionBank from "./ReviewQuestionBank";
import { parseReviewCategory } from "@/lib/reviewCategories";
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { category: rawCategory } = await searchParams;
  const category = parseReviewCategory(rawCategory);
  return <ReviewQuestionBank key={category} category={category} />;
}
