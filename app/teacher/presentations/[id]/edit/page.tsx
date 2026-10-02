"use client";

import { useParams } from "next/navigation";
import EditPresentationForm from "../../EditPresentationForm";

export default function EditTeacherPresentationPage() {
  const { id } = useParams<{ id: string }>();
  return <EditPresentationForm presentationId={id} />;
}
