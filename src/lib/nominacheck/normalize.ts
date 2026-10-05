import type {
  ExtractedField,
  MoneyField,
  SourceReference,
} from "@/types/nominacheck";
import type { RawField, RawMoney } from "@/lib/nominacheck/schema";

export function normalizeDocumentNumber(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 8) return null;

  const padded = digits.padStart(8, "0");
  const weights = [2, 9, 8, 7, 6, 3, 4];
  const sum = weights.reduce(
    (total, weight, index) => total + Number(padded[index]) * weight,
    0,
  );
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return Number(padded[7]) === expectedCheckDigit ? digits : null;
}

export function normalizeName(value: string | null) {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLocaleLowerCase("es")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .join(" ");
}

export function normalizeText(value: string | null) {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLocaleUpperCase("es")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

export function normalizePeriod(value: string | null) {
  if (!value) return null;
  const iso = value.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, "0")}`;

  const reversed = value.match(/\b(0?[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (reversed) return `${reversed[2]}-${reversed[1]!.padStart(2, "0")}`;

  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const clean = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const year = clean.match(/\b(20\d{2})\b/)?.[1];
  const monthIndex = months.findIndex((month) => clean.includes(month));
  return year && monthIndex >= 0
    ? `${year}-${String(monthIndex + 1).padStart(2, "0")}`
    : normalizeText(value);
}

export function parseMoney(value: string | null) {
  if (!value) return { value: null, separators: null };
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) {
    return { value: null, separators: null };
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSeparator =
    lastComma >= 0 && lastDot >= 0
      ? lastComma > lastDot
        ? ","
        : "."
      : lastComma >= 0
        ? cleaned.length - lastComma - 1 <= 2
          ? ","
          : null
        : lastDot >= 0 && cleaned.length - lastDot - 1 <= 2
          ? "."
          : null;

  let canonical = cleaned;
  if (decimalSeparator) {
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    canonical = canonical.split(thousandsSeparator).join("");
    canonical = canonical.replace(decimalSeparator, ".");
  } else {
    canonical = canonical.replace(/[.,]/g, "");
  }

  const parsed = Number(canonical);
  return {
    value: Number.isFinite(parsed) ? parsed : null,
    separators:
      decimalSeparator === ","
        ? "URUGUAYO"
        : decimalSeparator === "."
          ? "INTERNACIONAL"
          : "SIN_DECIMALES",
  };
}

export function sourceFromRaw(
  documentId: string,
  raw: RawField,
): SourceReference {
  return {
    document_id: documentId,
    page: raw.page,
    evidence: raw.evidence,
  };
}

export function fieldFromRaw<T>(
  documentId: string,
  raw: RawField,
  normalize: (value: string | null) => T | null,
): ExtractedField<T> {
  return {
    original: raw.original,
    normalized: normalize(raw.original),
    confidence: raw.confidence,
    source: sourceFromRaw(documentId, raw),
    alternatives: raw.alternatives?.map((alternative) => ({
      value: normalize(alternative.value),
      confidence: alternative.confidence,
      evidence: alternative.evidence,
    })),
  };
}

export function textField(documentId: string, raw: RawField) {
  return fieldFromRaw(documentId, raw, normalizeText);
}

export function originalTextField(documentId: string, raw: RawField) {
  return fieldFromRaw(documentId, raw, (value) => value?.trim() || null);
}

export function normalizeAccount(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/[^\p{L}\p{N}]/gu, "").toUpperCase();
  return normalized || null;
}

export function moneyField(documentId: string, raw: RawMoney): MoneyField {
  const parsed = parseMoney(raw.original);
  return {
    ...fieldFromRaw(documentId, raw, () => parsed.value),
    currency: raw.currency,
    separators: parsed.separators,
  };
}

export function nameSimilarity(left: string | null, right: string | null) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const a = left.split(" ");
  const b = right.split(" ");
  const shared = a.filter((part) =>
    b.some((candidate) => levenshtein(part, candidate) <= 1),
  ).length;
  return shared / Math.max(a.length, b.length);
}

function levenshtein(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        (current[column - 1] ?? 0) + 1,
        (previous[column] ?? 0) + 1,
        (previous[column - 1] ?? 0) +
          (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
}
