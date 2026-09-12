import test from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../judging/functions/api/auth.js";
import { onRequestGet } from "../judging/functions/api/workspace.js";
import { judgingFixture } from "./judgingFixture.js";
import { hashPassword } from "../functions/_shared/auth.js";
const request = (
  DB,
  method = "POST",
  body = { username: "venue-test", password: "test-pass" },
  cookie = "",
  origin = "https://test.example",
) => ({
  env: { DB },
  request: new Request("https://test.example/api/auth", {
    method,
    headers: { origin, "content-type": "application/json", cookie },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  }),
});
async function setup() {
  const f = judgingFixture();
  f.sqlite
    .prepare(
      "UPDATE judging_users SET username=?,password_hash=?,password_salt=? WHERE id=?",
    )
    .run(
      "venue-test",
      await hashPassword("test-pass", "test-salt", 100000),
      "test-salt",
      "test-user",
    );
  return f;
}
test("venue login establishes an independent secure session, restores and revokes it", async () => {
  const f = await setup();
  const r = await onRequest(request(f.DB));
  assert.equal(r.status, 200);
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /__Host-aiconclave_judging_session=/);
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
  const user = (await r.json()).user;
  assert.deepEqual(user, { username: "venue-test", role: "venue_admin" });
  assert.equal(
    (await onRequestGet(request(f.DB, "GET", null, cookie))).status,
    200,
  );
  assert.equal(
    (await onRequest(request(f.DB, "DELETE", null, cookie))).status,
    200,
  );
  assert.equal(
    (await onRequest(request(f.DB, "GET", null, cookie))).status,
    401,
  );
});
test("attendance cookie and judge accounts cannot access venue administration", async () => {
  const f = await setup();
  assert.equal(
    (
      await onRequestGet(
        request(f.DB, "GET", null, "__Host-aiconclave_attendance_session=test"),
      )
    ).status,
    401,
  );
  f.sqlite.exec("UPDATE judging_users SET role='judge'");
  assert.equal((await onRequest(request(f.DB))).status, 401);
  assert.equal(
    (
      await onRequestGet(
        request(f.DB, "GET", null, "__Host-aiconclave_judging_session=test"),
      )
    ).status,
    403,
  );
});
test("wrong credentials, cross-origin writes, expired sessions and repeated attempts are rejected", async () => {
  const f = await setup();
  assert.equal(
    (await onRequest(request(f.DB, "POST", {}, "", "https://evil.example")))
      .status,
    403,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await onRequest(
          request(f.DB, "POST", { username: "venue-test", password: "wrong" }),
        )
      ).status,
      401,
    );
  assert.equal((await onRequest(request(f.DB))).status, 429);
  f.sqlite.exec(
    "UPDATE judging_users SET locked_until=unixepoch()-1;UPDATE judging_sessions SET expires_at=datetime('now','-1 hour')",
  );
  assert.equal(
    (
      await onRequest(
        request(f.DB, "GET", null, "__Host-aiconclave_judging_session=test"),
      )
    ).status,
    401,
  );
  assert.equal((await onRequest(request(f.DB))).status, 200);
});
