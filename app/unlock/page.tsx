import type { Metadata } from 'next';
import { Suspense } from 'react';
import UnlockForm from './UnlockForm';

export const metadata: Metadata = {
  title: 'Private access | ThingyCare',
  robots: { index: false, follow: false },
};

export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockForm />
    </Suspense>
  );
}
