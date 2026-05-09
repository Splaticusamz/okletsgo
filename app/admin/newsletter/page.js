import AdminNav from '../../../components/AdminNav';
import { initDb, getNewsletterSubscribers, getNewsletterDrafts, getNewsletterSettings } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

function fmt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Vancouver',
    });
  } catch {
    return String(value);
  }
}

export default async function AdminNewsletterPage() {
  await initDb();
  const subscribers = getNewsletterSubscribers();
  const drafts = getNewsletterDrafts().slice(0, 5);
  const settings = getNewsletterSettings();
  const activeSubscribers = subscribers.filter((subscriber) => subscriber.status !== 'unsubscribed');
  const forwardedCount = subscribers.filter((subscriber) => subscriber.formSubmitForwarded).length;

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header newsletter-admin-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ NEWSLETTER</div>
          <div className="newsletter-admin-summary">
            <span>{activeSubscribers.length} active subscribers</span>
            <span>{forwardedCount} forwarded to email</span>
          </div>
        </header>

        <AdminNav />

        <section className="adash-stats-row newsletter-stats">
          <div className="adash-stat-card"><span className="adash-stat-num">{subscribers.length}</span><span className="adash-stat-desc">Total signups</span></div>
          <div className="adash-stat-card"><span className="adash-stat-num">{activeSubscribers.length}</span><span className="adash-stat-desc">Active</span></div>
          <div className="adash-stat-card"><span className="adash-stat-num">{forwardedCount}</span><span className="adash-stat-desc">Email forwards</span></div>
          <div className="adash-stat-card"><span className="adash-stat-num">{drafts.length}</span><span className="adash-stat-desc">Recent drafts</span></div>
        </section>

        <section className="adash-card newsletter-card">
          <div className="newsletter-card-head">
            <div>
              <h1>Subscriber list</h1>
              <p>Stored in the OKLetsGo database. The public form also attempts a FormSubmit forward to <strong>{process.env.NEWSLETTER_FORWARD_EMAIL || 'sam@samzamor.com'}</strong>.</p>
            </div>
            <a className="adash-action-btn adash-action-btn--secondary" href="/api/newsletter" target="_blank" rel="noreferrer">Draft API</a>
          </div>

          {subscribers.length === 0 ? (
            <div className="newsletter-empty">No newsletter subscribers yet.</div>
          ) : (
            <div className="newsletter-table-wrap">
              <table className="newsletter-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Last seen</th>
                    <th>Source</th>
                    <th>Forwards</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id || subscriber.email}>
                      <td><a href={`mailto:${subscriber.email}`}>{subscriber.email}</a></td>
                      <td>{fmt(subscriber.createdAt)}</td>
                      <td>{fmt(subscriber.updatedAt)}</td>
                      <td>{subscriber.source || 'homepage'}</td>
                      <td>{subscriber.formSubmitForwarded ? 'yes' : 'not confirmed'}</td>
                      <td>{subscriber.signupCount || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adash-card newsletter-card">
          <h2>Recent newsletter drafts</h2>
          {drafts.length === 0 ? <p>No drafts yet.</p> : (
            <div className="newsletter-drafts">
              {drafts.map((draft) => (
                <div className="newsletter-draft-row" key={draft.id}>
                  <div><strong>{draft.subject || draft.id}</strong><span>{draft.previewText || 'No preview text'}</span></div>
                  <span>{draft.status}</span>
                  <span>{fmt(draft.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="newsletter-settings-note">Beehiiv/FormSubmit settings object: <code>{JSON.stringify(settings || {})}</code></p>
        </section>
      </div>

      <style>{`
        .newsletter-admin-header{margin-bottom:20px}.newsletter-admin-summary{display:flex;gap:10px;flex-wrap:wrap}.newsletter-admin-summary span{border:1px solid var(--border);border-radius:999px;padding:8px 12px;color:var(--muted);background:rgba(255,255,255,.04)}
        .newsletter-stats{margin-bottom:18px}.newsletter-card{padding:22px;margin-top:18px}.newsletter-card h1,.newsletter-card h2{margin:0 0 8px;color:var(--text)}.newsletter-card p{color:var(--muted);margin:0 0 16px}.newsletter-card-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.newsletter-empty{padding:22px;border:1px dashed var(--border);border-radius:14px;color:var(--muted);text-align:center}.newsletter-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:14px}.newsletter-table{width:100%;border-collapse:collapse;min-width:780px}.newsletter-table th,.newsletter-table td{padding:12px 14px;border-bottom:1px solid var(--border);text-align:left;font-size:14px}.newsletter-table th{color:var(--muted);font-weight:600;background:rgba(255,255,255,.03)}.newsletter-table td{color:var(--text)}.newsletter-table a{color:var(--accent);text-decoration:none}.newsletter-drafts{display:flex;flex-direction:column;gap:10px}.newsletter-draft-row{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;border:1px solid var(--border);border-radius:14px;padding:12px}.newsletter-draft-row div{display:flex;flex-direction:column;gap:4px}.newsletter-draft-row span{color:var(--muted);font-size:13px}.newsletter-settings-note{margin-top:14px!important}code{font-size:12px;color:var(--accent)}@media(max-width:720px){.newsletter-card-head{flex-direction:column}.newsletter-draft-row{grid-template-columns:1fr}.newsletter-admin-summary{margin-top:12px}}
      `}</style>
    </main>
  );
}
