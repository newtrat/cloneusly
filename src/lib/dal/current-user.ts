import "server-only";

export type UserSummary = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
};

export type CurrentAccountView = {
  user: UserSummary;
  role: "MEMBER" | "TESTER";
  givingBalance: number;
  receivedBalance: number;
  unreadNotificationCount: number;
  testTopUpsEnabled: boolean;
};

type UserLike = {
  id: string;
  handle: string;
  name: string;
  image: string | null;
  role?: "MEMBER" | "TESTER";
};

export function toUserSummary(user: UserLike): UserSummary {
  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    image: user.image,
  };
}

export function toSafeUserView(user: UserLike): UserSummary {
  return toUserSummary(user);
}
