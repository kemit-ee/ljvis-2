/**
 * Removes newline and carriage-return characters from a free-text form field
 * value and trims leading/trailing whitespace.
 *
 * DMapper Handlebars templates embed text values directly inside JSON string
 * literals (e.g. `"notes": "{{this.notes}}"`).  A literal newline inside a
 * JSON string violates RFC 8259 §7 and causes the JSON parser to reject the
 * response, preventing the form from opening.  Sanitizing at onChange level
 * keeps the stored value clean without requiring any read-side transformation.
 *
 * `\n` and `\r` are replaced with a single space so that multi-line content
 * remains readable as a single paragraph rather than losing the word
 * boundaries.  Consecutive spaces are collapsed to one.  Returns an empty
 * string when the input is null or undefined.
 */
export function sanitizeText(value: string | null | undefined): string {
  if (value == null) return '';
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}
