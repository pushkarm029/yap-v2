import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Reusable navigation item component
 * Can be used in Sidebar, MobileNav, and Drawer
 */
export default function NavItem({
  icon: Icon,
  label,
  href,
  badge,
  onClick,
  className = 'flex items-center gap-3 px-3 py-3 rounded-full transition-colors hover:bg-gray-100',
}: NavItemProps) {
  const content = (
    <>
      <div className="relative">
        <Icon size={24} />
        {badge}
      </div>
      <span className="text-base font-medium tracking-tight">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
