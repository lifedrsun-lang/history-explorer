import SchoolCalendarColorEnhancer from "./SchoolCalendarColorEnhancer";

export default function TeacherScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SchoolCalendarColorEnhancer />
    </>
  );
}
