import React from "react";
import {
  IconDashboard,
  IconCash,
  IconBook,
  IconChefHat,
  IconPackage,
  IconBuilding,
  IconFileInvoice,
  IconUsers,
  IconSettings,
} from "@tabler/icons-react";

export interface NavMenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  items?: NavMenuItem[];
}

export const NAV_MENU: NavMenuItem[] = [
  {
    title: "Dashboard",
    icon: IconDashboard,
    url: "/dashboard",
  },
  {
    title: "Point of Sale",
    icon: IconCash,
    items: [
      { title: "POS", url: "/dashboard/pos", icon: IconCash },
      { title: "Kitchen Display", url: "/dashboard/kds", icon: IconChefHat },
    ],
  },
  {
    title: "Menu Management",
    icon: IconBook,
    items: [
      { title: "Menus", url: "/dashboard/menus", icon: IconBook },
      { title: "Recipes", url: "/dashboard/recipes", icon: IconChefHat },
    ],
  },
  {
    title: "Inventory",
    icon: IconPackage,
    items: [{ title: "Ingredients", url: "/dashboard/inventory", icon: IconPackage }],
  },
  {
    title: "Procurement",
    icon: IconBuilding,
    items: [
      {
        title: "Suppliers",
        url: "/dashboard/procurement/suppliers",
        icon: IconBuilding,
      },
      {
        title: "Purchase Orders",
        url: "/dashboard/procurement/po",
        icon: IconFileInvoice,
      },
    ],
  },
  {
    title: "Resellers",
    icon: IconUsers,
    url: "/dashboard/resellers",
  },
  {
    title: "Users",
    icon: IconUsers,
    url: "/dashboard/users",
  },
  {
    title: "Settings",
    icon: IconSettings,
    url: "/dashboard/settings",
  },
];
