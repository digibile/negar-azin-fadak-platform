import React from "react";
import { Link } from "react-router-dom";

export const PublicFooter: React.FC = () => (
  <footer className="border-t border-border bg-surface mt-10">
    <div className="mx-auto max-w-7xl grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
      <div>
        <h4 className="mb-3 text-sm font-bold">درباره نگار آذین فدک</h4>
        <ul className="space-y-2 text-xs text-text-muted">
          <li><Link to="/about" className="hover:text-primary-600">درباره ما</Link></li>
          <li><Link to="/brands" className="hover:text-primary-600">برندها</Link></li>
          <li><Link to="/stores" className="hover:text-primary-600">فروشگاه‌ها</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold">خدمات مشتریان</h4>
        <ul className="space-y-2 text-xs text-text-muted">
          <li><Link to="/faq" className="hover:text-primary-600">سوالات متداول</Link></li>
          <li><Link to="/contact" className="hover:text-primary-600">تماس با ما</Link></li>
          <li><Link to="/terms" className="hover:text-primary-600">قوانین و مقررات</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold">دسترسی سازمانی</h4>
        <ul className="space-y-2 text-xs text-text-muted">
          <li><Link to="/auth/login" className="hover:text-primary-600">ورود به مرکز مدیریت</Link></li>
          <li><Link to="/shop/home" className="hover:text-primary-600">پرتال مشتریان</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold">پلتفرم بیزینس نگار آذین فدک</h4>
        <p className="text-xs text-text-muted leading-6">سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک — نسخه پیش‌نمایش UI/UX.</p>
      </div>
    </div>
    <div className="border-t border-border py-4 text-center text-xs text-text-muted">
      © پلتفرم بیزینس نگار آذین فدک ایران — تمامی حقوق محفوظ است.
    </div>
  </footer>
);
