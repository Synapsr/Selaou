import { NextRequest, NextResponse } from "next/server";
import { importFromJson } from "@/lib/data-sources/importer";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/admin";

// POST /api/sources/import - Import a single audio source (admin only)
export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    const { name, audioUrl, sourceUrl, whisperJson, externalId } = body;

    if (!name || !audioUrl || !whisperJson) {
      return NextResponse.json(
        { error: "Missing required fields: name, audioUrl, whisperJson" },
        { status: 400 }
      );
    }

    const sourceId = await importFromJson({
      externalId,
      name,
      audioUrl,
      sourceUrl,
      whisperJson,
    });

    return NextResponse.json({
      success: true,
      sourceId,
    });
  } catch (error) {
    console.error("Import error:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Source already exists", code: "DUPLICATE" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
