import React from 'react';
import {
  IconDashboard,
  IconCash,
  IconBook,
  IconChefHat,
  IconCategory,
  IconPackage,
  IconBuilding,
  IconFileInvoice,
  IconUsers,
  IconSettings,
  IconAdjustments,
} from '@tabler/icons-react';

export interface NavMenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  items?: NavMenuItem[];
}

export const NAV_MENU: NavMenuItem[] = [
  {
    title: 'Dashboard',
    icon: IconDashboard,
    url: '/dashboard',
  },
  {
    title: 'Point of Sale',
    icon: IconCash,
    items: [
      { title: 'POS', url: '/dashboard/pos', icon: IconCash },
      { title: 'Kitchen Display', url: '/dashboard/kds', icon: IconChefHat },
    ],
  },
  {
    title: 'Menu Management',
    icon: IconBook,
    items: [
      { title: 'Categories', url: '/dashboard/menus/categories', icon: IconCategory },
      { title: 'Menus', url: '/dashboard/menus', icon: IconBook },
      { title: 'Recipes', url: '/dashboard/recipes', icon: IconChefHat },
    ],
  },
  {
    title: 'Inventory',
    icon: IconPackage,
    items: [
      { title: 'Ingredients', url: '/dashboard/inventory', icon: IconPackage },
      {
        title: 'Stock Adjustments',
        url: '/dashboard/inventory/stock-adjustments',
        icon: IconAdjustments,
      },
    ],
  },
  {
    title: 'Procurement',
    icon: IconBuilding,
    items: [
      {
        title: 'Suppliers',
        url: '/dashboard/procurements/suppliers',
        icon: IconBuilding,
      },
      {
        title: 'Purchase Orders',
        url: '/dashboard/procurements/purchase-orders',
        icon: IconFileInvoice,
      },
    ],
  },
  {
    title: 'Resellers',
    icon: IconUsers,
    url: '/dashboard/resellers',
  },
  {
    title: 'Users',
    icon: IconUsers,
    url: '/dashboard/users',
  },
  {
    title: 'Settings',
    icon: IconSettings,
    url: '/dashboard/settings',
  },
];
