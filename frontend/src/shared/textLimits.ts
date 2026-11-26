/**
 * Tekstiväljade vaikimisi pikkuspiirid. Samad väärtused kehtivad Ruuteri
 * valideerimises (`validateTextLengths`) ja andmebaasi triggeris `forms.enforce_text_limits`.
 * Kitsama veeru puhul anna väljale `input={{ maxLength: n }}`.
 */
export const SINGLE_LINE_MAX_LENGTH = 500;
export const MULTI_LINE_MAX_LENGTH = 4000;
/** Menetluse tulemuse väljad, mida täidab ka e-toimiku öine uuendus. */
export const PROCEEDING_OUTCOME_MAX_LENGTH = 20000;
