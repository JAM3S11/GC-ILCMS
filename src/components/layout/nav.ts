export interface PublicNavItem {
  label: string;
  href: string;
  children?: PublicNavItem[];
}

export const PUBLIC_NAV_ITEMS: PublicNavItem[] = [
  { label: 'Overview', href: '#overview' },
  { label: 'Verify', href: '#verify' },
  { label: 'FAQ', href: '#faqs' },
];