export const TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT =
  "teacher-dashboard-summary-refresh";

export const requestTeacherDashboardSummaryRefresh = () => {
  window.dispatchEvent(
    new Event(TEACHER_DASHBOARD_SUMMARY_REFRESH_EVENT)
  );
};

