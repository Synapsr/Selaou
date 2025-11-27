import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    const segment = await db.query.segments.findFirst({
      where: eq(schema.segments.id, id),
      with: {
        audioSource: true,
        reviews: {
          with: {
            reviewer: true,
          },
        },
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment non trouvé" },
        { status: 404 }
      );
    }

    const feedback = await db
      .select({
        id: schema.segmentFeedback.id,
        type: schema.segmentFeedback.type,
        message: schema.segmentFeedback.message,
        createdAt: schema.segmentFeedback.createdAt,
        reviewerEmail: schema.reviewers.email,
      })
      .from(schema.segmentFeedback)
      .leftJoin(schema.reviewers, eq(schema.segmentFeedback.reviewerId, schema.reviewers.id))
      .where(eq(schema.segmentFeedback.segmentId, id));

    return NextResponse.json({
      segment,
      feedback,
    });
  } catch (error) {
    console.error("Error fetching segment:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du segment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    // Vérifier que le segment existe
    const segment = await db.query.segments.findFirst({
      where: eq(schema.segments.id, id),
    });

    if (!segment) {
      return NextResponse.json(
        { error: "Segment non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer les reviews associées
    await db.delete(schema.reviews).where(eq(schema.reviews.segmentId, id));

    // Supprimer les feedbacks associés
    await db
      .delete(schema.segmentFeedback)
      .where(eq(schema.segmentFeedback.segmentId, id));

    // Supprimer le segment
    await db.delete(schema.segments).where(eq(schema.segments.id, id));

    // Mettre à jour le compteur de segments de l'audioSource
    await db
      .update(schema.audioSources)
      .set({
        totalSegments: sql`${schema.audioSources.totalSegments} - 1`,
      })
      .where(eq(schema.audioSources.id, segment.audioSourceId));

    return NextResponse.json({
      success: true,
      message: "Segment supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting segment:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du segment" },
      { status: 500 }
    );
  }
}
