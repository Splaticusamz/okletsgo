import Link from 'next/link';

export default function AssetsGuidePage() {
  return (
    <>
      <h1>Assets</h1>
      <p>
        The <Link href="/admin/assets">Assets page</Link> manages images and videos tied to events.
        When an event gets its first approval (<code>approved_1</code>), an asset record is automatically
        created in &quot;missing&quot; state.
      </p>

      <h2>Asset Statuses</h2>
      <table className="status-table">
        <thead>
          <tr><th>Status</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>missing</code></td><td>No image/video generated yet. Needs attention.</td></tr>
          <tr><td><code>pending</code></td><td>Generation has been requested but hasn&apos;t started.</td></tr>
          <tr><td><code>processing</code></td><td>Currently being generated.</td></tr>
          <tr><td><code>ready</code></td><td>Image/video is done and attached to the event.</td></tr>
          <tr><td><code>partial</code></td><td>Only a fallback asset is available (e.g. placeholder image).</td></tr>
          <tr><td><code>failed</code></td><td>Generation failed. May need manual retry or a different approach.</td></tr>
        </tbody>
      </table>

      <h2>Generating Assets</h2>
      <p>
        From the Assets page, you can trigger asset generation for events that are in <code>missing</code>
        or <code>failed</code> state. The system will attempt to create an appropriate image or video for the event.
      </p>

      <h2>How Assets Appear on the Homepage</h2>
      <p>
        When an event has a <code>ready</code> asset, the homepage card for that event shows the video with
        auto-play (muted, looping). Events without assets still appear — they just won&apos;t have visual media
        on their card.
      </p>

      <div className="tip">
        <strong>💡 Tip:</strong> Assets are organized by event and show which mode (day/night) they belong to.
        Use the filter to focus on events that still need assets before publishing.
      </div>

      <h2>Asset Files</h2>
      <p>
        Generated assets are stored in the <code>/public/assets/</code>, <code>/public/images/</code>,
        and <code>/public/videos/</code> directories. They&apos;re served as static files by Next.js.
      </p>

      <Link href="/admin/guide/newsletter" className="next-link">
        Next: Newsletter →
      </Link>
    </>
  );
}
