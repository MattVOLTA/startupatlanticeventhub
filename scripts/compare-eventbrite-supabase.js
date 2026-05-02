/**
 * Compare Eventbrite API results vs Supabase vs what the app shows (useEvents).
 *
 * App query: is_shareable = true, end_date >= now
 * Sync script: Eventbrite window now .. now+6 months, single page (no pagination)
 *
 * Usage: node scripts/compare-eventbrite-supabase.js
 */
import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!EVENTBRITE_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_EVENTBRITE_TOKEN, VITE_SUPABASE_URL, or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** All pages for organizer events (sync script only uses page 1). */
async function fetchAllEventbriteEvents(organizerId, rangeStart, rangeEnd) {
  const base = {
    order_by: 'start_asc',
    'start_date.range_start': rangeStart,
    'start_date.range_end': rangeEnd,
    expand: 'venue',
    status: 'live,started,ended',
  };

  const all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page < 200) {
    const params = new URLSearchParams({ ...base, page: String(page) });
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/?${params}`,
      { headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err, events: [] };
    }

    const data = await res.json();
    const ev = data.events || [];
    all.push(...ev);
    hasMore = data.pagination?.has_more_items === true;
    page += 1;
  }

  return { error: null, events: all };
}

function isoStartOfDayPlusMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('.')[0] + 'Z';
}

const now = new Date();
const nowIso = now.toISOString().split('.')[0] + 'Z';

async function main() {
  const sixMonthEnd = isoStartOfDayPlusMonths(6);
  const twoYearEnd = isoStartOfDayPlusMonths(24);

  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, eventbrite_id')
    .order('name');

  if (orgErr) throw orgErr;

  const { data: dbEvents, error: evErr } = await supabase
    .from('events')
    .select('id, name, end_date, start_date, is_shareable, organization_id, organizations(name, eventbrite_id)');

  if (evErr) throw evErr;

  const nowMs = Date.now();

  const ebById = new Map();
  /** Eventbrite events with end >= now (from 24mo start-date window, all pages). */
  const ebFutureAll = [];
  const orgErrors = [];

  for (const org of orgs) {
    const { error, events } = await fetchAllEventbriteEvents(org.eventbrite_id, nowIso, twoYearEnd);
    if (error?.error === 'NOT_FOUND') {
      orgErrors.push({ org: org.name, eventbrite_id: org.eventbrite_id, reason: 'NOT_FOUND' });
      await delay(150);
      continue;
    }
    if (error) {
      orgErrors.push({ org: org.name, eventbrite_id: org.eventbrite_id, reason: JSON.stringify(error).slice(0, 120) });
      await delay(150);
      continue;
    }

    for (const e of events) {
      const endMs = new Date(e.end.utc).getTime();
      const row = {
        id: e.id,
        name: e.name?.text || '',
        start: e.start.utc,
        end: e.end.utc,
        shareable: !!e.shareable,
        status: e.status,
        online: !!e.online_event,
        organizer_id: org.eventbrite_id,
        org_name: org.name,
        org_uuid: org.id,
      };

      ebById.set(String(e.id), row);

      if (endMs >= nowMs) {
        ebFutureAll.push(row);
      }
    }
    await delay(120);
  }

  // Refine "6 month sync window" to match sync: start in [now, sixMonthEnd]
  const sixStart = new Date(nowIso).getTime();
  const sixEnd = new Date(sixMonthEnd).getTime();
  const ebInSyncWindow = ebFutureAll.filter((e) => {
    const s = new Date(e.start).getTime();
    return s >= sixStart && s <= sixEnd;
  });

  const dbById = new Map((dbEvents || []).map((e) => [String(e.id), e]));

  const dbFuture = (dbEvents || []).filter((e) => new Date(e.end_date).getTime() >= nowMs);
  const appVisible = dbFuture.filter((e) => e.is_shareable === true);

  const ebFutureIds = new Set(ebFutureAll.map((e) => String(e.id)));

  const onEbNotDb = ebFutureAll.filter((e) => !dbById.has(String(e.id)));
  const inDbNotEbFuture = dbFuture.filter((e) => !ebFutureIds.has(String(e.id)));
  const onEbShareableNotDb = onEbNotDb.filter((e) => e.shareable);

  const ebNotShareable = ebFutureAll.filter((e) => !e.shareable);

  console.log('\n=== Summary (future = Eventbrite end time >= now) ===\n');
  console.log('Eventbrite future events (24mo list window, paginated):     ', ebFutureAll.length);
  console.log('  … also shareable on Eventbrite:                           ', ebFutureAll.filter((e) => e.shareable).length);
  console.log('  … NOT shareable on Eventbrite:                            ', ebNotShareable.length);
  console.log('Eventbrite events with start in sync window [now, +6mo]:    ', ebInSyncWindow.length);
  console.log('Supabase events with end_date >= now:                      ', dbFuture.length);
  console.log('App list (same as useEvents: shareable + end >= now):      ', appVisible.length);
  console.log('Organizers with invalid / missing Eventbrite ID (404 etc.):', orgErrors.length);

  console.log('\n=== Gaps ===\n');
  console.log('Future on Eventbrite but NO row in Supabase:               ', onEbNotDb.length);
  console.log('  … of those, shareable=true on Eventbrite (would list):   ', onEbShareableNotDb.length);
  console.log('Future in Supabase but not in Eventbrite 24mo fetch:       ', inDbNotEbFuture.length);

  console.log('\n=== Future Eventbrite events missing from DB (first 25) ===\n');
  onEbNotDb.slice(0, 25).forEach((e) => {
    console.log(`- ${e.id} | ${e.org_name}`);
    console.log(`  ${e.name.slice(0, 80)}${e.name.length > 80 ? '…' : ''}`);
    console.log(`  start ${e.start} | shareable: ${e.shareable}`);
  });
  if (onEbNotDb.length > 25) console.log(`… and ${onEbNotDb.length - 25} more`);

  console.log('\n=== In Supabase (future) but not returned in Eventbrite 24mo list ===\n');
  inDbNotEbFuture.slice(0, 15).forEach((e) => {
    const on = e.organizations?.name || e.organization_id;
    console.log(`- ${e.id} | ${on}`);
    console.log(`  ${(e.name || '').slice(0, 80)}`);
  });
  if (inDbNotEbFuture.length > 15) console.log(`… and ${inDbNotEbFuture.length - 15} more`);

  console.log('\n=== Why app might show fewer than Eventbrite future ===\n');
  console.log(
    'Eventbrite future events that would be hidden if synced (is_shareable false):',
    ebFutureAll.filter((e) => !e.shareable).length
  );
  console.log(
    'Future EB events in DB but app hides (is_shareable false in DB):',
    dbFuture.filter((e) => !e.is_shareable).length
  );

  if (orgErrors.length) {
    console.log('\n=== Organizer API errors ===\n');
    orgErrors.slice(0, 20).forEach((o) => console.log(`- ${o.org} (${o.eventbrite_id}): ${o.reason}`));
    if (orgErrors.length > 20) console.log(`… and ${orgErrors.length - 20} more`);
  }

  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
