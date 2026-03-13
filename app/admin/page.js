export default function AdminPage() {
  const milestones = [
    {
      title: 'Dynamic public data layer',
      body: 'Homepage reads structured weekly batch data while preserving the current visual system.',
      status: 'in progress',
    },
    {
      title: 'Candidate review queue',
      body: 'Double-approval stage 1 before asset creation.',
      status: 'planned',
    },
    {
      title: 'Asset pipeline review',
      body: 'Crops, animation previews, and regeneration controls.',
      status: 'planned',
    },
    {
      title: 'Final publish review',
      body: 'Double-approval stage 2 before site/newsletter publish.',
      status: 'planned',
    },
  ];

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <div className="admin-head">
          <div className="admin-mark">
            <span className="admin-mark-ok">OK</span>
            <br />
            LET&apos;S GO
            <br />
            ADMIN
          </div>
          <div className="admin-pill">Real app route · same-domain ops shell</div>
        </div>

        <div className="admin-grid">
          <section className="admin-card">
            <h2>Build status</h2>
            <p>This admin shell now lives on a real <code>/admin</code> app route instead of a static-path hack.</p>
          </section>

          <section className="admin-card">
            <h2>Next milestones</h2>
            <div className="admin-list">
              {milestones.map((item, index) => (
                <div key={item.title} className="admin-item">
                  <div>
                    <strong>{index + 1}. {item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                  <span className="admin-tag">{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
