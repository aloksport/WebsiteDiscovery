/**
 * Turns a free-text name into a lowercase, hyphenated, url-safe slug with
 * no spaces, e.g. "SED Website - Client Discovery!" -> "sed-website-client-discovery"
 */
export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumeric -> single hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // collapse repeated hyphens
}
