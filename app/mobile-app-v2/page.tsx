import type { Metadata } from 'next';
import MobileAppScreenPage from '../mobile-app/MobileAppScreenPage';

export const metadata: Metadata = {
  title: 'Mobile App v2 Preview | ThingyCare',
  robots: { index: false, follow: false },
};

export default function MobileAppV2Page() {
  return <MobileAppScreenPage variant="quote" />;
}
