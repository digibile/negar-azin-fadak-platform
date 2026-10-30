import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { State } from '../../components/State';
import { StatusChip } from '../../components/StatusChip';
import { ModuleContractPanel } from '../catalog/ModuleCards';
import { UNIT_LEVEL_LABELS, platformApi, type UnitLevel } from '../../lib/http/platform';
import { ApiError, TransportError } from '../../lib/http/client';
import { useIsSignedIn } from '../../lib/useSession';

/**
 * The management operations the platform really publishes.
 *
 * Every control here calls a route the host serves, and every one of them is behind bearer authentication
 * with a permission the platform checks. Nothing on this screen invents an outcome: a submission reports the
 * status the service returned, and a refusal is shown as the refusal it is rather than swallowed into a
 * success toast.
 *
 * There is no create/edit form for a module the platform has not modelled, because there would be nowhere to
 * send it.
 */

type Outcome =
  | { readonly kind: 'idle' }
  /** A field the operator must fill before the request can be built. */
  | { readonly kind: 'incomplete'; readonly message: string }
  | { readonly kind: 'running' }
  | { readonly kind: 'succeeded'; readonly detail: string }
  | {
      readonly kind: 'refused';
      readonly tone: 'unauthorized' | 'forbidden' | 'offline' | 'error';
      readonly title: string;
      readonly body: string;
      readonly meta: string | null;
    };

const IDLE: Outcome = { kind: 'idle' };

/** Runs one platform write and classifies the result the same way the read screens classify theirs. */
function useOperation() {
  const [outcome, setOutcome] = useState<Outcome>(IDLE);

  const run = useCallback(async (operation: () => Promise<string>) => {
    setOutcome({ kind: 'running' });

    try {
      setOutcome({ kind: 'succeeded', detail: await operation() });
    } catch (failure: unknown) {
      if (failure instanceof ApiError && failure.isUnauthorized) {
        setOutcome({
          kind: 'refused',
          tone: 'unauthorized',
          title: 'این عملیات توکن معتبر می‌خواهد',
          body: 'پلتفرم درخواست را بدون نشست رد کرد. هیچ تغییری اعمال نشده است.',
          meta: failure.correlationId,
        });
        return;
      }

      if (failure instanceof ApiError && failure.isForbidden) {
        setOutcome({
          kind: 'refused',
          tone: 'forbidden',
          title: 'مجوز این عملیات در نقش شما نیست',
          body: failure.reason,
          meta: failure.correlationId,
        });
        return;
      }

      if (failure instanceof TransportError) {
        setOutcome({
          kind: 'refused',
          tone: 'offline',
          title: 'سرویس پلتفرم در دسترس نیست',
          body: 'درخواست به سرویس نرسید؛ وضعیت تغییریابنده نامشخص است و باید از طریق رد ممیزی بررسی شود.',
          meta: failure.correlationId,
        });
        return;
      }

      const codes =
        failure instanceof ApiError && failure.problem?.errors !== undefined
          ? failure.problem.errors.map((entry) => `${entry.code}`).join('، ')
          : null;

      setOutcome({
        kind: 'refused',
        tone: 'error',
        title: failure instanceof ApiError ? failure.reason : 'عملیات ناموفق بود',
        body:
          failure instanceof ApiError && failure.status >= 500
            ? 'خطای داخلی سرور رخ داد. جزئیات در لاگ‌های پلتفرم ثبت شده است.'
            : 'پلتفرم این درخواست را نپذیرفت.',
        meta: codes ?? (failure instanceof ApiError ? failure.correlationId : null),
      });
    }
  }, []);

  /** Reports a request the client cannot build, so nothing is silently skipped. */
  const report = useCallback((message: string) => {
    setOutcome({ kind: 'incomplete', message });
  }, []);

  const reset = useCallback(() => {
    setOutcome(IDLE);
  }, []);

  return { outcome, run, report, reset };
}

function OutcomePanel({ outcome }: { readonly outcome: Outcome }) {
  if (outcome.kind === 'idle') {
    return null;
  }

  if (outcome.kind === 'incomplete') {
    return <State tone="empty" title="درخواست ناقص است" body={outcome.message} />;
  }

  if (outcome.kind === 'running') {
    return <p className="text-muted text-sm">در حال ارسال درخواست به پلتفرم…</p>;
  }

  if (outcome.kind === 'succeeded') {
    return <State tone="empty" title="عملیات پذیرفته شد" body={outcome.detail} />;
  }

  return <State tone={outcome.tone} title={outcome.title} body={outcome.body} meta={outcome.meta} />;
}

/** The management operations screen. */
export function OperationsPage() {
  const signedIn = useIsSignedIn();

  return (
    <div className="stack stack--loose">
      <PageHeader
        title="عملیات مدیریت"
        lead="هر عملیاتی که پلتفرم واقعاً منتشر کرده، با همان مسیر و همان مجوزی که سرویس بررسی می‌کند. نتیجه هر اقدام، وضعیت واقعی بازگشتی از سرور است."
      />

      {!signedIn && (
        <State
          tone="unauthorized"
          title="این نشست توکنی ندارد"
          body="همه عملیات این صفحه پشت احراز هویت و مجوز هستند. تا زمانی که سرویس مسیر صدور توکن منتشر نکند، هیچ‌کدام قابل اجرا نیستند و هیچ تغییری اعمال نمی‌شود."
        />
      )}

      <div className="portal__grid">
        <TenantProvisioningPanel />
        <UnitPanel />
      </div>

      <div className="portal__grid">
        <RolePanel />
        <CatalogPanel />
      </div>

      <TenantSettingPanel />

      <ModuleContractPanel to="/management" />
    </div>
  );
}

/* ---------- tenant provisioning ---------- */

function TenantProvisioningPanel() {
  const { outcome, run, reset } = useOperation();

  const provision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => {
      const raw = String(form.get(name) ?? '').trim();
      return raw.length === 0 ? null : raw;
    };

    void run(async () => {
      const created = await platformApi.provisionTenant({
        code: value('code')!,
        name: value('name')!,
        legalName: value('legalName'),
        currencyCode: value('currencyCode'),
        economicCode: value('economicCode'),
        nationalRegistrationNumber: value('nationalRegistrationNumber'),
      });

      return `سازمان ${created.organizationId} با ${created.roleIds.length.toLocaleString('fa-IR')} نقش ساخته شد.`;
    });
  };

  const lifecycle = (action: 'activate' | 'suspend' | 'close', reason: string | null) =>
    run(async () => {
      if (action === 'activate') {
        await platformApi.activateTenant();
      } else if (action === 'suspend') {
        await platformApi.suspendTenant(reason);
      } else {
        await platformApi.closeTenant(reason);
      }
      return `درخواست «${action}» پذیرفته شد.`;
    });

  return (
    <Panel
      title="مستأجر"
      hint="ایجاد و چرخه عمر مستأجر. مجوز لازم: platform.access.administer"
      actions={<StatusChip label="POST /api/v1/tenants" tone="info" />}
    >
      <form className="field-set" onSubmit={provision}>
        <div className="portal__grid">
          <TextField name="code" label="کد" required />
          <TextField name="name" label="نام" required />
          <TextField name="legalName" label="نام حقوقی" />
          <TextField name="currencyCode" label="کد ارز" hint="ISO 4217، مثل IRR" />
          <TextField name="economicCode" label="کد اقتصادی" />
          <TextField name="nationalRegistrationNumber" label="شماره ثبت" />
        </div>
        <button type="submit" className="button">
          ایجاد مستأجر
        </button>
      </form>

      <div className="cluster cluster--tight">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            void lifecycle('activate', null);
          }}
        >
          فعال‌سازی
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            void lifecycle('suspend', 'تعلیق از رابط مدیریت');
          }}
        >
          تعلیق
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={() => {
            void lifecycle('close', 'بستن از رابط مدیریت');
          }}
        >
          بستن
        </button>
      </div>

      <OutcomePanel outcome={outcome} />
      <button type="button" className="button button--ghost" onClick={reset}>
        پاک کردن نتیجه
      </button>
    </Panel>
  );
}

/* ---------- organizational units ---------- */

const LEVELS: readonly UnitLevel[] = ['company', 'brand', 'branch', 'store'];

function UnitPanel() {
  const { outcome, run, reset } = useOperation();

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const level = String(form.get('level') ?? 'company') as UnitLevel;

    void run(async () => {
      const created = await platformApi.createUnit(level, {
        code: String(form.get('code') ?? '').trim(),
        name: String(form.get('name') ?? '').trim(),
        legalName: String(form.get('legalName') ?? '').trim() || null,
      });
      return `${UNIT_LEVEL_LABELS[level]} با کد ${created.code} ساخته شد.`;
    });
  };

  const lifecycle = (action: 'activate' | 'suspend', level: UnitLevel, unitId: string) =>
    run(async () => {
      if (action === 'activate') {
        await platformApi.activateUnit(level, unitId);
      } else {
        await platformApi.suspendUnit(level, unitId, 'تعلیق از رابط مدیریت');
      }
      return `درخواست «${action === 'activate' ? 'فعال‌سازی' : 'تعلیق'}» برای واحد ارسال شد.`;
    });

  return (
    <Panel
      title="واحد سازمانی"
      hint="ایجاد واحد و تغییر وضعیت آن. مجوز لازم: organization.unit.write"
      actions={<StatusChip label="POST /api/v1/organization/units/{level}" tone="info" />}
    >
      <form className="field-set" onSubmit={create}>
        <div className="portal__grid">
          <label className="field">
            <span className="field__label">سطح</span>
            <select className="field__control" name="level" defaultValue="company">
              {LEVELS.map((entry) => (
                <option key={entry} value={entry}>
                  {UNIT_LEVEL_LABELS[entry]}
                </option>
              ))}
            </select>
          </label>
          <TextField name="code" label="کد" required />
          <TextField name="name" label="نام" required />
          <TextField name="legalName" label="نام حقوقی" />
        </div>
        <button type="submit" className="button">
          ایجاد واحد
        </button>
      </form>

      <form
        className="field-set"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const level = String(form.get('unitLevel') ?? 'company') as UnitLevel;
          const unitId = String(form.get('unitId') ?? '').trim();
          const action = String(form.get('unitAction') ?? 'activate') as 'activate' | 'suspend';
          void lifecycle(action, level, unitId);
        }}
      >
        <div className="portal__grid">
          <label className="field">
            <span className="field__label">سطح</span>
            <select className="field__control" name="unitLevel" defaultValue="company">
              {LEVELS.map((entry) => (
                <option key={entry} value={entry}>
                  {UNIT_LEVEL_LABELS[entry]}
                </option>
              ))}
            </select>
          </label>
          <TextField name="unitId" label="شناسه واحد" hint="GUID همان واحد" required />
          <label className="field">
            <span className="field__label">عملیات</span>
            <select className="field__control" name="unitAction" defaultValue="activate">
              <option value="activate">فعال‌سازی</option>
              <option value="suspend">تعلیق</option>
            </select>
          </label>
        </div>
        <button type="submit" className="button button--secondary">
          اجرای عملیات واحد
        </button>
      </form>

      <OutcomePanel outcome={outcome} />
      <button type="button" className="button button--ghost" onClick={reset}>
        پاک کردن نتیجه
      </button>
    </Panel>
  );
}

/* ---------- roles ---------- */

function RolePanel() {
  const { outcome, run, reset, report } = useOperation();
  const [roleId, setRoleId] = useState('');
  const [permissionCode, setPermissionCode] = useState('');

  const define = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void run(async () => {
      const created = await platformApi.defineRole({
        code: String(form.get('roleCode') ?? '').trim(),
        name: String(form.get('roleName') ?? '').trim(),
        description: String(form.get('roleDescription') ?? '').trim() || null,
      });
      setRoleId(created.id);
      return `نقش ${created.code} با ${created.permissions.length.toLocaleString('fa-IR')} مجوز ساخته شد.`;
    });
  };

  /**
   * The remaining role actions need a role the operator already has.
   *
   * Defining a role fills the field with the new identifier, so a role created in this screen can be granted
   * a permission without the operator copying a GUID by hand.
   */
  const onRole = (action: (roleId: string) => Promise<string>, needsPermission = true) => {
    const id = roleId.trim();

    if (id.length === 0) {
      report('برای این عملیات، شناسه نقش لازم است. یک نقش تعریف کنید یا شناسه آن را وارد کنید.');
      return;
    }

    if (needsPermission && permissionCode.trim().length === 0) {
      report('برای اعطا یا سلب مجوز، کد مجوز لازم است.');
      return;
    }

    void run(() => action(id));
  };

  return (
    <Panel
      title="نقش‌ها"
      hint="تعریف نقش، اعطا و سلب مجوز، و بازنشسته/فعال‌سازی. مجوز لازم: authorization.role.write"
      actions={<StatusChip label="POST /api/v1/roles" tone="info" />}
    >
      <form className="field-set" onSubmit={define}>
        <div className="portal__grid">
          <TextField name="roleCode" label="کد نقش" required />
          <TextField name="roleName" label="نام نقش" required />
          <TextField name="roleDescription" label="توضیح" />
        </div>
        <button type="submit" className="button">
          تعریف نقش
        </button>
      </form>

      <div className="field-set">
        <div className="portal__grid">
          <label className="field">
            <span className="field__label">شناسه نقش</span>
            <input
              className="field__control text-ltr"
              value={roleId}
              placeholder="33333333-3333-3333-3333-333333333333"
              onChange={(event) => {
                setRoleId(event.target.value);
              }}
            />
            <span className="field__hint">با تعریف نقش، خودکار پر می‌شود.</span>
          </label>
          <label className="field">
            <span className="field__label">کد مجوز</span>
            <input
              className="field__control text-ltr"
              value={permissionCode}
              placeholder="authorization.role.read"
              onChange={(event) => {
                setPermissionCode(event.target.value);
              }}
            />
            <span className="field__hint">یکی از کدهای کاتالوگ مجوز پلتفرم.</span>
          </label>
        </div>
        <div className="cluster cluster--tight">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              onRole(async (id) => {
                await platformApi.grantRolePermission(id, permissionCode.trim());
                return `مجوز ${permissionCode.trim()} به نقش اعطا شد.`;
              });
            }}
          >
            اعطای مجوز
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              onRole(async (id) => {
                await platformApi.revokeRolePermission(id, permissionCode.trim());
                return `مجوز ${permissionCode.trim()} از نقش سلب شد.`;
              });
            }}
          >
            سلب مجوز
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              onRole(
                async (id) => {
                  await platformApi.retireRole(id);
                  return 'نقش بازنشسته شد.';
                },
                false,
              );
            }}
          >
            بازنشستگی
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              onRole(
                async (id) => {
                  await platformApi.activateRole(id);
                  return 'نقش فعال شد.';
                },
                false,
              );
            }}
          >
            فعال‌سازی نقش
          </button>
        </div>
      </div>

      <OutcomePanel outcome={outcome} />
      <button type="button" className="button button--ghost" onClick={reset}>
        پاک کردن نتیجه
      </button>
    </Panel>
  );
}

/* ---------- permission catalog ---------- */

function CatalogPanel() {
  const { outcome, run, reset } = useOperation();

  return (
    <Panel
      title="انتشار کاتالوگ مجوزها"
      hint="کاتالوگ مجوز از پیکربندی منتشر می‌شود، نه از کد. مجوز لازم: authorization.permission.publish"
      actions={<StatusChip label="POST /api/v1/permissions/publish" tone="info" />}
    >
      <p className="text-muted text-sm">
        این عملیات کدهای مجوز تعریف‌شده در پیکربندی را با جدول مجوزهای پلتفرم همگام می‌کند. هیچ کد مجوزی در رابط
        کاربری نوشته نشده است؛ هرچه منتشر شود، از همان پاسخ سرویس خوانده می‌شود.
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          void run(async () => {
            const published = await platformApi.publishPermissionCatalog();
            return `${published.added.toLocaleString('fa-IR')} کد افزوده شد؛ مجموع ${published.total.toLocaleString('fa-IR')} کد فعال.`;
          });
        }}
      >
        انتشار کاتالوگ
      </button>
      <OutcomePanel outcome={outcome} />
      <button type="button" className="button button--ghost" onClick={reset}>
        پاک کردن نتیجه
      </button>
    </Panel>
  );
}

/* ---------- tenant settings ---------- */

function TenantSettingPanel() {
  const { outcome, run, reset, report } = useOperation();
  const [code, setCode] = useState('');
  const [sensitive, setSensitive] = useState(false);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = code.trim();
    const minimum = String(form.get('rangeMinimum') ?? '').trim();
    const maximum = String(form.get('rangeMaximum') ?? '').trim();

    void run(async () => {
      await platformApi.setTenantSetting(target, {
        value: String(form.get('settingValue') ?? '').trim() || null,
        kind: String(form.get('settingKind') ?? 'Text'),
        isSensitive: sensitive,
        rangeMinimum: minimum.length === 0 ? null : Number(minimum),
        rangeMaximum: maximum.length === 0 ? null : Number(maximum),
      });
      return `تنظیم ${target} ذخیره شد.`;
    });
  };

  return (
    <Panel
      title="تنظیمات مستأجر"
      hint="نوشتن و حذف تنظیم. مجوز لازم: tenant.configuration.write"
      actions={<StatusChip label="PUT /api/v1/tenant/configuration/settings/{code}" tone="info" />}
    >
      <form className="field-set" onSubmit={save}>
        <div className="portal__grid">
          <label className="field">
            <span className="field__label">کد تنظیم</span>
            <input
              className="field__control"
              name="settingCode"
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
              }}
            />
          </label>
          <label className="field">
            <span className="field__label">نوع</span>
            <select className="field__control" name="settingKind" defaultValue="Text">
              <option value="Text">متن</option>
              <option value="Number">عدد</option>
              <option value="Boolean">درست/نادرست</option>
            </select>
          </label>
          <TextField name="settingValue" label="مقدار" />
          <TextField name="rangeMinimum" label="حداقل بازه" />
          <TextField name="rangeMaximum" label="حداکثر بازه" />
          <label className="field">
            <span className="field__label">حساس</span>
            <select
              className="field__control"
              name="sensitive"
              value={sensitive ? 'true' : 'false'}
              onChange={(event) => {
                setSensitive(event.target.value === 'true');
              }}
            >
              <option value="false">خیر</option>
              <option value="true">بله</option>
            </select>
          </label>
        </div>
        <div className="cluster cluster--tight">
          <button type="submit" className="button">
            ذخیره تنظیم
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => {
              if (code.trim().length === 0) {
                report('برای حذف، کد تنظیم لازم است.');
                return;
              }
              void run(async () => {
                await platformApi.removeTenantSetting(code.trim());
                return `تنظیم ${code.trim()} حذف شد.`;
              });
            }}
          >
            حذف تنظیم
          </button>
        </div>
      </form>
      <OutcomePanel outcome={outcome} />
      <button type="button" className="button button--ghost" onClick={reset}>
        پاک کردن نتیجه
      </button>
    </Panel>
  );
}

/* ---------- field ---------- */

interface TextFieldProps {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly required?: boolean;
}

function TextField({ name, label, hint, required = false }: TextFieldProps): ReactNode {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input className="field__control" name={name} required={required} />
      {hint !== undefined && <span className="field__hint">{hint}</span>}
    </label>
  );
}
