# okletsgo.ca — Discord Button Handler

When a user clicks **"✅ Send to Web [evt:N]"** buttons, ingest that event to okletsgo.ca.

## Ingest Endpoint

```
POST https://okletsgo.ca/api/events/ingest
Authorization: Bearer 3d39bfe8181808b8278ae84fcf1e63733e100dfeefeef609
Content-Type: application/json
```

## Scraped Events Source

File: `/home/ubuntu/repos/okletsgo/tmp/scraped-events.json`
Structure: `{ "events": [...] }` — N in `[evt:N]` is the array index.

## Payload Format

```json
{
  "title": "Event Title",
  "date": "2026-03-15",
  "venue": "Venue Name",
  "city": "Kelowna",
  "description": "Short description",
  "sourceUrl": "https://source-page-url",
  "source": "tourismkelowna",
  "image": "https://image-url-if-available",
  "discordMessageId": "<the triggering message ID>",
  "discordChannelId": "<channel ID where button was clicked>"
}
```

## On Success

- React to the Discord message with 🚀
- Images are auto-fetched during ingest (venue from Bing, event from source page, AI from fal.ai)

## Repo

`/home/ubuntu/repos/okletsgo/`
