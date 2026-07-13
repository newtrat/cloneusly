export type SeedUserSpec = {
  email: string;
  name: string;
  handle: string;
  role: "MEMBER" | "TESTER";
  initialGivingPoints: number;
};

export const SEED_USERS: SeedUserSpec[] = [
  {
    email: "alice@cloneusly.local",
    name: "Alice Sender",
    handle: "alice",
    role: "MEMBER",
    initialGivingPoints: 100,
  },
  {
    email: "bob@cloneusly.local",
    name: "Bob Recipient",
    handle: "bob",
    role: "MEMBER",
    initialGivingPoints: 100,
  },
  {
    email: "carol@cloneusly.local",
    name: "Carol Recipient",
    handle: "carol",
    role: "MEMBER",
    initialGivingPoints: 100,
  },
  {
    email: "tester@cloneusly.local",
    name: "Terry Tester",
    handle: "tester",
    role: "TESTER",
    initialGivingPoints: 100,
  },
];
