/** Faili üleslaadimise veakoodid (DSL `templates/files/upload`) ja nende tõlkevõtmed. */
const UPLOAD_ERROR_KEYS: Record<string, string> = {
  FILE_TYPE_NOT_ALLOWED: 'forms.shared.files.error_type',
  FILE_TOO_LARGE: 'forms.shared.files.error_too_large',
  FILE_REJECTED: 'forms.shared.files.error_rejected',
};

/** Tõlkevõti, kui server lükkas faili tagasi kasutajale selgitataval põhjusel, muidu `null`. */
export function uploadErrorKey(err: unknown): string | null {
  const body = (err as { body?: unknown } | null | undefined)?.body;
  const code = (body as { error?: unknown } | null | undefined)?.error;
  return typeof code === 'string' && Object.hasOwn(UPLOAD_ERROR_KEYS, code)
    ? UPLOAD_ERROR_KEYS[code]
    : null;
}
