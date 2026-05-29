import * as React from 'react';

export function useWindowSize() {
  const [size, setSize] = React.useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  React.useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
