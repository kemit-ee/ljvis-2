import { useState } from 'react';
import { Button } from '@tedi-design-system/react/tedi';

type ButtonProps = React.ComponentProps<typeof Button>;

interface AsyncButtonProps extends Omit<ButtonProps, 'onClick' | 'isLoading'> {
  onClick: () => Promise<unknown> | void;
}

/**
 * Button that disables itself and shows a spinner while its async `onClick`
 * handler is in flight, preventing duplicate submissions (e.g. double-click
 * on Save). Safe to use with synchronous handlers too.
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
      disabled={disabled || isLoading}
    />
  );
}
