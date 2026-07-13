import { getTestPrisma } from "./database";
import { createActiveUser, createRecognition } from "./factories";

export async function seedPerformanceFixture(): Promise<{
  viewerId: string;
  recognitionCount: number;
}> {
  const prisma = getTestPrisma();

  const viewer = await createActiveUser({
    email: "perf-viewer@test.local",
    handle: "perfviewer",
    name: "Perf Viewer",
  });

  const senders: string[] = [];
  for (let i = 0; i < 25; i++) {
    const sender = await createActiveUser({
      email: `perf-sender-${i}@test.local`,
      handle: `perfsender${i}`,
      name: `Perf Sender ${i}`,
      givingBalance: 100_000,
    });
    senders.push(sender.id);
  }

  const recipients: string[] = [];
  for (let i = 0; i < 225; i++) {
    const recipient = await createActiveUser({
      email: `perf-recipient-${i}@test.local`,
      handle: `perfrec${i}`,
      name: `Perf Rec ${i}`,
    });
    recipients.push(recipient.id);
  }

  const targetCount = 200;
  for (let i = 0; i < targetCount; i++) {
    const senderId = senders[i % senders.length]!;
    const recipientId = recipients[i % recipients.length]!;
    await createRecognition({
      senderId,
      recipientIds: [recipientId],
      pointsPerRecipient: 5 + (i % 10),
      text: `Performance recognition ${i}`,
      hashtags: i % 3 === 0 ? ["perf"] : undefined,
      createdAt: new Date(Date.now() - i * 60_000),
    });
  }

  const recognitionCount = await prisma.recognition.count();
  return { viewerId: viewer.id, recognitionCount };
}
