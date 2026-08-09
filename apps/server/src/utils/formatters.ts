import { pick } from "lodash";

/**
 * Converts a string into a URL-friendly slug.
 * @param value - The string to be slugify.
 * @returns The slugify string.
 * @example
 * ```ts
 * slugify("Hello World!"); // "hello-world"
 * slugify("Café del Mar"); // "cafe-del-mar"
 * slugify("  Multiple   Spaces  "); // "multiple-spaces"
 * ```
 */
export default function slugify(value: string) {
  if (!value) return "";
  return (
    value
      .normalize("NFKD") // split accented characters into their base characters and diacritical marks
      // eslint-disable-next-line security/detect-unsafe-regex
      .replaceAll(/[\u{0300}-\u{036F}]/gu, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
      .trim() // trim leading or trailing whitespace
      .toLowerCase() // convert to lowercase
      .replaceAll(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
      .replaceAll(/\s+/g, "-") // replace spaces with hyphens
      .replaceAll(/-+/g, "-")
  ); // remove consecutive hyphens
}

export const pickUser = (user: unknown) => {
  if (!user) return {};
  return pick(user, [
    "_id",
    "email",
    "username",
    "displayName",
    "avatar",
    "role",
    "isActive",
    "createdAt",
    "updatedAt",
  ]);
};
