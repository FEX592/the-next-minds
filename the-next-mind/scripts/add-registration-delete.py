from pathlib import Path

root = Path('/home/ubuntu/the-next-minds-repair')

home = root / 'client/src/pages/Home.tsx'
s = home.read_text()
s = s.replace('import { Link } from "wouter";\n', '')
s = s.replace('<Link href="/admin" className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10">Admin access</Link>', '')
home.write_text(s)

admin = root / 'client/src/pages/Admin.tsx'
s = admin.read_text()
s = s.replace('RefreshCw, Settings, ShieldCheck, Sparkles, Users, X', 'RefreshCw, Settings, ShieldCheck, Sparkles, Trash2, Users, X')
old = 'const q=trpc.admin.registrations.useQuery({status:status||undefined,search:search||undefined}); const update=trpc.admin.updateStatus.useMutation({onSuccess:()=>q.refetch()});'
new = 'const q=trpc.admin.registrations.useQuery({status:status||undefined,search:search||undefined}); const update=trpc.admin.updateStatus.useMutation({onSuccess:()=>q.refetch()}); const remove=trpc.admin.deleteRegistration.useMutation({onSuccess:()=>q.refetch()});'
if old not in s:
    raise SystemExit('Requests mutation marker not found')
s = s.replace(old, new)
old_action = '<div className="flex gap-2">{r.status==="PENDING"&&<><button disabled={update.isPending} onClick={()=>update.mutate({id:r.id,status:"ACCEPTED"})} className="rounded-lg bg-emerald-400/15 p-2 text-emerald-200 hover:bg-emerald-400/25" title="Accept"><Check className="h-4 w-4"/></button><button disabled={update.isPending} onClick={()=>update.mutate({id:r.id,status:"REJECTED"})} className="rounded-lg bg-rose-400/15 p-2 text-rose-200 hover:bg-rose-400/25" title="Reject"><X className="h-4 w-4"/></button></>}</div>'
new_action = """<div className="flex gap-2">{r.status==="PENDING"&&<><button disabled={update.isPending||remove.isPending} onClick={()=>update.mutate({id:r.id,status:"ACCEPTED"})} className="rounded-lg bg-emerald-400/15 p-2 text-emerald-200 hover:bg-emerald-400/25" title="Accept"><Check className="h-4 w-4"/></button><button disabled={update.isPending||remove.isPending} onClick={()=>update.mutate({id:r.id,status:"REJECTED"})} className="rounded-lg bg-rose-400/15 p-2 text-rose-200 hover:bg-rose-400/25" title="Reject"><X className="h-4 w-4"/></button></>}<button disabled={update.isPending||remove.isPending} onClick={()=>{if(window.confirm(`Permanently delete ${r.firstName} ${r.lastName}'s registration? This cannot be undone.`)) remove.mutate({id:r.id})}} className="rounded-lg bg-white/5 p-2 text-slate-400 hover:bg-rose-400/15 hover:text-rose-200" title="Delete permanently"><Trash2 className="h-4 w-4"/></button></div>"""
if old_action not in s:
    raise SystemExit('Requests action marker not found')
s = s.replace(old_action, new_action)
admin.write_text(s)

db = root / 'server/db.ts'
s = db.read_text()
needle = 'export async function getRegistration(id:number){const db=await getDb();if(!db)return;const rows=await db.select().from(registrations).where(eq(registrations.id,id)).limit(1);return rows[0]}\n'
replacement = needle + 'export async function deleteRegistration(id:number){const db=await getDb();if(!db)return false;const existing=await getRegistration(id);if(!existing)return false;await db.delete(emailLogs).where(eq(emailLogs.registrationId,id));await db.delete(notifications).where(eq(notifications.registrationId,id));await db.delete(auditLogs).where(eq(auditLogs.registrationId,id));await db.delete(registrations).where(eq(registrations.id,id));return true}\n'
if needle not in s:
    raise SystemExit('Database helper marker not found')
s = s.replace(needle, replacement)
db.write_text(s)

routers = root / 'server/routers.ts'
s = routers.read_text()
s = s.replace('createAudit, createEmailLog, createNotification, ensureDefaults, getConfig, getDb, getEmailMedia, getRegistration, getStats, listRegistrations, updateEmailLog', 'createAudit, createEmailLog, createNotification, deleteRegistration, ensureDefaults, getConfig, getDb, getEmailMedia, getRegistration, getStats, listRegistrations, updateEmailLog')
needle = '    updateStatus: adminOnly.input(z.object({ id: z.number(), status: z.enum(["ACCEPTED", "REJECTED"]), reason: z.string().optional() })).mutation(async ({ ctx, input }) => {'
insert = '    deleteRegistration: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const deleted = await deleteRegistration(input.id); if (!deleted) throw new Error("Registration not found."); await createAudit("Permanently deleted registration", ctx.user.id, undefined); return { success: true as const }; }),\n'
if needle not in s:
    raise SystemExit('Router procedure marker not found')
s = s.replace(needle, insert + needle)
routers.write_text(s)

(root / 'server/admin.delete.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport { appRouter } from "./routers";\nimport type { TrpcContext } from "./_core/context";\n\nfunction contextFor(role: "admin" | "user"): TrpcContext {\n  return {\n    user: { id: 1, openId: "delete-test-user", email: "delete-test@example.com", name: "Delete Test", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },\n    req: { protocol: "https", headers: {} } as TrpcContext["req"],\n    res: {} as TrpcContext["res"],\n  };\n}\n\ndescribe("admin.deleteRegistration", () => {\n  it("rejects non-admin users before touching registration data", async () => {\n    const caller = appRouter.createCaller(contextFor("user"));\n    await expect(caller.admin.deleteRegistration({ id: 1 })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });\n  });\n});\n''')
