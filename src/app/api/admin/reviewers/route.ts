import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const sortBy = url.searchParams.get("sort") || "reviewCount";
    const order = url.searchParams.get("order") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const orderColumn =
      sortBy === "correctionCount"
        ? schema.reviewers.correctionCount
        : sortBy === "lastReviewAt"
          ? schema.reviewers.lastReviewAt
          : sortBy === "createdAt"
            ? schema.reviewers.createdAt
            : schema.reviewers.reviewCount;

    const reviewersList = await db
      .select()
      .from(schema.reviewers)
      .orderBy(order === "asc" ? orderColumn : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reviewers);

    return NextResponse.json({
      reviewers: reviewersList,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching reviewers:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des annotateurs" },
      { status: 500 }
    );
  }
}
