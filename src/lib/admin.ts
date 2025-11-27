import { NextRequest, NextResponse } from "next/server";

export function verifyAdminToken(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || adminToken === "change_me_to_a_secure_random_string") {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.replace("Bearer ", "");

  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");

  const providedToken = tokenFromHeader || tokenFromQuery;

  return providedToken === adminToken;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Non autorisé", code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function adminNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { error: "Token admin non configuré", code: "ADMIN_NOT_CONFIGURED" },
    { status: 503 }
  );
}
