// ساختار Mock درخت منو — فقط برای پیش‌نمایش UI مدیریت منو.
// این ساختار جایگزین Master Menu واقعی پروژه نیست و صرفاً شکل داده‌ای
// نمونه برای تست Tree/DnD/Permission UI است.

export interface MenuNode {
  id: string;
  title: string;
  icon?: import("../components/ui/Icon").IconName;
  route?: string;
  status: "active" | "inactive";
  order: number;
  portal: string;
  children?: MenuNode[];
}

export const mockMenuTree: MenuNode[] = [
  {
    id: "m-1", title: "داشبورد", icon: "home", route: "/master/dashboard", status: "active", order: 1, portal: "همه پرتال‌ها",
  },
  {
    id: "m-2", title: "مدیریت سازمان", icon: "building", status: "active", order: 2, portal: "مدیریت",
    children: [
      { id: "m-2-1", title: "شرکت‌ها", route: "/org/companies", status: "active", order: 1, portal: "مدیریت" },
      { id: "m-2-2", title: "شعبه‌ها", route: "/org/branches", status: "active", order: 2, portal: "مدیریت" },
      { id: "m-2-3", title: "برندها", route: "/org/brands", status: "active", order: 3, portal: "مدیریت" },
      { id: "m-2-4", title: "کارمندان", route: "/org/employees", status: "inactive", order: 4, portal: "مدیریت" },
    ],
  },
  {
    id: "m-3", title: "تجارت", icon: "bag", status: "active", order: 3, portal: "فروش",
    children: [
      { id: "m-3-1", title: "محصولات", route: "/commerce/products", status: "active", order: 1, portal: "فروش" },
      { id: "m-3-2", title: "سفارش‌ها", route: "/commerce/orders", status: "active", order: 2, portal: "فروش" },
      {
        id: "m-3-3", title: "فروش", status: "active", order: 3, portal: "فروش",
        children: [
          { id: "m-3-3-1", title: "گزارش فروش", route: "/commerce/sales", status: "active", order: 1, portal: "فروش" },
        ],
      },
    ],
  },
  {
    id: "m-4", title: "اعتبار و تسهیلات", icon: "card", status: "active", order: 4, portal: "اعتبار",
    children: [
      { id: "m-4-1", title: "درخواست‌های اعتبار", route: "/credit/requests", status: "active", order: 1, portal: "اعتبار" },
      { id: "m-4-2", title: "پرونده‌های تسهیلات", route: "/loans/cases", status: "active", order: 2, portal: "اعتبار" },
    ],
  },
  { id: "m-5", title: "گزارش‌ها", icon: "chart", route: "/reports", status: "active", order: 5, portal: "همه پرتال‌ها" },
  { id: "m-6", title: "تنظیمات", icon: "settings", route: "/settings", status: "active", order: 6, portal: "مدیریت" },
];
