# NAF Design System

کتابخانه UI مشترک پلتفرم نگار آذین فدک.

## اصل

تمام Surfaceهای عمومی و مدیریتی از یک Design System استفاده می‌کنند، اما ظاهر هر Surface از طریق Theme و Surface Tokens قابل تنظیم است.

## لایه‌ها

- Foundations: tokens, typography, spacing, radius, elevation, motion, breakpoints, accessibility
- Components: Button, Input, Select, Search, Badge, Avatar, Card, DataTable, Tabs, Drawer, Dialog, Toast, EmptyState, Skeleton, Pagination, Timeline, Stat, CommandPalette
- Patterns: PageHeader, Workspace, Dashboard, CRUD, Approval, FinancialDocument, SearchResults, DetailView
- Surfaces: Commerce, Marketplace, Pay, Corporate, Management

## قانون

Business logic و API call داخل Componentهای پایه قرار نمی‌گیرد. Component باید قابل استفاده مجدد و مستقل از Tenant و backend باشد.
