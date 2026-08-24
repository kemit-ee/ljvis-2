import { useState, useEffect } from 'react';

export function useContainerWidth(isDesktop: boolean, openTabs: unknown[]): number | undefined {
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const footer = document.querySelector('[data-name="footer"]');
    const sidenav = document.querySelector('[data-name="sidenav"]');

    if (!footer || (!isDesktop && !sidenav)) return;

    const update = () => {
      setContainerWidth(footer.clientWidth - (sidenav ? sidenav.clientWidth : 0) - 64);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    if (sidenav) observer.observe(sidenav);
    return () => observer.disconnect();
  }, [isDesktop, openTabs.length]);

  return containerWidth;
}
