import { offsetMeters } from "@/lib/geo";
import type { Coordinates, VendingMachine } from "@/types";

/**
 * PLACEHOLDER DATA (demo mode only).
 * Machines are positioned relative to the user's location so the demo looks
 * right wherever the app is opened. Remove this file once the backend is live.
 */
interface Template {
  id: string;
  name: string;
  address: string;
  north: number; // metres from the user
  east: number;
  pricePerPad: number;
  stock: number;
  capacity: number;
  online: boolean;
  openHours: string;
  restockedMinutesAgo: number;
}

const TEMPLATES: Template[] = [
  {
    id: "m-001",
    name: "Metro Station – Gate 2",
    address: "Sample station entrance near Gate 2",
    north: 220,
    east: 140,
    pricePerPad: 5,
    stock: 42,
    capacity: 60,
    online: true,
    openHours: "5:00 AM – 11:00 PM",
    restockedMinutesAgo: 190,
  },
  {
    id: "m-002",
    name: "City Mall – Ground Floor",
    address: "Sample ground floor near restrooms",
    north: -380,
    east: 260,
    pricePerPad: 10,
    stock: 9,
    capacity: 50,
    online: true,
    openHours: "10:00 AM – 10:00 PM",
    restockedMinutesAgo: 1500,
  },
  {
    id: "m-003",
    name: "Government Girls' School",
    address: "Sample school entrance",
    north: 520,
    east: -310,
    pricePerPad: 5,
    stock: 0,
    capacity: 40,
    online: true,
    openHours: "8:00 AM – 4:00 PM",
    restockedMinutesAgo: 4300,
  },
  {
    id: "m-004",
    name: "Community Health Centre",
    address: "Sample health centre reception",
    north: -640,
    east: -420,
    pricePerPad: 5,
    stock: 31,
    capacity: 40,
    online: true,
    openHours: "24 hours",
    restockedMinutesAgo: 420,
  },
  {
    id: "m-005",
    name: "Central Library",
    address: "Sample first-floor reading room",
    north: 900,
    east: 380,
    pricePerPad: 8,
    stock: 24,
    capacity: 48,
    online: true,
    openHours: "9:00 AM – 8:00 PM",
    restockedMinutesAgo: 780,
  },
  {
    id: "m-006",
    name: "Bus Stand – Waiting Hall",
    address: "Sample waiting hall",
    north: -1100,
    east: 700,
    pricePerPad: 5,
    stock: 4,
    capacity: 40,
    online: true,
    openHours: "5:00 AM – 11:00 PM",
    restockedMinutesAgo: 2900,
  },
  {
    id: "m-007",
    name: "Sunrise College Campus",
    address: "Sample campus admin block",
    north: 1500,
    east: -900,
    pricePerPad: 6,
    stock: 18,
    capacity: 50,
    online: false,
    openHours: "8:00 AM – 6:00 PM",
    restockedMinutesAgo: 6200,
  },
  {
    id: "m-008",
    name: "Railway Station – Platform 1",
    address: "Sample station ticket counter",
    north: -1800,
    east: -1200,
    pricePerPad: 10,
    stock: 55,
    capacity: 60,
    online: true,
    openHours: "24 hours",
    restockedMinutesAgo: 95,
  },
];

export function buildMockMachines(origin: Coordinates): VendingMachine[] {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    address: t.address,
    location: offsetMeters(origin, t.north, t.east),
    pricePerPad: t.pricePerPad,
    currency: "INR",
    stock: t.stock,
    capacity: t.capacity,
    online: t.online,
    openHours: t.openHours,
    lastRestockedAt: new Date(
      Date.now() - t.restockedMinutesAgo * 60_000,
    ).toISOString(),
    sample: true,
  }));
}
