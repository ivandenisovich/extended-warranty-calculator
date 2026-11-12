import type { Metadata } from 'next';
import MobileAppScreenPage from './MobileAppScreenPage';

export const metadata: Metadata = {
  title: 'Mobile App Preview | ThingyCare',
  robots: { index: false, follow: false },
};

export default function MobileAppPage() {
  return <MobileAppScreenPage variant="grid" />;
}
