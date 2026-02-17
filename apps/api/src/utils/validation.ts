import type { AnimeStatus, CatalogSort } from "@anime-app/shared";

const validStatuses: AnimeStatus[] = ["plan", "watching", "completed", "dropped"];
const validCatalogSorts: CatalogSort[] = [
  "rating_desc",
  "rating_asc",
  "title_asc"
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidStatus(status: string): status is AnimeStatus {
  return validStatuses.includes(status as AnimeStatus);
}

function isValidRating(rating: number): boolean {
  return rating >= 0 && rating <= 10;
}

function parsePositiveInt(input: unknown): number | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = Number.parseInt(input, 10);
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function parseFloatOrNull(input: unknown): number | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = Number.parseFloat(input);
  return Number.isNaN(value) ? null : value;
}

function parseCatalogSort(input: unknown): CatalogSort {
  if (typeof input === "string" && validCatalogSorts.includes(input as CatalogSort)) {
    return input as CatalogSort;
  }
  return "rating_desc";
}

export {
  isValidEmail,
  isValidRating,
  isValidStatus,
  parseCatalogSort,
  parseFloatOrNull,
  parsePositiveInt
};

