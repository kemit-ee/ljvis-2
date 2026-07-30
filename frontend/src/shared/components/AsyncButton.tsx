import { useState } from 'react';
import { Button } from '@tedi-design-system/react/tedi';

type ButtonProps = React.ComponentProps<typeof Button>;

interface AsyncButtonProps extends Omit<ButtonProps, 'onClick' | 'isLoading'> {
  onClick: () => Promise<unknown> | void;
}

/**
 * Button that uses TEDI's native isLoading state while its async `onClick`
 * handler is in flight: text becomes transparent (button width stays fixed),
 * a spinner appears on the left, and the button remains visually active.
 * Prevents duplicate submissions via an in-flight guard.
 */
export function AsyncButton({ onClick, disabled, ...rest }: AsyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...rest}
      onClick={handleClick}
      isLoading={isLoading}
      disabled={disabled}
    />
  );
}
