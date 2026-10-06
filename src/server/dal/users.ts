import "server-only";
import { Prisma } from "../../generated/prisma/client";
import { db } from "../db";

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
}

export async function listRecentUsers(
  limit: number,
): Promise<{ users: UserListItem[]; total: number }> {
  const [users, total] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.user.count(),
  ]);

  return { users, total };
}

// Errors that mean "the database isn't set up or reachable yet" rather than a
// bug: authentication failed, server unreachable, database missing, table
// missing (migrations not applied).
const SETUP_ERROR_CODES = new Set(["P1000", "P1001", "P1003", "P2021"]);

export function isDbUnavailable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    SETUP_ERROR_CODES.has(error.code)
  );
}
