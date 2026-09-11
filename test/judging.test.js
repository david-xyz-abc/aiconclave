import { judgingFixture } from "./judgingFixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { context } from "./venueFixture.js";
import {
  onRequestGet,
  onRequestPost,
  loadWorkspace,
} from "../judging/functions/api/workspace.js";
import {
  previewAssignment,
  suggestStart,
  judgeRoute,
} from "../judging/shared/assignments.js";
const filters = {
  solution_type: "Technical",
  sector: "Agriculture",
  mode: "Prepared",
};
async function post(f, body) {
  const response = await onRequestPost(
    context(f.DB, { revision: (await loadWorkspace(f.DB)).revision, ...body }),
  );
  return { status: response.status, ...(await response.json()) };
}
async function add(f, name = "Judge One", side = "Technical") {
  assert.equal(
    (await post(f, { action: "saveJudge", name, solutionType: side })).status,
    200,
  );
  return (await loadWorkspace(f.DB)).judges.find((j) => j.name === name).id;
}

test("judging prefers a single room, allows forward spillover, and saves one judge per team", async () => {
  const f = judgingFixture(),
    id = await add(f);
  let d = await loadWorkspace(f.DB);
  assert.equal(suggestStart(d, id, filters, 4), 1);
  assert.equal(
    new Set(previewAssignment(d, id, filters, 1, 5).teams.map((t) => t.room_id))
      .size,
    2,
  );
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: id,
        filters,
        startTeamId: 1,
        count: 5,
      })
    ).status,
    200,
  );
  d = await loadWorkspace(f.DB);
  assert.equal(d.assignments.length, 5);
  assert.equal(judgeRoute(d, d.judges[0]).needsReview, false);
  const other = await add(f, "Judge Two");
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: other,
        filters,
        startTeamId: 4,
        count: 3,
      })
    ).status,
    400,
  );
  assert.equal((await loadWorkspace(f.DB)).assignments.length, 5);
});
test("concurrent staff claims: one entire range succeeds and the other is rejected", async () => {
  const f = judgingFixture(),
    first = await add(f),
    second = await add(f, "Judge Two");
  const revision = (await loadWorkspace(f.DB)).revision;
  const results = await Promise.all(
    [first, second].map((judgeId) =>
      onRequestPost(
        context(f.DB, {
          action: "assign",
          revision,
          judgeId,
          filters,
          startTeamId: 1,
          count: 5,
        }),
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await loadWorkspace(f.DB)).assignments.length, 5);
  assert.equal(
    f.sqlite
      .prepare(
        "SELECT COUNT(*) AS n FROM judging_changes WHERE action='assign'",
      )
      .get().n,
    1,
  );
});
test("stale attendance preview cannot save; seating move flags existing judge route", async () => {
  const f = judgingFixture(),
    id = await add(f);
  const old = (await loadWorkspace(f.DB)).revision;
  f.sqlite.exec(
    "UPDATE venue_allocations SET assigned_by='another desk' WHERE team_id=1",
  );
  assert.equal(
    (
      await onRequestPost(
        context(f.DB, {
          revision: old,
          action: "assign",
          judgeId: id,
          filters,
          startTeamId: 1,
          count: 3,
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: id,
        filters,
        startTeamId: 1,
        count: 3,
      })
    ).status,
    200,
  );
  f.sqlite.exec("DELETE FROM venue_allocations WHERE team_id=2");
  const d = await loadWorkspace(f.DB);
  assert.equal(judgeRoute(d, d.judges[0]).needsReview, true);
});
test("reassignment is whole-route replacement; incompatible selection and backtracking room order are rejected", async () => {
  const f = judgingFixture(),
    id = await add(f);
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: id,
        filters,
        startTeamId: 1,
        count: 5,
      })
    ).status,
    200,
  );
  let d = await loadWorkspace(f.DB);
  assert.equal(
    (
      await post(f, {
        action: "roomOrder",
        roomIds: d.rooms.map((r) => r.id).reverse(),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: id,
        filters: { ...filters, solution_type: "Non-Technical" },
        startTeamId: 1,
        count: 2,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post(f, {
        action: "assign",
        judgeId: id,
        filters,
        startTeamId: 5,
        count: 3,
      })
    ).status,
    200,
  );
  d = await loadWorkspace(f.DB);
  assert.deepEqual(
    d.assignments.map((a) => a.team_id),
    [5, 6, 7],
  );
  assert.equal(
    (await post(f, { action: "deleteJudge", judgeId: id })).status,
    400,
  );
  assert.equal((await post(f, { action: "release", judgeId: id })).status, 200);
  assert.equal(
    (await post(f, { action: "deleteJudge", judgeId: id })).status,
    200,
  );
});
test("authorization, origin, range and room-order validation protect mutations", async () => {
  const f = judgingFixture("read");
  assert.equal((await onRequestGet(context(f.DB, null, "GET"))).status, 403);
  assert.equal((await onRequestPost(context(f.DB, {}))).status, 403);
  const w = judgingFixture(),
    id = await add(w);
  const ctx = context(w.DB, { revision: (await loadWorkspace(w.DB)).revision });
  ctx.request = new Request(ctx.request, {
    headers: {
      ...Object.fromEntries(ctx.request.headers),
      origin: "https://other.example",
    },
  });
  assert.equal((await onRequestPost(ctx)).status, 403);
  for (const count of [0, 1.5, 101])
    assert.equal(
      (
        await post(w, {
          action: "assign",
          judgeId: id,
          filters,
          startTeamId: 1,
          count,
        })
      ).status,
      400,
    );
  assert.equal(
    (await post(w, { action: "roomOrder", roomIds: [1, 1] })).status,
    400,
  );
  assert.equal(
    (
      await onRequestGet({
        env: { DB: w.DB },
        request: new Request("https://test.example"),
      })
    ).status,
    401,
  );
});
test("invalidated attendance eligibility is excluded and flags route review", async () => {
  const f = judgingFixture(),
    id = await add(f);
  await post(f, {
    action: "assign",
    judgeId: id,
    filters,
    startTeamId: 1,
    count: 3,
  });
  f.sqlite.exec("UPDATE hackathon_attendance SET present=0 WHERE member_id=11");
  let d = await loadWorkspace(f.DB);
  assert.equal(judgeRoute(d, d.judges[0]).needsReview, true);
  assert.match(previewAssignment(d, id, filters, 1, 2).error, /valid room/);
});
test("bulk roster entry is atomic and accepts independent judge sides", async () => {
  const f = judgingFixture();
  assert.equal(
    (
      await post(f, {
        action: "addJudges",
        names: ["Judge A", "Judge B"],
        solutionType: "Non-Technical",
      })
    ).status,
    200,
  );
  assert.equal((await loadWorkspace(f.DB)).judges.length, 2);
  assert.equal(
    (
      await post(f, {
        action: "addJudges",
        names: ["Duplicate", "duplicate"],
        solutionType: "Technical",
      })
    ).status,
    400,
  );
  assert.equal((await loadWorkspace(f.DB)).judges.length, 2);
});
test("sector and preparation filters exclude incompatible teams from ranges", async () => {
  const f = judgingFixture(),
    id = await add(f);
  f.sqlite.exec(
    "UPDATE hackathon_teams SET sector_track='Education' WHERE id=8; UPDATE venue_checkins SET project_mode='Starting from scratch' WHERE team_id=7;",
  );
  const d = await loadWorkspace(f.DB);
  const all = { solution_type: "Technical", sector: "", mode: "" };
  assert.equal(previewAssignment(d, id, all, 1, 8).teams.length, 8);
  assert.equal(previewAssignment(d, id, filters, 1, 6).teams.length, 6);
  assert.ok(previewAssignment(d, id, filters, 1, 7).error);
});
