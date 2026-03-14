import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getAdminCookieName,
  isAdminAuthConfigured,
  verifyAdminSessionValue,
} from '../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next && String(params.next).startsWith('/') ? String(params.next) : '/admin';
  const error = params?.error ? String(params.error) : '';
  const loggedOut = params?.loggedOut === '1';

  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (token && await verifyAdminSessionValue(token)) {
    redirect(next);
  }

  const configured = isAdminAuthConfigured();

  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-login-brand"><span>OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
        <div className="eyebrow">Protected access</div>
        <h1>Admin login</h1>
        <p className="subcopy">
          Public pages stay open. Admin screens and write actions require the configured admin password.
        </p>

        {!configured && (
          <div className="notice notice--warn">
            ADMIN_PASSWORD is not configured yet. Set it in the environment before using admin routes.
          </div>
        )}

        {error && <div className="notice notice--error">{error}</div>}
        {loggedOut && <div className="notice notice--ok">Logged out.</div>}

        <form method="POST" action="/api/admin/login" className="login-form">
          <input type="hidden" name="next" value={next} />
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required disabled={!configured} />
          </label>
          <button type="submit" disabled={!configured}>Enter admin</button>
        </form>

        <Link href="/" className="back-link">← Back to public site</Link>
      </div>

      <style>{`
        .admin-login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#080b1a,#11162f)}
        .admin-login-card{width:min(100%,460px);background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:28px;color:var(--text);box-shadow:0 24px 80px rgba(0,0,0,.35)}
        .admin-login-brand{font-size:34px;line-height:.9;font-weight:800;letter-spacing:-.05em;margin-bottom:18px}.admin-login-brand span{color:var(--accent)}
        .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}
        h1{font-size:30px;line-height:1;margin:0 0 10px}.subcopy{color:var(--muted);margin-bottom:18px}
        .login-form{display:flex;flex-direction:column;gap:14px;margin-top:18px}.login-form label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
        input{width:100%;border-radius:12px;border:1px solid var(--border);background:#080b1a;color:var(--text);padding:13px 14px;font:inherit}
        button,.back-link{border-radius:12px;padding:12px 14px;border:1px solid var(--border);font:inherit;text-decoration:none}
        button{background:var(--accent);border-color:var(--accent);color:#07121a;font-weight:700;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}
        .back-link{display:inline-flex;justify-content:center;color:var(--text);margin-top:12px}
        .notice{padding:11px 12px;border-radius:12px;margin:10px 0;font-size:14px}.notice--warn{background:rgba(120,53,15,.25);border:1px solid rgba(251,191,36,.25);color:#fde68a}.notice--error{background:rgba(127,29,29,.25);border:1px solid rgba(248,113,113,.25);color:#fecaca}.notice--ok{background:rgba(20,83,45,.25);border:1px solid rgba(74,222,128,.2);color:#bbf7d0}
      `}</style>
    </main>
  );
}
