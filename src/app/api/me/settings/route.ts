import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";
import { isValidDisplayName } from "@/lib/display-name";

/**
 * PATCH /api/me/settings
 *
 * Updates the connected reviewer's public profile:
 *   - displayName : pseudo shown on the leaderboard
 *   - isPublic    : opt-out from the public leaderboard
 *
 * Authenticates by `email` in the body — same model as the lazy-auth flow.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName, isPublic } = body as {
      email?: string;
      displayName?: string;
      isPublic?: boolean;
    };

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const reviewer = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.email, email),
    });

    if (!reviewer) {
      return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
    }

    const updates: { displayName?: string; isPublic?: boolean } = {};

    if (typeof displayName === "string") {
      const validation = isValidDisplayName(displayName);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }
      const trimmed = displayName.trim();
      // Reject if another reviewer already owns this pseudo
      const taken = await db.query.reviewers.findFirst({
        where: and(
          eq(schema.reviewers.displayName, trimmed),
          ne(schema.reviewers.id, reviewer.id)
        ),
        columns: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Ce pseudo est déjà pris" }, { status: 409 });
      }
      updates.displayName = trimmed;
    }

    if (typeof isPublic === "boolean") {
      updates.isPublic = isPublic;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun changement" }, { status: 400 });
    }

    await db
      .update(schema.reviewers)
      .set(updates)
      .where(eq(schema.reviewers.id, reviewer.id));

    return NextResponse.json({
      success: true,
      profile: {
        email: reviewer.email,
        displayName: updates.displayName ?? reviewer.displayName,
        isPublic: updates.isPublic ?? reviewer.isPublic,
      },
    });
  } catch (error) {
    console.error("Me settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
