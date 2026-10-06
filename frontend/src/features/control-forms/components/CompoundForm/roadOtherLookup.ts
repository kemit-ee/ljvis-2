export interface OtherRoadValue {
  code: string;
  name: string;
  isValid?: boolean;
}

export function findOtherRoadName(
  roads: OtherRoadValue[],
  roadNumber: string,
): string | undefined {
  return roads.find(
    (road) =>
      road.isValid !== false && road.code.trim() === roadNumber.trim(),
  )?.name;
}
