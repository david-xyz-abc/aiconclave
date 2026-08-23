export const REGISTRATION_SECTIONS = [
  {
    id: "panel",
    path: "/panel-registrations",
    number: "01",
    label: "Panel Discussion",
    status: "Live",
  },
  {
    id: "hackathon",
    path: "/hackathon-registrations",
    number: "02",
    label: "Hackathon",
    status: "Live",
  },
  {
    id: "workshops",
    path: "/workshop-registrations",
    number: "03",
    label: "Workshops",
    status: "Awaiting list",
  },
];

export const DASHBOARD_NAVIGATION = [
  {
    id: "overview",
    path: "/",
    number: "00",
    label: "Overview",
    status: "Dashboard",
  },
  ...REGISTRATION_SECTIONS,
];

export const DIRECTORY_ROUTES = new Set(["panel", "hackathon"]);

export function getDashboardRoute(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    DASHBOARD_NAVIGATION.find((item) => item.path === path) ||
    DASHBOARD_NAVIGATION[0]
  );
}
