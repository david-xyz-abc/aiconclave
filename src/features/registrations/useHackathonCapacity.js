// Registration is uncapped. Form availability must not depend on a capacity request.
const availability = Object.freeze({ status: 'ready', open: true, collegeOpen: true, schoolOpen: true, unlimited: true, limit: null, remaining: Infinity })
const retry = () => {}
export function useHackathonCapacity() {
  return [availability, retry]
}
