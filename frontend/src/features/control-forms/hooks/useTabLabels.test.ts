import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import type { CompoundForm, Trailer } from '../types';
import { buildTabLabels, resolveCompoundTrailersList } from './useTabLabels';

const t = ((key: string, opts?: { number?: number }) =>
  opts?.number ? `${key}#${opts.number}` : key) as unknown as TFunction;

const trailer = (regNr?: string) => ({ regNr }) as Trailer;

describe('resolveCompoundTrailersList', () => {
  it('eelistab formiku haagiseid', () => {
    const list = [trailer('1')];
    expect(resolveCompoundTrailersList(list, null)).toBe(list);
  });
  it('kasutab vormi massiivi', () => {
    const form = { trailers: [trailer('2')] } as unknown as CompoundForm;
    expect(resolveCompoundTrailersList([], form)).toEqual([trailer('2')]);
  });
  it('parsib JSON-stringi', () => {
    const form = { trailers: JSON.stringify([trailer('3')]) } as unknown as CompoundForm;
    expect(resolveCompoundTrailersList(undefined, form)).toEqual([trailer('3')]);
  });
  it('tagastab tühja, kui andmeid pole', () => {
    expect(resolveCompoundTrailersList(undefined, undefined)).toEqual([]);
    expect(resolveCompoundTrailersList(null, {} as CompoundForm)).toEqual([]);
  });
});

describe('buildTabLabels', () => {
  it('ehitab haagiste sildid regNr-iga ja ilma', () => {
    const labels = buildTabLabels([trailer('123ABC'), trailer()], t);
    expect(labels['tab-trailer-technical-check-0']).toBe(
      'FORMS.COMPOUND.TRAILERNUMBER#1 (123ABC) – forms.compound.trailerTechnicalTab',
    );
    expect(labels['tab-trailer-technical-check-1']).toBe(
      'FORMS.COMPOUND.TRAILERNUMBER#2 – forms.compound.trailerTechnicalTab',
    );
  });
  it('kasutab kohandatud või vaikimisi komposiitvormi silti', () => {
    expect(buildTabLabels([], t, 'Minu')['tab-compound']).toBe('Minu');
    expect(buildTabLabels([], t)['tab-compound']).toBe('forms.compound_form');
    expect(buildTabLabels([], t)['tab-adr']).toBe('forms.adr.title');
  });
});
