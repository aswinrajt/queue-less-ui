/**
 * Mock data layer for QueueLess.
 *
 * Types + seed data only. All mutable runtime state lives in the local
 * store (`src/lib/queue-store.tsx`) which is seeded from here. No backend.
 */

export type QueueStatus = "active" | "paused" | "closed";
export type TicketStatus = "waiting" | "serving" | "served" | "skipped" | "held";
export type JoinChannel = "QR scan" | "Walk-in" | "Web link" | "Reception";

/** Human labels for queue statuses as shown to businesses. */
export const queueStatusLabels: Record<QueueStatus, string> = {
  active: "Open",
  paused: "Paused",
  closed: "Closed",
};

export type Queue = {
  id: string;
  slug: string;
  name: string;
  location: string;
  description: string;
  status: QueueStatus;
  /** Average minutes spent serving one customer — drives wait estimates. */
  avgServiceMinutes: number;
  /** Maximum tokens that may be issued for the day. */
  capacity: number;
  tokenPrefix: string;
  nextTokenNumber: number;
  /** Customers already served today before the app booted. */
  servedBaseline: number;
  staff: string[];
  openHours: string;
};

export type Ticket = {
  id: string;
  queueId: string;
  token: string;
  name: string;
  phone: string;
  partySize: number;
  /** Display label for when the customer joined, e.g. "10:42 AM". */
  joinedAt: string;
  /** Minutes already waited when the app booted (grows with the clock). */
  waitedMinutes: number;
  /** Minutes the counter spent on this customer (set once closed). */
  serviceMinutes?: number;
  status: TicketStatus;
  channel: JoinChannel;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
  noShows: number;
  avgWait: number;
  tags: string[];
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Counter staff";
  queues: string;
  status: "Active" | "Invited" | "Off duty";
  servedToday: number;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "queue" | "customer" | "system" | "staff";
  unread: boolean;
};

export const business = {
  name: "Riverside Family Clinic",
  plan: "Growth",
  slug: "riverside-family-clinic",
  timezone: "Asia/Kolkata",
  phone: "+91 98450 11223",
  address: "12 Riverside Road, Bengaluru 560001",
};

export const seedQueues: Queue[] = [
  {
    id: "q_1",
    slug: "general-consultation",
    name: "General Consultation",
    location: "Ground floor · Desk 1",
    description: "Walk-in consultations. Please carry previous prescriptions.",
    status: "active",
    avgServiceMinutes: 8,
    capacity: 120,
    tokenPrefix: "A",
    servedBaseline: 68,
    nextTokenNumber: 48,
    staff: ["Dr. Meera Nair", "Rahul S."],
    openHours: "09:00 – 18:00",
  },
  {
    id: "q_2",
    slug: "lab-sample-collection",
    name: "Lab Sample Collection",
    location: "First floor · Lab",
    description: "Blood and urine sample collection. Fasting tests before 10 AM.",
    status: "active",
    avgServiceMinutes: 5,
    capacity: 90,
    tokenPrefix: "L",
    servedBaseline: 41,
    nextTokenNumber: 22,
    staff: ["Anita K."],
    openHours: "08:00 – 14:00",
  },
  {
    id: "q_3",
    slug: "vaccination",
    name: "Vaccination Drive",
    location: "Annex · Room 3",
    description: "Childhood and travel vaccinations by appointment or walk-in.",
    status: "paused",
    avgServiceMinutes: 6,
    capacity: 60,
    tokenPrefix: "V",
    servedBaseline: 22,
    nextTokenNumber: 11,
    staff: ["Nurse Joseph"],
    openHours: "10:00 – 13:00",
  },
  {
    id: "q_4",
    slug: "pharmacy-pickup",
    name: "Pharmacy Pickup",
    location: "Ground floor · Counter 4",
    description: "Collect prescribed medicines. Bring your token and prescription.",
    status: "closed",
    avgServiceMinutes: 4,
    capacity: 150,
    tokenPrefix: "P",
    servedBaseline: 96,
    nextTokenNumber: 97,
    staff: ["Vikram P.", "Sneha R."],
    openHours: "09:00 – 21:00",
  },
];

export const seedTickets: Ticket[] = [
  { id: "t_1", queueId: "q_1", token: "A-042", name: "Kavya Menon", phone: "+91 98111 20345", partySize: 1, joinedAt: "10:42 AM", waitedMinutes: 9, status: "serving", channel: "QR scan" },
  { id: "t_2", queueId: "q_1", token: "A-043", name: "Arjun Rao", phone: "+91 90022 71188", partySize: 2, joinedAt: "10:47 AM", waitedMinutes: 12, status: "waiting", channel: "Web link" },
  { id: "t_3", queueId: "q_1", token: "A-044", name: "Fatima Sheikh", phone: "+91 99880 44521", partySize: 1, joinedAt: "10:51 AM", waitedMinutes: 18, status: "waiting", channel: "Walk-in" },
  { id: "t_4", queueId: "q_1", token: "A-045", name: "Daniel Fernandes", phone: "+91 90876 33210", partySize: 1, joinedAt: "10:55 AM", waitedMinutes: 24, status: "waiting", channel: "QR scan" },
  { id: "t_5", queueId: "q_1", token: "A-046", name: "Priya Iyer", phone: "+91 93450 88123", partySize: 3, joinedAt: "10:58 AM", waitedMinutes: 31, status: "waiting", channel: "Reception" },
  { id: "t_6", queueId: "q_1", token: "A-047", name: "Mohit Bansal", phone: "+91 98765 09912", partySize: 1, joinedAt: "11:03 AM", waitedMinutes: 37, status: "waiting", channel: "Web link" },
  { id: "t_7", queueId: "q_1", token: "A-041", name: "Leela Krishnan", phone: "+91 90011 55332", partySize: 1, joinedAt: "10:29 AM", waitedMinutes: 8, serviceMinutes: 7, status: "served", channel: "QR scan" },
  { id: "t_8", queueId: "q_1", token: "A-040", name: "Sameer Qureshi", phone: "+91 91234 77009", partySize: 1, joinedAt: "10:21 AM", waitedMinutes: 14, status: "skipped", channel: "Walk-in" },
  { id: "t_9", queueId: "q_1", token: "A-039", name: "Rohit Verma", phone: "+91 99450 12876", partySize: 1, joinedAt: "10:12 AM", waitedMinutes: 11, serviceMinutes: 9, status: "served", channel: "Reception" },
  { id: "t_10", queueId: "q_2", token: "L-017", name: "Nandini Shetty", phone: "+91 98860 44120", partySize: 1, joinedAt: "10:38 AM", waitedMinutes: 6, status: "serving", channel: "QR scan" },
  { id: "t_11", queueId: "q_2", token: "L-018", name: "Imran Khan", phone: "+91 90190 77234", partySize: 1, joinedAt: "10:44 AM", waitedMinutes: 9, status: "waiting", channel: "Walk-in" },
  { id: "t_12", queueId: "q_2", token: "L-019", name: "Sita Raman", phone: "+91 97411 33902", partySize: 1, joinedAt: "10:49 AM", waitedMinutes: 13, status: "waiting", channel: "QR scan" },
  { id: "t_13", queueId: "q_2", token: "L-020", name: "George Thomas", phone: "+91 98455 66710", partySize: 2, joinedAt: "10:56 AM", waitedMinutes: 17, status: "waiting", channel: "Web link" },
  { id: "t_14", queueId: "q_2", token: "L-016", name: "Aparna Bose", phone: "+91 90350 21188", partySize: 1, joinedAt: "10:22 AM", waitedMinutes: 7, serviceMinutes: 5, status: "served", channel: "QR scan" },
  { id: "t_15", queueId: "q_3", token: "V-008", name: "Ishaan Gupta", phone: "+91 99000 45671", partySize: 2, joinedAt: "10:10 AM", waitedMinutes: 5, status: "serving", channel: "Reception" },
  { id: "t_16", queueId: "q_3", token: "V-009", name: "Meghna Pillai", phone: "+91 98801 23345", partySize: 1, joinedAt: "10:26 AM", waitedMinutes: 12, status: "waiting", channel: "Walk-in" },
  { id: "t_17", queueId: "q_3", token: "V-010", name: "Tanvi Desai", phone: "+91 90080 55129", partySize: 1, joinedAt: "10:34 AM", waitedMinutes: 16, status: "held", channel: "QR scan" },
  { id: "t_18", queueId: "q_4", token: "P-096", name: "Harish Nambiar", phone: "+91 98450 90071", partySize: 1, joinedAt: "9:48 AM", waitedMinutes: 4, serviceMinutes: 3, status: "served", channel: "Walk-in" },
];

export const seedCustomers: Customer[] = [
  { id: "c_1", name: "Kavya Menon", phone: "+91 98111 20345", visits: 12, lastVisit: "Today, 10:42 AM", noShows: 0, avgWait: 9, tags: ["Regular"] },
  { id: "c_2", name: "Arjun Rao", phone: "+91 90022 71188", visits: 4, lastVisit: "Today, 10:47 AM", noShows: 1, avgWait: 15, tags: ["Family"] },
  { id: "c_3", name: "Fatima Sheikh", phone: "+91 99880 44521", visits: 21, lastVisit: "Today, 10:51 AM", noShows: 0, avgWait: 11, tags: ["Regular", "Priority"] },
  { id: "c_4", name: "Daniel Fernandes", phone: "+91 90876 33210", visits: 2, lastVisit: "Yesterday", noShows: 0, avgWait: 22, tags: ["New"] },
  { id: "c_5", name: "Priya Iyer", phone: "+91 93450 88123", visits: 8, lastVisit: "12 Aug", noShows: 2, avgWait: 17, tags: ["Family"] },
  { id: "c_6", name: "Mohit Bansal", phone: "+91 98765 09912", visits: 1, lastVisit: "Today, 11:03 AM", noShows: 0, avgWait: 12, tags: ["New"] },
  { id: "c_7", name: "Leela Krishnan", phone: "+91 90011 55332", visits: 33, lastVisit: "Today, 10:29 AM", noShows: 0, avgWait: 8, tags: ["Regular", "Priority"] },
  { id: "c_8", name: "Sameer Qureshi", phone: "+91 91234 77009", visits: 6, lastVisit: "Today, 10:21 AM", noShows: 3, avgWait: 19, tags: ["No-show risk"] },
  { id: "c_9", name: "Nandini Shetty", phone: "+91 98860 44120", visits: 9, lastVisit: "Today, 10:38 AM", noShows: 0, avgWait: 7, tags: ["Regular"] },
  { id: "c_10", name: "Imran Khan", phone: "+91 90190 77234", visits: 3, lastVisit: "Today, 10:44 AM", noShows: 1, avgWait: 13, tags: ["Family"] },
];

export const staff: StaffMember[] = [
  { id: "s_1", name: "Dr. Meera Nair", email: "meera@riversideclinic.in", role: "Owner", queues: "All queues", status: "Active", servedToday: 34 },
  { id: "s_2", name: "Rahul Suresh", email: "rahul@riversideclinic.in", role: "Manager", queues: "General Consultation", status: "Active", servedToday: 28 },
  { id: "s_3", name: "Anita Kulkarni", email: "anita@riversideclinic.in", role: "Counter staff", queues: "Lab Sample Collection", status: "Active", servedToday: 41 },
  { id: "s_4", name: "Joseph Mathew", email: "joseph@riversideclinic.in", role: "Counter staff", queues: "Vaccination Drive", status: "Off duty", servedToday: 22 },
  { id: "s_5", name: "Sneha Rao", email: "sneha@riversideclinic.in", role: "Counter staff", queues: "Pharmacy Pickup", status: "Invited", servedToday: 0 },
];

export const seedNotifications: NotificationItem[] = [
  { id: "n_1", title: "Queue wait time above target", body: "General Consultation average wait is 18 min (target 12 min).", time: "4 min ago", kind: "queue", unread: true },
  { id: "n_2", title: "A-045 notified", body: "Daniel Fernandes received a “2 people ahead” SMS.", time: "9 min ago", kind: "customer", unread: true },
  { id: "n_3", title: "Vaccination Drive paused", body: "Paused by Joseph Mathew — supplies restocking.", time: "26 min ago", kind: "queue", unread: true },
  { id: "n_4", title: "Sneha Rao invited", body: "Staff invite sent for Pharmacy Pickup counter.", time: "1 h ago", kind: "staff", unread: false },
  { id: "n_5", title: "Daily summary ready", body: "227 customers served yesterday, 9 min average wait.", time: "Today, 7:00 AM", kind: "system", unread: false },
  { id: "n_6", title: "3 no-shows detected", body: "Tokens A-031, A-034, A-040 did not respond to two calls.", time: "Yesterday", kind: "customer", unread: false },
];

/** Tokens joined and served per hour today — the daily activity series. */
export const seedHourlyVolume = [
  { hour: "9a", joined: 18, served: 14 },
  { hour: "10a", joined: 32, served: 27 },
  { hour: "11a", joined: 41, served: 36 },
  { hour: "12p", joined: 28, served: 31 },
  { hour: "1p", joined: 16, served: 19 },
  { hour: "2p", joined: 24, served: 21 },
  { hour: "3p", joined: 37, served: 33 },
  { hour: "4p", joined: 30, served: 32 },
  { hour: "5p", joined: 21, served: 25 },
];

export const seedWaitTrend = [
  { day: "Mon", wait: 14 },
  { day: "Tue", wait: 12 },
  { day: "Wed", wait: 16 },
  { day: "Thu", wait: 11 },
  { day: "Fri", wait: 18 },
  { day: "Sat", wait: 22 },
  { day: "Sun", wait: 9 },
];

export const channelSplit = [
  { channel: "QR scan", value: 48 },
  { channel: "Web link", value: 27 },
  { channel: "Walk-in", value: 16 },
  { channel: "Reception", value: 9 },
];

/** Totals accumulated before the app booted, so counters look lived-in. */
export const historicTotals = {
  servedBeforeToday: 1245,
  tokensIssuedToday: 232,
  totalCustomers: 1284,
};
