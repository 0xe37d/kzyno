'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  /** left-hand nav (just after the logo) */
  const primary = [
    { href: '/arcade',    label: 'Arcade'    },
    { href: '/dashboard', label: 'Dashboard'}
  ];

  return (
    <header className="flex items-center gap-8 px-6 py-4 bg-gray-900 border-b border-gray-800">
      {/* logo  */}
      <Link href="/" className="flex items-center gap-2">
        {/* Replace with your own asset; this sits in /public */}
        <Image src="/logo.svg" alt="KZYNO" width={32} height={32} priority />
        <span className="font-semibold text-lg">KZYNO</span>
      </Link>

      {/* primary links */}
      <nav className="flex items-center gap-6">
        {primary.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`hover:text-yellow-400 transition-colors ${
              pathname.startsWith(href) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* push everything else rightward */}
      <div className="ml-auto">
        <Link
          href="/about"
          className={`hover:text-yellow-400 transition-colors ${
            pathname === '/about' ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          About
        </Link>
      </div>
    </header>
  );
}
