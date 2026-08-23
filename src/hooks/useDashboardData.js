import { useCallback, useEffect, useState } from "react";
import { DIRECTORY_ROUTES } from "../config/dashboard.js";
import { isUnauthorized, registrationsApi } from "../services/dashboardApi.js";

const EMPTY_SUMMARY = {
  total: 0,
  panelTotal: 0,
  hackathonTotal: 0,
  students: 0,
};

export function useDashboardData(routeId, onUnauthorized) {
  const [directories, setDirectories] = useState({
    panel: null,
    hackathon: null,
  });
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const alreadyLoaded =
      routeId === "overview"
        ? overview !== null
        : DIRECTORY_ROUTES.has(routeId) && directories[routeId] !== null;
    if (
      alreadyLoaded ||
      (routeId !== "overview" && !DIRECTORY_ROUTES.has(routeId))
    ) {
      setLoading(false);
      setError("");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    const request =
      routeId === "overview"
        ? registrationsApi.summary()
        : registrationsApi.list(routeId);
    request
      .then((data) => {
        if (!active) return;
        if (routeId === "overview")
          setOverview({
            summary: data.summary || EMPTY_SUMMARY,
            recent: data.recent || [],
          });
        else
          setDirectories((current) => ({
            ...current,
            [routeId]: data.registrations || [],
          }));
      })
      .catch((loadError) => {
        if (!active) return;
        if (isUnauthorized(loadError)) onUnauthorized();
        else setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [directories, onUnauthorized, overview, routeId]);

  const removeRegistration = useCallback(
    async (registrationType, registration) => {
      await registrationsApi.remove(
        registrationType,
        registration.id,
        registration.record_type,
      );
      setDirectories((current) => ({
        ...current,
        [registrationType]: (current[registrationType] || []).filter(
          (item) => item.id !== registration.id,
        ),
      }));
      setOverview(null);
    },
    [],
  );

  return {
    registrations: directories[routeId] || [],
    summary: overview?.summary || EMPTY_SUMMARY,
    recent: overview?.recent || [],
    loading,
    error,
    setError,
    removeRegistration,
  };
}
