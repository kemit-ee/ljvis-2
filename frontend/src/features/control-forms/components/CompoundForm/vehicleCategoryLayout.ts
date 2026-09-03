import { OTHER } from '../../../../constants/constants';

// Mootorsõiduki kategooria raadionupud paigutatakse 12-veerulisse ruudustikku:
//   rida 1: (a) N2            (b) N3            → laius 6 + 6
//   rida 2: (e) M2            (f) M3            → laius 6 + 6
//   rida 3: (g) T1b (h) T2b (i) T3b (j) T4.1b (k) T4.2b (l) T4.3b → laius 2 × 6
//   rida 4: (m) Muu                            → laius 12
// Tundmatu kood satub omaette reale (laius 12).
const VEHICLE_CATEGORY_COL_WIDTH = {
  A_2012: 6, // (a) N2 (3,5 – 12 t)
  B_2012: 6, // (b) N3 (üle 12 t)
  E_2012: 6, // (e) M2 (rohkem kui 9 istekohta kuni 5 t)
  F_2012: 6, // (f) M3 (rohkem kui 9 istekohta rohkem kui 5 t)
  G3_2012: 2, // (g) T1b
  H2_2012: 2, // (h) T2b
  I_2012: 2, // (i) T3b
  J_2012: 2, // (j) T4.1b
  K_2012: 2, // (k) T4.2b
  L_2012: 2, // (l) T4.3b
  [OTHER.VEHICLE_CATEGORY]: 12, // (m) Muu
} as const satisfies Record<string, 2 | 6 | 12>;

// Kitsal ekraanil (mobiil / avatud vahekaardid kitsendavad vormi) ei mahu
// "raadionupp + silt" 2- ega 6-veerulisse lahtrisse kõrvuti ja silt kukub nupu
// alla. Seepärast anname mobiilis igale valikule terve rea (laius 12).
export const vehicleCategoryColWidth = (
  code: string,
  isDesktop = true,
): 2 | 6 | 12 =>
  isDesktop
    ? ((VEHICLE_CATEGORY_COL_WIDTH as Record<string, 2 | 6 | 12>)[code] ?? 12)
    : 12;
