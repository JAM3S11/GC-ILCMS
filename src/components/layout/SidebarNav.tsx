import React, { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SidebarFolds } from './useSidebarFolds';

/* ---------------------------------------------------------------------------
 * SidebarNav — generic, data-driven navigation for any <Sidebar>.
 * Give it groups of items, the active id and a select handler; it renders
 * labels, icons, tooltips (when collapsed), count badges, foldable groups and
 * one level of sub-items (e.g. one register per laboratory).
 * --------------------------------------------------------------------------- */

export type SidebarNavSubItem = {
  id: string;
  label: string;
  badge?: number;
  badgeTone?: 'alert' | 'count';
};

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  /** 'alert' (default) for things needing attention; 'count' for neutral totals. */
  badgeTone?: 'alert' | 'count';
  /** Sub-pages shown indented under the item; selecting the parent opens the current or first one. */
  children?: SidebarNavSubItem[];
};

export type SidebarNavGroup = {
  title?: string;
  items: SidebarNavItem[];
  /** Render the group label as a fold toggle. */
  collapsible?: boolean;
};

// Active item: brand tint + accent bar; WCAG AA text contrast in both themes.
const itemClass =
  'relative h-9 gap-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 ' +
  'dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white ' +
  'data-[active=true]:bg-amber-50 data-[active=true]:text-amber-800 data-[active=true]:font-semibold ' +
  'dark:data-[active=true]:bg-amber-400/10 dark:data-[active=true]:text-amber-200 ' +
  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-1 data-[active=true]:before:rounded-r data-[active=true]:before:bg-amber-500 data-[active=true]:before:content-[''] " +
  'group-data-[collapsible=icon]:data-[active=true]:before:hidden ' +
  '[&>svg]:size-[18px] [&>svg]:text-slate-500 dark:[&>svg]:text-slate-400 ' +
  'data-[active=true]:[&>svg]:text-amber-700 dark:data-[active=true]:[&>svg]:text-amber-300';

const subItemClass =
  'h-8 text-[13px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white ' +
  'data-[active=true]:bg-amber-50 data-[active=true]:font-semibold data-[active=true]:text-amber-800 ' +
  'dark:data-[active=true]:bg-amber-400/10 dark:data-[active=true]:text-amber-200';

const labelClass = 'text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

const badgeClass = (tone: SidebarNavItem['badgeTone']) =>
  tone === 'count'
    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
    : 'bg-rose-600 text-white peer-data-[active=true]/menu-button:text-white';

const formatBadge = (n: number) => (n > 99 ? '99+' : n);

// Fold-state keys, namespaced so a group title can never clash with an item id.
const groupKey = (title: string) => `group:${title}`;
const itemKey = (id: string) => `item:${id}`;

interface SidebarNavProps {
  groups: SidebarNavGroup[];
  activeId?: string;
  onSelect: (id: string) => void;
  /** Remembers folded groups and sub-menus; without it they all start open each visit. */
  folds?: SidebarFolds;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ groups, activeId, onSelect, folds }) => {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const iconRail = state === 'collapsed' && !isMobile;

  const foldProps = (key: string) =>
    folds
      ? { open: folds.isOpen(key), onOpenChange: (open: boolean) => folds.setOpen(key, open) }
      : { defaultOpen: true };

  // Arriving at a page inside a folded section (from search, a dashboard
  // button...) unfolds it, so a remembered fold never hides where the user is.
  useEffect(() => {
    if (!folds || !activeId) return;
    groups.forEach((group) => {
      const item = group.items.find((entry) => entry.id === activeId || entry.children?.some((child) => child.id === activeId));
      if (!item) return;
      if (group.collapsible && group.title && !folds.isOpen(groupKey(group.title))) folds.setOpen(groupKey(group.title), true);
      if (item.id !== activeId && !folds.isOpen(itemKey(item.id))) folds.setOpen(itemKey(item.id), true);
    });
    // Only on navigation: folding the current section by hand must stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const select = (id: string) => {
    onSelect(id);
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (item: SidebarNavItem) => {
    const Icon = item.icon;
    const children = item.children ?? [];
    const childActive = children.some((child) => child.id === activeId);
    // On the icon rail the sub-items are hidden, so the parent carries the highlight.
    const isActive = item.id === activeId || (childActive && iconRail);

    if (children.length === 0) {
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.badge ? `${item.label} (${item.badge})` : item.label}
            aria-current={isActive ? 'page' : undefined}
            className={itemClass}
            onClick={() => select(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
          {!!item.badge && (
            <SidebarMenuBadge className={`top-2 rounded-full px-1.5 text-[10px] font-semibold ${badgeClass(item.badgeTone)}`}>
              {formatBadge(item.badge)}
            </SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      );
    }

    return (
      <Collapsible key={item.id} asChild {...foldProps(itemKey(item.id))} className="group/subnav">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
              className={itemClass}
              // On the icon rail there is nothing to unfold, so go straight to the register.
              onClick={() => iconRail && select(children.find((c) => c.id === activeId)?.id ?? children[0].id)}
            >
              <Icon />
              <span>{item.label}</span>
              <ChevronRight
                aria-hidden="true"
                className="ml-auto !size-3.5 transition-transform group-data-[state=open]/subnav:rotate-90"
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 border-slate-200 pr-0 dark:border-slate-700">
              {children.map((child) => (
                <SidebarMenuSubItem key={child.id} className="relative">
                  <SidebarMenuSubButton asChild isActive={child.id === activeId} className={subItemClass}>
                    <button
                      type="button"
                      aria-current={child.id === activeId ? 'page' : undefined}
                      onClick={() => select(child.id)}
                      className="w-full cursor-pointer pr-9"
                    >
                      <span className="truncate">{child.label}</span>
                    </button>
                  </SidebarMenuSubButton>
                  {!!child.badge && (
                    <span
                      className={`pointer-events-none absolute right-1 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${badgeClass(child.badgeTone)}`}
                    >
                      {formatBadge(child.badge)}
                    </span>
                  )}
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <>
      {groups.map((group, index) => {
        if (group.items.length === 0) return null;
        const key = group.title ?? `group-${index}`;
        const menu = <SidebarMenu className="gap-0.5">{group.items.map(renderItem)}</SidebarMenu>;

        if (group.collapsible && group.title) {
          return (
            <Collapsible key={key} {...foldProps(groupKey(group.title))} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild className={`${labelClass} hover:text-slate-700 dark:hover:text-slate-200`}>
                  <CollapsibleTrigger>
                    {group.title}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>{menu}</SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        }

        return (
          <SidebarGroup key={key}>
            {group.title && <SidebarGroupLabel className={labelClass}>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>{menu}</SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
};
