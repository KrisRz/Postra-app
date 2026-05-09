'use client';

import { Button } from '@gitroom/react/form/button';
import { useCallback } from 'react';

export const ClosePreviewButton = () => {
  const close = useCallback(() => {
    window.close();
  }, []);
  return (
    <Button onClick={close} className="bg-btnSimple text-btnText">
      Zamknij
    </Button>
  );
};
