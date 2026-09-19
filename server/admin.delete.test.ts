import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 1, openId: "delete-test-user", email: "delete-test@example.com", name: "Delete Test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.deleteRegistration", () => {
  it("rejects non-admin users before touching registration data", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.admin.deleteRegistration({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
