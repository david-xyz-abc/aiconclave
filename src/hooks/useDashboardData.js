import { useCallback, useEffect, useRef, useState } from "react";
import { isUnauthorized, registrationsApi } from "../services/dashboardApi.js";

const CACHE_KEY = 'production-admin-directory-v3';
const EMPTY_SUMMARY = { total: 0, panelTotal: 0, hackathonTotal: 0, students: 0 };
function readCache(owner) {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (value?.owner === owner && value.entries && typeof value.entries === 'object') return value.entries;
  } catch { /* Storage unavailable or corrupt. */ }
  return {};
}
export function clearAdminCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* Storage unavailable. */ }
}
export function useDashboardData(routeId, onUnauthorized, owner) {
  const [entries, setEntries] = useState(() => readCache(owner));
  const [loadingRoutes, setLoadingRoutes] = useState({});
  const [errors, setErrors] = useState({});
  const pending = useRef(new Set());
  const opened = useRef(new Set());
  const overviewRevision = useRef(0);
  const mounted = useRef(true);
  const nextRefreshAt = useRef(0);
  const cooldownTimer = useRef(null);
  const [coolingDown, setCoolingDown] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(cooldownTimer.current); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ owner, entries })); } catch { /* Storage full or unavailable. */ }
  }, [entries, owner]);

  const loadRoute = useCallback(async (id) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    const revision = overviewRevision.current;
    setLoadingRoutes(current => ({ ...current, [id]: true }));
    setErrors(current => ({ ...current, [id]: '' }));
    try {
      const data = id === 'overview' ? await registrationsApi.summary()
        : ['checked-in','judges-allocation'].includes(id) ? await registrationsApi.report(id)
        : await registrationsApi.list(id);
      if (!mounted.current) return;
      setEntries(current => ({ ...current, [id]: { ...data, syncedAt: new Date().toISOString(),
        stale: id === 'overview' && revision !== overviewRevision.current } }));
    } catch (err) {
      if (!mounted.current) return;
      if (isUnauthorized(err)) { clearAdminCache(); onUnauthorized(); }
      else setErrors(current => ({ ...current, [id]: err.message }));
    } finally {
      pending.current.delete(id);
      if (mounted.current) setLoadingRoutes(current => ({ ...current, [id]: false }));
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (!['overview', 'panel', 'hackathon', 'checked-in', 'judges-allocation'].includes(routeId) || opened.current.has(routeId)) return;
    opened.current.add(routeId);
    void loadRoute(routeId);
  }, [routeId, loadRoute]);

  const refresh = useCallback(() => {
    if (pending.current.has(routeId) || Date.now() < nextRefreshAt.current) return;
    nextRefreshAt.current = Date.now() + 5000;
    setCoolingDown(true);
    clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setCoolingDown(false), 5000);
    return loadRoute(routeId);
  }, [routeId, loadRoute]);
  const loading = Boolean(loadingRoutes[routeId]);
  const error = errors[routeId] || '';
  const setError = useCallback(value => setErrors(current => ({ ...current, [routeId]: value })), [routeId]);

  const removeRegistration = useCallback(async (type, registration) => {
    await registrationsApi.remove(type, registration.id, registration.record_type);
    overviewRevision.current += 1;
    setEntries(current => ({ ...current, overview: { ...current.overview, stale: true }, [type]: {
      ...current[type], registrations: (current[type]?.registrations || []).filter(item =>
        !(item.id === registration.id && item.record_type === registration.record_type)),
    } }));
  }, []);
  const updateRegistration = useCallback(async (type, registration, payload) => {
    const { registration: updated } = await registrationsApi.update(type, registration.id, registration.record_type, payload);
    // Keep only directory fields in persistent storage, never the full roster.
    overviewRevision.current += 1;
    setEntries(current => ({ ...current, overview: { ...current.overview, stale: true }, [type]: {
      ...current[type], registrations: (current[type]?.registrations || []).map(item => {
        if (item.id !== registration.id || item.record_type !== registration.record_type) return item;
        const compact = Object.fromEntries(Object.keys(item).map(key => [key, updated[key] ?? item[key]]));
        if (type === 'hackathon' && updated.members) compact.captain_name =
          (updated.members.find(member => member.role === 'Captain') || updated.members[0])?.full_name || '';
        return compact;
      }),
    } }));
    return updated;
  }, []);
  const entry = entries[routeId];
  return { registrations: Array.isArray(entry?.registrations) ? entry.registrations : [],
    overviewStale: Boolean(entries.overview?.stale),
    summary: entries.overview?.summary || EMPTY_SUMMARY, recent: entries.overview?.recent || [],
    rows: Array.isArray(entry?.rows) ? entry.rows : [],
    syncedAt: entry?.syncedAt, coolingDown, loading, error, setError, refresh, removeRegistration, updateRegistration };
}
