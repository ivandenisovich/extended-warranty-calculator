import Link from 'next/link';

// Top-right navigation links shared by every page header. `active` marks the
// current page so it renders solid white while the others stay dimmed.
export default function SiteNav({
  active,
}: {
  active?: 'calculator' | 'mobile-app' | 'mobile-app-v2';
}) {
  const links: { href: string; label: string; key: 'calculator' | 'mobile-app' | 'mobile-app-v2' }[] = [
    { href: '/', label: 'Calculator', key: 'calculator' },
    { href: '/mobile-app', label: 'Mobile App', key: 'mobile-app' },
    { href: '/mobile-app-v2', label: 'Mobile App v2', key: 'mobile-app-v2' },
  ];
  return (
    <nav className="flex items-center gap-4">
      {links.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          className={`text-xs font-semibold underline-offset-2 transition-colors ${
            active === l.key
              ? 'text-white'
              : 'text-white/70 hover:text-white underline'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
