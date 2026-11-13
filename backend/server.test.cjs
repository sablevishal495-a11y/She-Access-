"use strict";

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { once } = require("node:events");
const app = require("./server.cjs");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function post(path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

test("health declares the server as a no-SMS demo", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).mode, "demo");
});

test("invalid phones and unauthenticated machine requests are rejected", async () => {
  const phoneResponse = await post("/auth/otp/send", { phone: "12345" });
  assert.equal(phoneResponse.status, 400);
  const machinesResponse = await fetch(`${baseUrl}/machines/nearby?lat=28.6139&lng=77.209&radiusKm=5`);
  assert.equal(machinesResponse.status, 401);
});

test("OTP, sample locations, validation, and logout work end to end", async () => {
  const phone = "+919876543210";
  const send = await post("/auth/otp/send", { phone });
  assert.equal(send.status, 200);
  const { requestId } = await send.json();
  assert.ok(requestId);

  const incorrect = await post("/auth/otp/verify", { phone, otp: "000000", requestId });
  assert.equal(incorrect.status, 400);

  const verify = await post("/auth/otp/verify", { phone, otp: process.env.DEV_OTP || "123456", requestId });
  assert.equal(verify.status, 200);
  const { token, user } = await verify.json();
  assert.equal(user.phone, phone);
  assert.ok(token);

  const nearby = await fetch(`${baseUrl}/machines/nearby?lat=28.6139&lng=77.209&radiusKm=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(nearby.status, 200);
  const { machines } = await nearby.json();
  assert.equal(machines.length, 8);
  assert.ok(machines.every((machine) => machine.sample === true && machine.location.lat > 28));

  const invalidLocation = await fetch(`${baseUrl}/machines/nearby?lat=not-a-number&lng=77.209&radiusKm=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(invalidLocation.status, 400);

  const logout = await post("/auth/logout", {}, token);
  assert.equal(logout.status, 204);
  const afterLogout = await fetch(`${baseUrl}/machines/nearby?lat=28.6139&lng=77.209&radiusKm=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(afterLogout.status, 401);
});