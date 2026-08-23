import { useMemo } from "react";
import { MetricCard } from "../../components/common/MetricCard.jsx";

export function HackathonMetrics({ registrations }) {
  const metrics = useMemo(
    () =>
      registrations.reduce(
        (summary, registration) => {
          const isTeam = registration.record_type === "team";
          summary.teams += isTeam ? 1 : 0;
          summary.students += isTeam
            ? registration.members?.length ||
              Number(registration.team_size) ||
              0
            : 1;
          if (registration.participant_category === "School")
            summary.school += 1;
          if (registration.participant_category === "College")
            summary.college += 1;
          return summary;
        },
        { teams: 0, students: 0, school: 0, college: 0 },
      ),
    [registrations],
  );

  return (
    <section
      className="metrics-grid hackathon-metrics"
      aria-label="Hackathon registration summary"
    >
      <MetricCard
        label="Registered teams"
        value={metrics.teams}
        detail="Submitted entries"
      />
      <MetricCard
        label="Students"
        value={metrics.students}
        detail="Across all teams"
      />
      <MetricCard
        label="School teams"
        value={metrics.school}
        detail="School category"
      />
      <MetricCard
        label="College teams"
        value={metrics.college}
        detail="College category"
      />
    </section>
  );
}
