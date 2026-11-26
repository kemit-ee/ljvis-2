/* eslint-disable no-restricted-imports -- see on ainus koht, kus TEDI Textarea't otse kasutatakse */
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import {
  Textarea as TediTextarea,
  type TextareaProps,
} from '@tedi-design-system/react/tedi';
import { MULTI_LINE_MAX_LENGTH } from '../textLimits';

/**
 * TEDI Textarea, millel on alati pikkuspiirang.
 *
 * TEDI Textarea haldab `input` omadust ise, seetõttu seatakse `maxLength`
 * otse `<textarea>` elemendile. Brauser ei kärbi olemasolevat pikemat väärtust.
 */
export function Textarea(props: TextareaProps) {
  const box = useRef<HTMLDivElement>(null);
  const maxLength =
    (props.input as TextareaHTMLAttributes<HTMLTextAreaElement> | undefined)
      ?.maxLength ?? MULTI_LINE_MAX_LENGTH;

  useLayoutEffect(() => {
    const element = box.current?.querySelector('textarea');
    if (element) element.maxLength = maxLength;
  });

  return (
    <div ref={box} className="d-contents">
      <TediTextarea {...props} />
    </div>
  );
}
