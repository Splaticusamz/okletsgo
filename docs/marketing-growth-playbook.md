# OKLetsGo.ca Growth Playbook

## Current growth stack
- Site: https://okletsgo.ca
- Newsletter capture: live at homepage footer, stored in `/admin/newsletter`
- Analytics instrumentation: PostHog code deployed, pending `NEXT_PUBLIC_POSTHOG_KEY` env var
- SEO basics: title/description/canonical/OG/Twitter cards deployed
- Structured data: Schema.org `Organization` + visible homepage `Event` JSON-LD deployed
- Share surface: event bottom-sheet `Share` button deployed

## North-star metrics
1. Weekly unique visitors
2. Event card opens: `event_card_click`
3. Listing outbound clicks: `open_listing`
4. Newsletter signups: `newsletter_subscribe`
5. Shares: `share_event`

## UTM links
Use these when posting manually:

- Instagram bio/story: `https://okletsgo.ca/?utm_source=instagram&utm_medium=social&utm_campaign=weekly_events`
- Facebook groups: `https://okletsgo.ca/?utm_source=facebook&utm_medium=group_post&utm_campaign=weekly_events`
- Reddit: `https://okletsgo.ca/?utm_source=reddit&utm_medium=community_post&utm_campaign=weekly_events`
- Text/DM: `https://okletsgo.ca/?utm_source=dm&utm_medium=share&utm_campaign=weekly_events`
- Venue outreach: `https://okletsgo.ca/?utm_source=venue&utm_medium=outreach&utm_campaign=list_your_event`

## Weekly posting rhythm
### Monday morning
Post: this week's 5–7 best events + link.

Copy:
> Kelowna/Okanagan: I built a tiny weekly guide for stuff actually worth doing this week — live music, food/drink, shows, markets, family things. Updated every Monday: https://okletsgo.ca/?utm_source=facebook&utm_medium=group_post&utm_campaign=weekly_events

### Wednesday afternoon
Post: midweek reminder focused on Thu/Fri/Sat plans.

Copy:
> Still figuring out the weekend? OK LET'S GO has a quick this-week Okanagan event list — no endless calendar scrolling: https://okletsgo.ca/?utm_source=facebook&utm_medium=group_post&utm_campaign=midweek_reminder

### Friday morning
Post: weekend-only push.

Copy:
> Weekend plans in Kelowna/Okanagan: quick curated list here — live music, drinks, markets, shows, family stuff: https://okletsgo.ca/?utm_source=facebook&utm_medium=group_post&utm_campaign=weekend_push

## Organic channels to hit first
- Kelowna/Okanagan Facebook groups that allow event/community posts
- Venue/event organizer Instagram tags
- Reddit: r/kelowna when appropriate; don't spam, frame as useful local tool
- Direct DMs to venues: “we included your event this week, feel free to share”
- Partner cross-posting: wineries, breweries, live-music venues, markets

## Venue DM template
> Hey — we featured your event on OK LET'S GO this week, a quick curated Okanagan events guide. If you want to share it: https://okletsgo.ca/?utm_source=venue&utm_medium=dm&utm_campaign=featured_event

## Tiny paid test once PostHog is active
Budget: $50–$100 CAD for 7 days.
- Platform: Instagram/Facebook local radius around Kelowna
- Audience: 19–45, Kelowna + West Kelowna + Lake Country + Penticton
- Creative: screenshot/video of the weekly cards
- Objective: traffic or landing-page views
- Stop if newsletter signup cost is bad or bounce/no card clicks are high

## Do not spend before
- `NEXT_PUBLIC_POSTHOG_KEY` is live in Vercel
- One test visit appears in PostHog
- Newsletter signup event appears in PostHog

## Immediate manual TODO for Sam
1. Add `NEXT_PUBLIC_POSTHOG_KEY` in Vercel.
2. Create/claim Instagram + Facebook page handles for OK LET'S GO.
3. Post Monday/Wednesday/Friday using the UTM links above.
