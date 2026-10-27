// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async (orig) => {
  const stubs = await import('../../testing/tediStubs');
  return { ...(await orig<object>()), TextField: stubs.TextFieldStub, ChoiceGroup: stubs.ChoiceGroupStub };
});

import { DocRightOtherSection, getVisibility } from './DocRightOtherSection';

const d = (key: number, code: string, name: string) => ({ classifierValueKey: key, code, name }) as never;

const docs = [
  d(1, 'MOOTORSOIDUKI_LEPING', 'Leping'),
  d(2, 'VEOSE_DOKUMENDID', 'Veose dokumendid'),
  d(3, 'LIINIVEO_SOIDUPLAAN', 'Sõiduplaan'),
  d(4, 'LIINI_NUMBER', 'Liini number'),
  d(5, 'LAHETUSDEKLARATSIOON_PRAEGUNE', 'Lähetus'),
  d(6, 'UNKNOWN_CODE', 'Tundmatu'),
];

const setup = (props: Record<string, unknown> = {}) => {
  const setFieldValue = vi.fn();
  const view = render(
    <DocRightOtherSection
      transportType="Veosevedu"
      docRightOtherDocs={docs}
      otherDocuments={[]}
      setFieldValue={setFieldValue}
      {...(props as object)}
    />,
  );
  return { setFieldValue, ...view };
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('getVisibility', () => {
  it('teadaolev ja tundmatu kood', () => {
    expect(getVisibility('VEOSE_DOKUMENDID')).toBe('CARGO');
    expect(getVisibility('LIINIVEO_SOIDUPLAAN')).toBe('PASSENGER');
    expect(getVisibility('UNKNOWN')).toBe('BOTH');
  });
});

describe('DocRightOtherSection', () => {
  it('veoseveol PPA-s: veo- ja ühised dokumendid, mitte TRAM-i ega sõitjate omad', () => {
    setup();
    expect(screen.getByText('Leping')).toBeTruthy();
    expect(screen.getByText('Veose dokumendid')).toBeTruthy();
    expect(screen.getByText('Lähetus')).toBeTruthy();
    expect(screen.getByText('Tundmatu')).toBeTruthy();
    expect(screen.queryByText('Sõiduplaan')).toBeNull();
    expect(screen.queryByText('Liini number')).toBeNull();
  });

  it('sõitjateveol TRAM-is: sõitjate ja TRAM-i dokumendid, mitte lähetus', () => {
    setup({ transportType: 'Sõitjatevedu', authority: 'TRAM' });
    expect(screen.getByText('Sõiduplaan')).toBeTruthy();
    expect(screen.getByText('Liini number')).toBeTruthy();
    expect(screen.queryByText('Lähetus')).toBeNull();
    expect(screen.queryByText('Veose dokumendid')).toBeNull();
  });

  it('veoliigi muutus filtreerib salvestatud dokumendid', () => {
    const { setFieldValue } = setup({
      transportType: 'Veosevedu',
      authority: 'PPA',
      otherDocuments: [
        { documentCode: 'VEOSE_DOKUMENDID', result: 'PUUDUB' },
        { documentCode: 'LIINIVEO_SOIDUPLAAN', result: 'PUUDUB' },
        { documentCode: 'LIINI_NUMBER', result: 'PUUDUB' },
        { documentCode: 'MOOTORSOIDUKI_LEPING', result: 'PUUDUB' },
      ],
    });
    expect(setFieldValue).toHaveBeenCalledWith('otherDocuments', [
      expect.objectContaining({ documentCode: 'VEOSE_DOKUMENDID' }),
      expect.objectContaining({ documentCode: 'MOOTORSOIDUKI_LEPING' }),
    ]);
    cleanup();
    const t2 = setup({
      transportType: 'Sõitjatevedu',
      authority: 'TRAM',
      otherDocuments: [
        { documentCode: 'LAHETUSDEKLARATSIOON_VARASEM', result: 'PUUDUB' },
        { documentCode: 'LIINI_NUMBER', result: 'PUUDUB' },
        { documentCode: 'VEOSE_DOKUMENDID', result: 'PUUDUB' },
      ],
    });
    expect(t2.setFieldValue).toHaveBeenCalledWith('otherDocuments', [expect.objectContaining({ documentCode: 'LIINI_NUMBER' })]);
  });

  it('tulemuse valimine lisab uue kirje või asendab olemasoleva', () => {
    const { setFieldValue } = setup({ idPrefix: 'p-' });
    fireEvent.click(screen.getByTestId('p-1-PUUDUB'));
    expect(setFieldValue).toHaveBeenLastCalledWith('otherDocuments', [
      { documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'PUUDUB', notes: '' },
    ]);
    cleanup();
    const again = setup({ otherDocuments: [{ documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'PUUDUB', notes: 'n' }] });
    fireEvent.click(screen.getByTestId('1-NOUETEKOHANE'));
    expect(again.setFieldValue).toHaveBeenLastCalledWith('otherDocuments', [
      { documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'NOUETEKOHANE', notes: 'n' },
    ]);
  });

  it('märkuse lahtri avamine, kirjutamine ja kustutamine', () => {
    const { setFieldValue } = setup();
    const commentBtns = screen.getAllByText('forms.otherDocs.addRemark');
    fireEvent.click(commentBtns[0]);
    fireEvent.change(screen.getByTestId('remark-1'), { target: { value: 'märkus' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('otherDocuments', [
      { documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'EI_KONTROLLITUD', notes: 'märkus' },
    ]);
    fireEvent.click(screen.getByText('common.remove'));
    expect(screen.queryByTestId('remark-1')).toBeNull();
    fireEvent.click(commentBtns[0]);
    fireEvent.click(commentBtns[0]);
    expect(screen.queryByTestId('remark-1')).toBeNull();
  });

  it('olemasolev märkus avab lahtri ja kustutamine nullib selle', () => {
    const { setFieldValue } = setup({ otherDocuments: [{ documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'PUUDUB', notes: 'vana' }] });
    expect((screen.getByTestId('remark-1') as HTMLInputElement).value).toBe('vana');
    fireEvent.change(screen.getByTestId('remark-1'), { target: { value: 'uus' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('otherDocuments', [expect.objectContaining({ result: 'PUUDUB', notes: 'uus' })]);
    fireEvent.click(screen.getByText('common.remove'));
    expect(setFieldValue).toHaveBeenLastCalledWith('otherDocuments', [expect.objectContaining({ notes: '' })]);
  });

  it('readOnly peidab muutmisnupud', () => {
    setup({ readOnly: true, otherDocuments: [{ documentCode: 'MOOTORSOIDUKI_LEPING', documentName: 'Leping', result: 'PUUDUB', notes: 'vana' }] });
    expect(screen.queryByText('forms.otherDocs.addRemark')).toBeNull();
    expect(screen.queryByText('common.remove')).toBeNull();
    expect((screen.getByTestId('remark-1') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('1-PUUDUB') as HTMLInputElement).disabled).toBe(true);
  });

  it('tundmatu klassifikaatori võtmega toimingud ei tee midagi (puuduva kirje kaitse)', () => {
    const { setFieldValue } = setup({ docRightOtherDocs: [d(1, 'MOOTORSOIDUKI_LEPING', 'Leping')] });
    setFieldValue.mockClear();
    fireEvent.click(screen.getByText('forms.otherDocs.addRemark'));
    fireEvent.click(screen.getByText('common.remove'));
    expect(setFieldValue).toHaveBeenCalledTimes(0);
  });
});
