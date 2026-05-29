export function hasStatus(e: unknown, status: number): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === status;
}
