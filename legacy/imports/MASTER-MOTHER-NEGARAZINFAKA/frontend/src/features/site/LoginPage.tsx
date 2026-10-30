import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { State } from '../../components/State';
import { StatusChip } from '../../components/StatusChip';
import { useContract } from '../../lib/useContract';
import { ApiError, TransportError } from '../../lib/http/client';
import { platformApi } from '../../lib/http/platform';
import { TOKEN_ENDPOINT } from '../catalog/modules';
import { setAccessToken } from '../../lib/session';

type Verification = { readonly status: 'idle' | 'checking' } | { readonly status: 'accepted'; readonly roles: number; readonly permissions: number } | { readonly status: 'rejected'; readonly tone: 'unauthorized' | 'forbidden' | 'offline' | 'error'; readonly title: string; readonly body: string; readonly meta: string | null };

const IDLE: Verification = { status: 'idle' };

/**
 * The session screen.
 *
 * The platform has no token-issuing endpoint, so this page does not pretend to have a sign-in form: a
 * username and password box that can never succeed is worse than none, because it looks like a working
 * feature and silently fails on the only action the page offers.
 *
 * What it does instead is the one real thing available: accept an access token and let the platform judge it.
 * The token is never trusted by the client — it is stored, sent as a bearer token, and accepted only if
 * `GET /api/v1/me` resolves it, with the caller's roles and permissions read back from the server. A rejected
 * token is discarded, so a stale or forged one cannot leave the tab looking signed in.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const contract = useContract();
  const [token, setToken] = useState('');
  const [verification, setVerification] = useState<Verification>(IDLE);

  const issuesTokens = useMemo(
    () =>
      contract.state.status === 'ready' &&
      contract.state.value.operations.some(
        (operation) => operation.method === TOKEN_ENDPOINT.method && operation.path === TOKEN_ENDPOINT.path,
      ),
    [contract.state],
  );

  useEffect(() => {
    document.title = 'ورود — پلتفرم بیزینس نگار آذین فدک';
    return () => {
      document.title = 'پلتفرم بیزینس نگار آذین فدک';
    };
  }, []);

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const candidate = token.trim();

      if (candidate.length === 0) {
        setVerification({
          status: 'rejected',
          tone: 'error',
          title: 'توکنی وارد نشده است',
          body: 'برای اتصال، توکنی را وارد کنید که پلتفرم آن را از طریق سرویس واقعی خود صادر کرده باشد.',
          meta: null,
        });
        return;
      }

      setVerification({ status: 'checking' });
      setAccessToken(candidate);

      try {
        const principal = await platformApi.me();
        setVerification({
          status: 'accepted',
          roles: principal.roles.length,
          permissions: principal.permissions.length,
        });
        navigate('/management');
      } catch (failure: unknown) {
        setAccessToken(null);

        if (failure instanceof ApiError && failure.isForbidden) {
          setVerification({
            status: 'rejected',
            tone: 'forbidden',
            title: 'توکن معتبر است اما مجوز کافی ندارد',
            body:
              'پلتفرم توکن را پذیرفت، ولی نقش این توکن اجازه خواندن هویت جاری را ندارد. این پاسخ درست سرویس است. ' +
              'برای ادامه، مجوز مورد نیاز باید به نقش کاربر داده شود.',
            meta: failure.correlationId,
          });
          return;
        }

        if (failure instanceof ApiError && failure.isUnauthorized) {
          setVerification({
            status: 'rejected',
            tone: 'unauthorized',
            title: 'توکن توسط پلتفرم پذیرفته نشد',
            body:
              'پلتفرم این توکن را معتبر تشخیص نداد. توکن از این نشست حذف شد و هیچ دسترسی‌ای باز نشده است.',
            meta: failure.correlationId,
          });
          return;
        }

        if (failure instanceof TransportError) {
          setVerification({
            status: 'rejected',
            tone: 'offline',
            title: 'سرویس پلتفرم در دسترس نیست',
            body: 'درخواست به سرویس نرسید، بنابراین توکن اعتبارسنجی نشد و از این نشست حذف شد.',
            meta: failure.correlationId,
          });
          return;
        }

        setVerification({
          status: 'rejected',
          tone: 'error',
          title: 'اعتبارسنجی توکن ناموفق بود',
          body: 'پاسخ غیرمنتظره‌ای از سرویس دریافت شد.',
          meta: null,
        });
      }
    },
    [navigate, token],
  );

  return (
    <div className="container auth">
      <div className="auth__aside">
        <PageHeader
          title="ورود به پلتفرم"
          lead="سرویس ورود روی این پلتفرم هنوز ساخته نشده است. آنچه این صفحه انجام می‌دهد، اعتبارسنجی یک توکن دسترسی نزد خود پلتفرم است؛ هیچ نام کاربری، رمز عبور یا اطلاعات ساختگی‌ای در این صفحه وجود ندارد و هیچ مسیر دور زدن احراز هویتی باز نمی‌شود."
        />
        <Panel title="وضعیت قرارداد احراز هویت" hint="خوانده‌شده از سند قرارداد خود سرویس.">
          {contract.state.status === 'loading' && <p className="text-muted text-sm">در حال خواندن قرارداد…</p>}
          {contract.state.status === 'failed' && (
            <State
              tone={contract.state.failure.tone}
              title={contract.state.failure.title}
              body={contract.state.failure.body}
              meta={contract.state.failure.meta}
            />
          )}
          {contract.state.status === 'ready' && (
            <div className="stack stack--tight">
              <div className="cluster cluster--tight">
                <StatusChip
                  label={issuesTokens ? 'سرویس صدور توکن موجود است' : 'سرویس صدور توکن موجود نیست'}
                  tone={issuesTokens ? 'positive' : 'caution'}
                  dot
                />
                <span className="code-chip">
                  {TOKEN_ENDPOINT.method} {TOKEN_ENDPOINT.path}
                </span>
              </div>
              <p className="text-muted text-sm">
                {issuesTokens
                  ? 'میزبان مسیر صدور توکن را منتشر می‌کند. فرم ورود واقعی باید از همین قرارداد استفاده کند.'
                  : 'میزبان هیچ مسیری برای صدور توکن منتشر نمی‌کند؛ بنابراین پلتفرم نمی‌تواند نشستی از صفر بسازد و فرم نام کاربری/رمز عبور یک کنترل نمایشی خواهد بود که هرگز کار نمی‌کند.'}
              </p>
            </div>
          )}
        </Panel>
      </div>

      <div className="auth__card">
        <h2 className="auth__title">اتصال با توکن دسترسی</h2>
        <p className="auth__subtitle">
          توکن را در این نشست نگه می‌داریم و به‌محض ورود به پلتفرم می‌فرستیم. اگر سرویس آن را نپذیرد، توکن
          بلافاصله حذف می‌شود. هیچ توکن یا رمزی در کد این پروژه ذخیره نشده است.
        </p>

        <form className="field-set" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="access-token">
              توکن دسترسی
            </label>
            <textarea
              id="access-token"
              className="field__control text-ltr"
              rows={4}
              value={token}
              spellCheck={false}
              autoComplete="off"
              placeholder="eyJhbGciOi…"
              onChange={(event) => {
                setToken(event.target.value);
                setVerification(IDLE);
              }}
            />
            <span className="field__hint">
              توکن باید توسط سرویس واقعی پلتفرم صادر شده باشد. سرویس صادرکننده توکن هنوز روی میزبان منتشر نشده
              است.
            </span>
          </div>
          <button type="submit" className="button button--block" disabled={verification.status === 'checking'}>
            {verification.status === 'checking' ? 'در حال اعتبارسنجی نزد سرویس…' : 'اعتبارسنجی و ورود'}
          </button>
        </form>

        {verification.status === 'accepted' && (
          <State
            tone="empty"
            title="توکن پذیرفته شد"
            body={
              <>
                سرویس هویت کاربر را برگرداند: {verification.roles.toLocaleString('fa-IR')} نقش و{' '}
                {verification.permissions.toLocaleString('fa-IR')} مجوز. در حال انتقال به مرکز مدیریت…
              </>
            }
          />
        )}

        {verification.status === 'rejected' && (
          <State
            tone={verification.tone}
            title={verification.title}
            body={verification.body}
            meta={verification.meta}
          />
        )}
      </div>
    </div>
  );
}
