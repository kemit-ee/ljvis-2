// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea';
import { TextField } from './TextField';

// Päris TEDI komponendid (ilma mock'ita): piirang peab jõudma DOM-i elemendini.
describe('tekstiväljade pikkuspiirangud', () => {
  const field = () => screen.getByRole('textbox') as HTMLInputElement;

  beforeAll(() => {
    // jsdom-is puudub matchMedia, mida TEDI kasutab.
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  });
  afterEach(cleanup);

  it('TextField saab vaikimisi piirangu', () => {
    render(<TextField id="a" label="A" />);
    expect(field().maxLength).toBe(500);
  });

  it('TextField lubab piirangu üle kirjutada ja säilitab teised atribuudid', () => {
    render(
      <TextField
        id="a"
        label="A"
        input={{ maxLength: 17, inputMode: 'numeric' }}
      />,
    );
    expect(field().maxLength).toBe(17);
    expect(field().getAttribute('inputmode')).toBe('numeric');
  });

  it('Textarea saab vaikimisi piirangu', () => {
    render(<Textarea id="b" label="B" />);
    expect(field().maxLength).toBe(4000);
  });

  it('Textarea rakendab antud piirangu ega kärbi olemasolevat pikemat väärtust', () => {
    const long = 'a'.repeat(2500);
    render(
      <Textarea id="b" label="B" input={{ maxLength: 2000 }} value={long} />,
    );
    expect(field().maxLength).toBe(2000);
    expect(field().value).toBe(long);
  });
});
