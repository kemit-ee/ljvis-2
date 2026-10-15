import { useState } from 'react';

/**
 * Akordioniploki olek, mis on alati avatud, kui plokis on mõni rikkumine
 * valitud — valitud rikkumine peab olema kogu aeg näha. Ilma valikuta
 * avab/sulgeb plokki kasutaja.
 *
 * Kasutus: `<AccordionItem {...useExpandedWhenSelected(hasSelection)}>`.
 */
export function useExpandedWhenSelected(hasSelection: boolean, defaultExpanded = false) {
  const [open, setOpen] = useState(defaultExpanded);
  return { expanded: hasSelection || open, onToggle: setOpen };
}
