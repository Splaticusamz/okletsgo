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
    </main>
  );
}
