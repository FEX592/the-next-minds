import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '../../shared/const.js';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context.js";

// Drizzle wraps Postgres errors ("Failed query: …"); the real reason sits on the cause chain.
function findPgError(error: unknown): { code?: string; message?: string } | undefined {
  for (let e: any = error, i = 0; e && i < 6; e = e.cause, i++) if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e;
  return undefined;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    const pg = findPgError(error);
    if (!pg) return shape;
    console.error("[db]", pg.code, pg.message);
    // 42P01 undefined_table, 42703 undefined_column, 42704 undefined_object (enum type): schema is behind the code.
    if (pg.code === "42P01" || pg.code === "42703" || pg.code === "42704") {
      const detail = ctx?.user?.role === "admin" ? ` (${pg.message})` : "";
      return { ...shape, message: `The database schema is out of date — run the latest migration SQL from the repo's drizzle/ folder.${detail}` };
    }
    if (ctx?.user?.role === "admin" && shape.message.startsWith("Failed query")) return { ...shape, message: `Database error ${pg.code}: ${pg.message}` };
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
