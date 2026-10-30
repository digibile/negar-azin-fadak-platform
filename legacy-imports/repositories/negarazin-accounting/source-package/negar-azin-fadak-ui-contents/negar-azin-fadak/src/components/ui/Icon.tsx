import React from "react";
import {
  Home, Building2, MapPin, Tag, Store, Boxes, Network, Users, UserRound, Briefcase,
  ShoppingBag, Package, Receipt, TrendingUp, ShoppingCart, Warehouse, Repeat,
  AlertTriangle, CreditCard, Banknote, Handshake, BarChart3, Bell, Palette,
  Search, Settings, Shield, FileText, Truck, Landmark, Wallet, Heart, LogOut,
  LayoutDashboard, ListTree, Paintbrush, Gauge, ClipboardList, CalendarDays,
  Activity, Plus, X, Filter, Download, Printer, ChevronDown, ChevronLeft,
  ChevronRight, MoreHorizontal, Check, Trash2, Pencil, Eye, Menu as MenuIcon,
  Building, ListChecks, LayoutGrid, ShieldCheck, UserCog, PieChart, Percent,
  KeyRound, History, LogIn, ScanFace, Fingerprint, Smartphone, Lock, Star,
  Grid3x3, ClipboardCheck, Users2, HandCoins, FileSpreadsheet, Layers,
  ScrollText, MessageSquare, LifeBuoy, Sparkles, ChevronsRight, GripVertical,
  FolderTree, Rows3, Table2, Wallet2, CircleDollarSign, Coins, ReceiptText,
} from "lucide-react";

export const ICONS = {
  home: Home, building: Building2, "building-plain": Building, map: MapPin, tag: Tag, store: Store,
  boxes: Boxes, network: Network, users: Users, "user-round": UserRound, briefcase: Briefcase,
  bag: ShoppingBag, package: Package, receipt: Receipt, trend: TrendingUp, cart: ShoppingCart,
  warehouse: Warehouse, repeat: Repeat, alert: AlertTriangle, card: CreditCard, cash: Banknote,
  handshake: Handshake, chart: BarChart3, bell: Bell, palette: Palette, search: Search,
  settings: Settings, shield: Shield, "shield-check": ShieldCheck, file: FileText, truck: Truck,
  bank: Landmark, wallet: Wallet, wallet2: Wallet2, heart: Heart, logout: LogOut,
  dashboard: LayoutDashboard, "list-tree": ListTree, "folder-tree": FolderTree, brush: Paintbrush,
  gauge: Gauge, clipboard: ClipboardList, "clipboard-check": ClipboardCheck, calendar: CalendarDays,
  activity: Activity, plus: Plus, close: X, filter: Filter, download: Download, print: Printer,
  chevronDown: ChevronDown, chevronBack: ChevronRight, chevronFwd: ChevronLeft,
  more: MoreHorizontal, check: Check, trash: Trash2, edit: Pencil, eye: Eye, menu: MenuIcon,
  list: ListChecks, grid: LayoutGrid, userCog: UserCog, pie: PieChart, percent: Percent,
  key: KeyRound, history: History, login: LogIn, face: ScanFace, fingerprint: Fingerprint,
  phone: Smartphone, lock: Lock, star: Star, dots: Grid3x3, team: Users2, coins: HandCoins,
  sheet: FileSpreadsheet, layers: Layers, scroll: ScrollText, message: MessageSquare,
  support: LifeBuoy, sparkle: Sparkles, expand: ChevronsRight, grip: GripVertical,
  rows: Rows3, table: Table2, money: CircleDollarSign, coin: Coins, invoice: ReceiptText,
} as const;

export type IconName = keyof typeof ICONS;

export const Icon: React.FC<{ name: IconName; size?: number; className?: string; strokeWidth?: number }> = ({ name, size = 18, className = "", strokeWidth = 1.8 }) => {
  const Cmp = ICONS[name] ?? ICONS.dots;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} />;
};
