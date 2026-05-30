'use client';

import { ComingSoon } from '@gitroom/frontend/components/auth/coming-soon';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(<ComingSoon />, document.body);
}
