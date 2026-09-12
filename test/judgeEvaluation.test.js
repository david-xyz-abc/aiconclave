import test from "node:test";
import assert from "node:assert/strict";
import { judgingFixture, judgingContext } from "./judgingFixture.js";
import {
  onRequestPost as workspacePost,
  loadWorkspace,
} from "../judging/functions/api/workspace.js";
import { onRequestPost as accountPost } from "../judging/functions/api/judge-accounts.js";
import { onRequest as authRequest } from "../judging/functions/api/auth.js";
import {
  onRequestGet as getEvaluation,
  onRequestPost as postEvaluation,
} from "../judging/functions/api/evaluations.js";
import {
  onRequestGet as emergencyGet,
  onRequestPost as emergencyPost,
} from "../judging/functions/api/emergency.js";
import { AWARDS } from "../judging/shared/evaluation.js";
const fullScores = {
  impact: 5,
  creativity: 4,
  validity: 3,
  relevance: 2,
  presentation: 1,
};
function judgeContext(DB, cookie, body, method = "POST") {
  return {
    env: { DB },
    request: new Request("https://test.example/api/evaluations", {
      method,
      headers: {
        origin: "https://test.example",
        "content-type": "application/json",
        cookie,
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
  };
}
async function setup() {
  const f = judgingFixture();
  const post = async (body) =>
    workspacePost(
      judgingContext(f.DB, {
        revision: (await loadWorkspace(f.DB)).revision,
        ...body,
      }),
    );
  assert.equal(
    (
      await post({
        action: "saveJudge",
        name: "Judge One",
        solutionType: "Technical",
      })
    ).status,
    200,
  );
  const judge = (await loadWorkspace(f.DB)).judges[0];
  assert.equal(
    (
      await post({
        action: "assign",
        judgeId: judge.id,
        filters: {
          solution_type: "Technical",
          sector: "Agriculture",
          mode: "Prepared",
        },
        startTeamId: 1,
        count: 3,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await accountPost(
        judgingContext(f.DB, {
          revision: (await loadWorkspace(f.DB)).revision,
          judgeId: judge.id,
          username: "judge-one",
          password: "fixture-pass",
        }),
      )
    ).status,
    200,
  );
  const login = await authRequest(
    judgeContext(f.DB, "", {
      username: "judge-one",
      password: "fixture-pass",
      role: "judge",
    }),
  );
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const evaluate = async (body) => {
    const r = await postEvaluation(
      judgeContext(f.DB, cookie, { teamId: 1, ...body }),
    );
    return { status: r.status, ...(await r.json()) };
  };
  return { ...f, judge, cookie, evaluate, post };
}
test("judge sees only assigned teams with leader names; drafts survive reload and submit locks the whole form", async () => {
  const f = await setup();
  let r = await getEvaluation(judgeContext(f.DB, f.cookie, null, "GET"));
  let d = await r.json();
  assert.equal(d.teams.length, 3);
  assert.equal(d.teams[0].leader_name, "Captain");
  assert.equal(
    (await f.evaluate({ action: "submit", revision: 0 })).status,
    400,
  );
  r = await f.evaluate({
    action: "nominations",
    revision: 0,
    nominations: ["agri-impact"],
  });
  assert.equal(r.status, 200);
  r = await f.evaluate({ action: "scores", revision: 1, scores: fullScores });
  assert.equal(r.status, 200);
  d = await (
    await getEvaluation(judgeContext(f.DB, f.cookie, null, "GET"))
  ).json();
  assert.deepEqual(d.evaluations[0].scores, fullScores);
  r = await f.evaluate({
    action: "submit",
    revision: 2,
    scores: { impact: 0 },
  });
  assert.equal(r.status, 200);
  assert.equal(r.evaluation.status, "submitted");
  assert.deepEqual(r.evaluation.scores, fullScores);
  for (const action of ["nominations", "scores", "submit"])
    assert.equal(
      (
        await f.evaluate({
          action,
          revision: 3,
          nominations: [],
          scores: fullScores,
        })
      ).status,
      409,
    );
  assert.equal(
    (await f.post({ action: "release", judgeId: f.judge.id })).status,
    409,
  );
  assert.equal(
    f.sqlite
      .prepare("SELECT COUNT(*) AS n FROM judging_evaluation_history")
      .get().n,
    3,
  );
});
test("only venue admins can reopen; previous submission stays audited and judge must resubmit", async () => {
  const f = await setup();
  await f.evaluate({ action: "nominations", revision: 0, nominations: ["none-of-the-above"] });
  await f.evaluate({ action: "scores", revision: 1, scores: fullScores });
  await f.evaluate({ action: "submit", revision: 2 });
  const body = {
    teamId: 1,
    revision: (await loadWorkspace(f.DB)).revision,
    evaluationRevision: 3,
    reason: "Correction requested at the venue desk",
  };
  assert.equal(
    (await emergencyPost(judgeContext(f.DB, f.cookie, body))).status,
    403,
  );
  assert.equal(
    (await emergencyPost(judgingContext(f.DB, { ...body, reason: "" }))).status,
    400,
  );
  assert.equal((await emergencyPost(judgingContext(f.DB, body))).status, 200);
  const history = f.sqlite
    .prepare("SELECT * FROM judging_evaluation_history WHERE action='reopen'")
    .get();
  assert.equal(JSON.parse(history.previous_snapshot).status, "submitted");
  assert.deepEqual(JSON.parse(history.previous_snapshot).scores, fullScores);
  assert.equal(history.actor, "staff");
  assert.equal(history.reason, body.reason);
  assert.equal(
    (await f.evaluate({ action: "scores", revision: 3, scores: fullScores }))
      .status,
    409,
  );
  assert.equal(
    (
      await f.evaluate({
        action: "scores",
        revision: 4,
        scores: {
          impact: 0,
          creativity: 0,
          validity: 0,
          relevance: 0,
          presentation: 0,
        },
      })
    ).status,
    200,
  );
  assert.equal(
    (await f.evaluate({ action: "submit", revision: 5 })).status,
    200,
  );
  assert.equal(
    f.sqlite
      .prepare(
        "SELECT COUNT(*) AS n FROM judging_evaluation_history WHERE action='submit'",
      )
      .get().n,
    2,
  );
});
test("unassigned teams, bad marks, sector nominations, missing scores and other roles are rejected", async () => {
  const f = await setup();
  assert.equal(
    (
      await f.evaluate({
        teamId: 8,
        action: "nominations",
        revision: 0,
        nominations: [],
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await postEvaluation(
        judgingContext(f.DB, { teamId: 1, action: "submit", revision: 0 }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await getEvaluation(judgeContext(f.DB, "", null, "GET"))).status,
    401,
  );
  assert.equal(
    (
      await f.evaluate({
        action: "nominations",
        revision: 0,
        nominations: ["health-impact"],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.evaluate({
        action: "nominations",
        revision: 0,
        nominations: ["agri-impact", "agri-impact"],
      })
    ).status,
    400,
  );
  await f.evaluate({ action: "nominations", revision: 0, nominations: ["none-of-the-above"] });
  for (const scores of [
    { impact: 6 },
    { impact: -1 },
    { impact: 2.5 },
    { impact: "5" },
    { impact: null },
    { other: 5 },
    [],
  ])
    assert.equal(
      (await f.evaluate({ action: "scores", revision: 1, scores })).status,
      400,
    );
  assert.equal(
    (await f.evaluate({ action: "scores", revision: 1, scores: { impact: 0 } }))
      .status,
    200,
  );
  assert.equal(
    (await f.evaluate({ action: "submit", revision: 2 })).status,
    400,
  );
  assert.equal(
    (await emergencyGet(judgeContext(f.DB, f.cookie, null, "GET"))).status,
    403,
  );
});
test("simultaneous submissions and stale score saves cannot overwrite a submitted result", async () => {
  const f = await setup();
  await f.evaluate({ action: "nominations", revision: 0, nominations: ["none-of-the-above"] });
  await f.evaluate({ action: "scores", revision: 1, scores: fullScores });
  const results = await Promise.all([
    f.evaluate({ action: "submit", revision: 2 }),
    f.evaluate({ action: "scores", revision: 2, scores: { impact: 0 } }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    f.sqlite.prepare("SELECT status FROM judging_evaluations").get().status,
    "submitted",
  );
});
test("all sector award sets have six unique options and valid nominations persist", async () => {
  const f = await setup();
  for (const [sector, awards] of Object.entries(AWARDS)) {
    assert.equal(awards.length, 6);
    assert.equal(new Set(awards.map((a) => a[0])).size, 6);
    f.sqlite
      .prepare("UPDATE hackathon_teams SET sector_track=? WHERE id=1")
      .run(sector);
    f.sqlite
      .prepare("UPDATE judging_judges SET sector_filter=? WHERE id=?")
      .run("", f.judge.id);
    const revision =
      f.sqlite
        .prepare("SELECT revision FROM judging_evaluations WHERE team_id=1")
        .get()?.revision || 0;
    const r = await f.evaluate({
      action: "nominations",
      revision,
      nominations: [awards[0][0]],
    });
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.evaluation.nominations,
      [awards[0][0]],
    );
  }
});
test("credential reset revokes judge sessions and never records passwords in audit details", async () => {
  const f = await setup();
  const password = "another-fixture-pass";
  assert.equal(
    (
      await accountPost(
        judgingContext(f.DB, {
          judgeId: f.judge.id,
          revision: (await loadWorkspace(f.DB)).revision,
          username: "judge-one",
          password,
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await getEvaluation(judgeContext(f.DB, f.cookie, null, "GET"))).status,
    401,
  );
  assert.ok(
    !JSON.stringify(
      f.sqlite.prepare("SELECT * FROM judging_changes").all(),
    ).includes(password),
  );
});

test('exactly one explicit nomination is required; invalid saves leave the draft unchanged', async () => {
  const f = await setup();
  for (const nominations of [[], ['agri-impact', 'agri-smart'], ['none-of-the-above', 'agri-impact'], ['unknown'], null, 'agri-impact']) {
    assert.equal((await f.evaluate({ action: 'nominations', revision: 0, nominations })).status, 400);
  }
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM judging_evaluations').get().n, 0);
  let r = await f.evaluate({ action: 'nominations', revision: 0, nominations: ['none-of-the-above'] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.evaluation.nominations, ['none-of-the-above']);
  r = await f.evaluate({ action: 'nominations', revision: 1, nominations: ['agri-impact'] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.evaluation.nominations, ['agri-impact']);
  await f.evaluate({ action: 'scores', revision: 2, scores: fullScores });
  // Legacy drafts must explicitly choose again; do not silently reinterpret old data.
  for (const nominations of [[], ['agri-impact', 'agri-smart']]) {
    f.sqlite.prepare('UPDATE judging_evaluations SET nominations=? WHERE team_id=1').run(JSON.stringify(nominations));
    assert.equal((await f.evaluate({ action: 'submit', revision: 3 })).status, 400);
    assert.equal(f.sqlite.prepare('SELECT status FROM judging_evaluations WHERE team_id=1').get().status, 'draft');
  }
});

test('None of the above is an explicit saved choice in every sector', async () => {
  for (const sector of Object.keys(AWARDS)) {
    const f = await setup();
    f.sqlite.prepare('UPDATE hackathon_teams SET sector_track=? WHERE id=1').run(sector);
    f.sqlite.prepare("UPDATE judging_judges SET sector_filter='' WHERE id=?").run(f.judge.id);
    assert.equal((await f.evaluate({ action: 'nominations', revision: 0, nominations: ['none-of-the-above'] })).status, 200);
    await f.evaluate({ action: 'scores', revision: 1, scores: fullScores });
    const result = await f.evaluate({ action: 'submit', revision: 2 });
    assert.equal(result.status, 200);
    assert.deepEqual(result.evaluation.nominations, ['none-of-the-above']);
  }
});
