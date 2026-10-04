import { describe, expect, it } from "vitest";
import { appRouter } from "./routers.js";
import type { TrpcContext } from "./_core/context.js";

const userContext = (): TrpcContext => ({
  user: { id: 1, openId: "t", email: "t@example.com", name: "T", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("admin program procedures", () => {
  it("reject non-admin users", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.admin.createProgram({ slug: "x", title: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setProgramPublished({ id: 1, published: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.saveCommunityLink({ key: "wa", label: "WA", platform: "whatsapp", url: "https://example.com", isActive: true, displayOrder: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects invalid slugs before touching the database", async () => {
    const caller = appRouter.createCaller({ ...userContext(), user: { ...userContext().user!, role: "admin" } });
    await expect(caller.admin.createProgram({ slug: "Bad Slug!", title: "X" })).rejects.toThrow();
  });
});
