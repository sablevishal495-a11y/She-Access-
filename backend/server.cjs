"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const express = require("express");
const cors = require("cors");

// This server intentionally provides sample data and a fixed OTP, not production auth.
if (process.env.NODE_ENV === "production") {
  throw new Error("The sample backend cannot run in production. Connect a real SMS and inventory service.");
}

const app = express();
const OTP = process.env.DEV_OTP || "123456";
const OTP_LIFETIME = 5 * 60 * 1000;
const SESSION_LIFETIME = 24 * 60 * 60 * 1000;
const SEND_WINDOW = 10 * 60 * 1000;

if (!/^\d{6}$/.test(OTP)) throw new Error("DEV_OTP must be six digits.");

app.disable("x-powered-by");
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((value) => value.trim()) }));
app.use(express.json({ limit: "8kb" }));
app.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });

const otpRequests = new Map();
const sendLimits = new Map();
const sessions = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [id, request] of otpRequests) if (request.expiresAt <= now) otpRequests.delete(id);
  for (const [phone, limit] of sendLimits) if (limit.until <= now) sendLimits.delete(phone);
  for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
}

function distanceKm(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function offsetMeters(origin, north, east) {
  return {
    lat: origin.lat + north / 111320,
    lng: origin.lng + east / (111320 * Math.max(0.01, Math.cos(origin.lat * Math.PI / 180))),
  };
}

const templates = [
  { id: "sample-1", name: "Metro Station - Gate 2", address: "Sample station entrance", north: 220, east: 140, price: 5, stock: 42, capacity: 60, online: true, hours: "5:00 AM - 11:00 PM", minutesAgo: 190 },
  { id: "sample-2", name: "City Mall - Ground Floor", address: "Sample shopping centre", north: -380, east: 260, price: 10, stock: 9, capacity: 50, online: true, hours: "10:00 AM - 10:00 PM", minutesAgo: 1500 },
  { id: "sample-3", name: "Community Health Centre", address: "Sample health centre", north: -640, east: -420, price: 5, stock: 31, capacity: 40, online: true, hours: "24 hours", minutesAgo: 420 },
  { id: "sample-4", name: "Central Library", address: "Sample library entrance", north: 900, east: 380, price: 8, stock: 24, capacity: 48, online: true, hours: "9:00 AM - 8:00 PM", minutesAgo: 780 },
  { id: "sample-5", name: "Bus Stand - Waiting Hall", address: "Sample transit waiting hall", north: -1100, east: 700, price: 5, stock: 4, capacity: 40, online: true, hours: "5:00 AM - 11:00 PM", minutesAgo: 2900 },
  { id: "sample-6", name: "Railway Station - Platform 1", address: "Sample ticket counter", north: -1800, east: -1200, price: 10, stock: 55, capacity: 60, online: true, hours: "24 hours", minutesAgo: 95 },
  { id: "sample-7", name: "Girls' School", address: "Sample school entrance", north: 520, east: -310, price: 5, stock: 0, capacity: 40, online: true, hours: "8:00 AM - 4:00 PM", minutesAgo: 4300 },
  { id: "sample-8", name: "College Campus", address: "Sample campus admin block", north: 1500, east: -900, price: 6, stock: 18, capacity: 50, online: false, hours: "8:00 AM - 6:00 PM", minutesAgo: 6200 },
];

function requireAuth(request, response, next) {
  pruneExpired();
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || "");
  const token = match?.[1];
  const session = token && sessions.get(token);
  if (!session) return response.status(401).json({ message: "Please sign in again." });
  request.sessionToken = token;
  request.user = session.user;
  next();
}

app.get("/api/v1/health", (_request, response) => {
  response.json({ status: "ok", service: "SHE-ACCESS sample API", mode: "demo", smsEnabled: false });
});

app.post("/auth/otp/send", (request, response) => {
  pruneExpired();
  const phone = request.body?.phone;
  if (typeof phone !== "string" || !/^\+91[6-9]\d{9}$/.test(phone)) {
    return response.status(400).json({ message: "Enter a valid Indian mobile number." });
  }

  const previous = sendLimits.get(phone);
  const count = previous ? previous.count + 1 : 1;
  if (count > 5) return response.status(429).json({ message: "Too many codes requested. Please try again later." });
  sendLimits.set(phone, { count, until: previous?.until || Date.now() + SEND_WINDOW });

  const requestId = crypto.randomUUID();
  otpRequests.set(requestId, { phone, expiresAt: Date.now() + OTP_LIFETIME, attempts: 0 });
  response.json({ requestId, expiresInSec: OTP_LIFETIME / 1000 });
});

app.post("/auth/otp/verify", (request, response) => {
  pruneExpired();
  const { phone, otp, requestId } = request.body || {};
  const pending = typeof requestId === "string" ? otpRequests.get(requestId) : undefined;
  if (!pending || pending.phone !== phone || pending.attempts >= 5) {
    return response.status(400).json({ message: "Code expired. Request a new one." });
  }
  pending.attempts += 1;

  const valid = typeof otp === "string" && /^\d{6}$/.test(otp) &&
    crypto.timingSafeEqual(Buffer.from(otp), Buffer.from(OTP));
  if (!valid) return response.status(400).json({ message: "That code isn't right. Please try again.", code: "INVALID_OTP" });

  otpRequests.delete(requestId);
  const user = { id: crypto.randomUUID(), phone };
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { user, expiresAt: Date.now() + SESSION_LIFETIME });
  response.json({ token, user });
});

app.post("/auth/logout", requireAuth, (request, response) => {
  sessions.delete(request.sessionToken);
  response.status(204).end();
});

app.get("/machines/nearby", requireAuth, (request, response) => {
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);
  const radiusKm = Number(request.query.radiusKm);
  if (
    typeof request.query.lat !== "string" || request.query.lat.trim() === "" ||
    typeof request.query.lng !== "string" || request.query.lng.trim() === "" ||
    typeof request.query.radiusKm !== "string" || request.query.radiusKm.trim() === "" ||
    !Number.isFinite(lat) || Math.abs(lat) > 90 ||
    !Number.isFinite(lng) || Math.abs(lng) > 180 ||
    !Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100
  ) return response.status(400).json({ message: "Invalid location or search radius." });

  const origin = { lat, lng };
  const machines = templates.map((item) => ({
    id: item.id,
    name: item.name,
    address: item.address,
    location: offsetMeters(origin, item.north, item.east),
    pricePerPad: item.price,
    currency: "INR",
    stock: item.stock,
    capacity: item.capacity,
    online: item.online,
    openHours: item.hours,
    lastRestockedAt: new Date(Date.now() - item.minutesAgo * 60_000).toISOString(),
    sample: true,
  })).filter((machine) => distanceKm(origin, machine.location) <= radiusKm);

  response.json({ machines });
});

module.exports = app;

if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || "127.0.0.1";
  app.listen(port, host, () => console.log(`SHE-ACCESS sample API listening at http://${host}:${port}`));
}