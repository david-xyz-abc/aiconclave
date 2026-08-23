import { useCallback, useEffect, useState } from "react";
import { getDashboardRoute } from "../config/dashboard.js";

export function useDashboardRoute() {
  const [route, setRoute] = useState(getDashboardRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(getDashboardRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const title =
      route.id === "overview" ? "Registration Overview" : route.label;
    document.title = `${title} — AI Conclave Dashboard`;
  }, [route]);

  const navigate = useCallback((path) => {
    if (path !== window.location.pathname)
      window.history.pushState({}, "", path);
    setRoute(getDashboardRoute(path));
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { route, navigate };
}
