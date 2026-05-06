import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const ADJECTIVES = [
  "Discret", "Curieux", "Patient", "Attentif", "Vigilant", "Posé",
  "Sage", "Précis", "Affûté", "Méticuleux", "Studieux", "Serein",
  "Tenace", "Subtil", "Lucide", "Modeste", "Constant", "Fidèle",
];

const NOUNS = [
  "Auditeur", "Annotateur", "Lecteur", "Veilleur", "Scribe",
  "Copiste", "Linguiste", "Conteur", "Témoin", "Passeur",
  "Gardien", "Émissaire", "Dénicheur", "Compagnon",
];

function randomSuffix(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a unique pseudo-friendly display name like "AuditeurDiscret-3F2A".
 * Retries up to 5 times on collision; falls back to email-prefix-based form.
 */
export async function generateUniqueDisplayName(emailFallback: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${pick(NOUNS)}${pick(ADJECTIVES)}-${randomSuffix()}`;
    const existing = await db.query.reviewers.findFirst({
      where: eq(schema.reviewers.displayName, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }

  const slug = emailFallback
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12) || "Annotateur";
  return `${slug}-${randomSuffix()}`;
}

export function isValidDisplayName(value: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = value.trim();
  if (trimmed.length < 3) return { ok: false, reason: "Au moins 3 caractères" };
  if (trimmed.length > 40) return { ok: false, reason: "40 caractères maximum" };
  if (!/^[a-zA-Z0-9À-ÿ_\- ]+$/.test(trimmed)) {
    return { ok: false, reason: "Lettres, chiffres, espaces, tirets uniquement" };
  }
  return { ok: true };
}
