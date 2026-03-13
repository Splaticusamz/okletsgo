import { getTasks } from '../../lib/data';

export default function TasksPage() {
  const data = getTasks();

  return (
    <main className="tasks-shell">
      <div className="tasks-wrap">
        <div className="tasks-head">
          <div className="tasks-mark">
            <span className="tasks-mark-ok">OK</span>
            <br />
            LET&apos;S GO
            <br />
            TASKS
          </div>
          <div className="tasks-pill">Updated {new Date(data.updatedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC</div>
        </div>

        {/* ── Changelog ── */}
        {data.changelog && data.changelog.length > 0 && (
          <section className="tasks-section tasks-changelog">
            <h2>Changelog</h2>
            <div className="tasks-changelog-entries">
              {data.changelog.map((group) => (
                <div key={group.date} className="tasks-changelog-group">
                  <div className="tasks-changelog-date">{group.date}</div>
                  <ul className="tasks-changelog-list">
                    {group.entries.map((entry, i) => (
                      <li key={i}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="tasks-sections">
          {data.sections.map((section) => (
            <section key={section.title} className="tasks-section">
              <h2>{section.title}</h2>
              <div className="tasks-items">
                {section.items.map((item) => (
                  <div key={item.id} className="tasks-item">
                    <input type="checkbox" checked={item.done} readOnly />
                    <div>
                      <div className="tasks-item-id">{item.id}</div>
                      <div>{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        .tasks-changelog {
          margin-bottom: 24px;
        }
        .tasks-changelog-entries {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tasks-changelog-group {
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 16px 20px;
        }
        .tasks-changelog-date {
          font-size: 13px;
          font-weight: 700;
          color: #4ecdc4;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 10px;
        }
        .tasks-changelog-list {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tasks-changelog-list li {
          font-size: 14px;
          color: var(--text, #e8eaf0);
          line-height: 1.5;
        }
      `}</style>
    </main>
  );
}
