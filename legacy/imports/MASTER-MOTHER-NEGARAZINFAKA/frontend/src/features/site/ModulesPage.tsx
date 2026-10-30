import { PageHeader } from '../../components/PageHeader';
import { AllModules } from '../catalog/ModuleCards';

/**
 * The module catalogue.
 *
 * Each card's status is resolved from the running host's own contract, so this page is a report of the
 * deployed API rather than a copy of a plan.
 */
export function ModulesPage() {
  return (
    <div className="container portal">
      <PageHeader
        title="ماژول‌های پلتفرم"
        lead="هر ماژول بر پایه هویت مرکزی پلتفرم نگار آذین فدک ساخته می‌شود. وضعیت هر کارت از روی مسیرهایی که میزبان واقعاً منتشر می‌کند سنجیده می‌شود، بنابراین ماژولی که سرویس دارد «در انتظار سرویس» نشان داده نمی‌شود و ماژولی که سرویس ندارد هم متصل اعلام نمی‌شود."
      />
      <AllModules />
    </div>
  );
}
