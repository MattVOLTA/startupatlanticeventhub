/**
 * Read-only harness: compare current Supabase event categories against a fresh
 * OpenAI classification pass for events from the last six months.
 *
 * Usage:
 *   npm run compare-category-model
 *   EVENT_LIMIT=25 OPENAI_BATCH_SIZE=10 OPENAI_CONCURRENCY=5 npm run compare-category-model
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_CATEGORY_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const OPENAI_REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'none';
const EVENT_LIMIT = process.env.EVENT_LIMIT ? Number.parseInt(process.env.EVENT_LIMIT, 10) : undefined;
const MONTHS_BACK = process.env.MONTHS_BACK ? Number.parseInt(process.env.MONTHS_BACK, 10) : 6;
const REVIEW_LIMIT = process.env.REVIEW_LIMIT ? Number.parseInt(process.env.REVIEW_LIMIT, 10) : 25;
const BATCH_SIZE = process.env.OPENAI_BATCH_SIZE ? Number.parseInt(process.env.OPENAI_BATCH_SIZE, 10) : 10;
const CONCURRENCY = process.env.OPENAI_CONCURRENCY ? Number.parseInt(process.env.OPENAI_CONCURRENCY, 10) : 10;
const MAX_OUTPUT_TOKENS = process.env.OPENAI_MAX_OUTPUT_TOKENS
  ? Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS, 10)
  : Math.max(800, BATCH_SIZE * 90);

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error(
    'Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY or VITE_OPENAI_API_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function monthsAgoIso(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

function buildSystemPrompt(interests) {
  return `You classify startup ecosystem events into interest categories.

All events are from startup ecosystem organizations. Use the full event object: title, organizer, description, detailed summary, date/time, online/free flags, venue, and URL. The detailed summary is usually the richest source. Use only the exact interest names provided below.

Optimize for helpful event discovery. The event topic should matter more than the event format. For example, an office-hours event about banking or capital should map to funding/operations before generic networking; a lunch-and-learn about tax should map to legal/compliance before generic networking. Include secondary categories when the topic, audience, activity, or intended outcome clearly overlaps with that category.

Calibration:
- loans, grants, banking, investors, venture capital, pitch decks, fundability, capital, financial readiness -> Fundraising & Investor Readiness.
- business registration, business structure, taxes, contracts, IP, privacy, regulation, compliance -> Legal Essentials & Compliance or Intellectual Property & Patents when IP-specific.
- business basics, business planning, operations, project management, budgeting, process, scaling, efficiency -> Operational Efficiency & Scaling.
- market expansion, trade missions, buyers, exports, sales channels, customer personas, product-market fit -> Customer Discovery & Growth and/or Marketing & Brand Strategy.
- AI, cloud, coding, cybersecurity, satellite data, automation, technical tools -> Technology & Innovation, plus Data-Driven Decision Making when analytics/data is central.
- wellness, workplace culture, hiring, team practices, inclusion, founder resilience -> Talent & Culture Building.
- explicit socials, mixers, meetups, demo days, community celebrations, trade-show connection opportunities, and broad founder office hours -> Networking & Social Events and/or Community Building & Partnerships.

Avoid categories with no meaningful connection, but choose at least one category for each event. Most events should have 2-5 categories, but one category is fine for tightly focused events.

Interest categories:
${interests.map((i) => `- ${i.name}: ${i.description}`).join('\n')}`;
}

function buildResponseSchema(interestNames) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['results'],
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['event_id', 'matches'],
          properties: {
            event_id: {
              type: 'string',
            },
            matches: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                enum: interestNames,
              },
            },
          },
        },
      },
    },
  };
}

function extractOutputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (
        (content.type === 'output_text' || content.type === 'text') &&
        typeof content.text === 'string'
      ) {
        chunks.push(content.text);
      }
      if (content.type === 'refusal' && content.refusal) {
        throw new Error(`OpenAI refusal: ${content.refusal}`);
      }
    }
  }

  return chunks.join('\n').trim();
}

async function classifyBatch(events, interests, systemPrompt, schema) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: {
        effort: OPENAI_REASONING_EFFORT,
      },
      instructions: systemPrompt,
      input: JSON.stringify({
        events: events.map(toPromptEvent),
      }),
      text: {
        format: {
          type: 'json_schema',
          name: 'event_interest_comparison_batch',
          strict: true,
          schema,
        },
      },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI ${response.status}: ${details.slice(0, 700)}`);
  }

  const json = await response.json();
  const text = extractOutputText(json);
  if (!text) throw new Error('OpenAI response did not include output text');

  const parsed = JSON.parse(text);
  const allowed = new Set(interests.map((i) => i.name));
  const byId = new Map();

  for (const result of parsed.results || []) {
    const eventId = String(result.event_id || '');
    if (!eventId) continue;
    const matches = [...new Set((result.matches || []).filter((name) => allowed.has(name)))].sort();
    byId.set(eventId, matches);
  }

  return events.map((event) => ({
    event,
    candidate: byId.get(String(event.id)) || [],
  }));
}

function toPromptEvent(event) {
  return {
    event_id: String(event.id),
    name: event.name,
    organization_name: event.organizations?.name || event.organization_name || '',
    description: event.description || '',
    detailed_summary: event.detailed_summary || '',
    start_date: event.start_date,
    end_date: event.end_date,
    status: event.status || '',
    url: event.url || '',
    is_online: event.is_online === true,
    is_free: event.is_free === true,
    venue: {
      name: event.venue_name || '',
      address: event.venue_address || '',
      city: event.venue_city || '',
    },
  };
}

async function getInterests() {
  const { data, error } = await supabase
    .from('interests')
    .select('id, name, description')
    .order('name');

  if (error) throw error;
  if (!data?.length) throw new Error('No interests found in Supabase');
  return data;
}

async function getEvents() {
  const since = monthsAgoIso(MONTHS_BACK);
  let query = supabase
    .from('events')
    .select(`
      id,
      name,
      description,
      detailed_summary,
      start_date,
      end_date,
      status,
      url,
      is_online,
      is_free,
      venue_name,
      venue_address,
      venue_city,
      organizations (
        name
      ),
      event_interests (
        interests (
          name
        )
      )
    `)
    .gte('start_date', since)
    .order('start_date', { ascending: true });

  if (EVENT_LIMIT) query = query.limit(EVENT_LIMIT);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function currentInterestNames(event) {
  return [
    ...new Set(
      (event.event_interests || [])
        .map((row) => row.interests?.name)
        .filter(Boolean),
    ),
  ].sort();
}

function diffSets(current, candidate) {
  const currentSet = new Set(current);
  const candidateSet = new Set(candidate);
  return {
    added: candidate.filter((name) => !currentSet.has(name)),
    removed: current.filter((name) => !candidateSet.has(name)),
  };
}

function chunksOf(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function runBatches(chunks, concurrency, fn) {
  const results = [];
  let next = 0;
  let completedEvents = 0;
  const totalEvents = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

  async function worker() {
    while (next < chunks.length) {
      const batchIndex = next++;
      const batch = chunks[batchIndex];
      console.log(`[batch ${batchIndex + 1}/${chunks.length}] ${batch.length} events`);
      const batchResults = await fn(batch);
      results.push(...batchResults);
      completedEvents += batch.length;
      console.log(`  completed ${completedEvents}/${totalEvents}`);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker()),
  );
  return results;
}

function printReport(results, elapsedSeconds) {
  const same = results.filter((r) => r.added.length === 0 && r.removed.length === 0);
  const changed = results.filter((r) => r.added.length || r.removed.length);
  const noCurrent = results.filter((r) => r.current.length === 0);
  const candidateEmpty = results.filter((r) => r.candidate.length === 0);
  const removalsOnly = changed.filter((r) => r.added.length === 0 && r.removed.length > 0);

  console.log('\n=== Category model comparison ===\n');
  console.log(`Model tested:                    ${OPENAI_MODEL}`);
  console.log(`Reasoning effort:                ${OPENAI_REASONING_EFFORT}`);
  console.log(`Batch size / concurrency:        ${BATCH_SIZE} / ${CONCURRENCY}`);
  console.log(`Elapsed time:                    ${elapsedSeconds.toFixed(1)}s`);
  console.log(`Events reviewed:                 ${results.length}`);
  console.log(`Unchanged category sets:         ${same.length}`);
  console.log(`Changed category sets:           ${changed.length}`);
  console.log(`Events with no current category: ${noCurrent.length}`);
  console.log(`New model returned no category:  ${candidateEmpty.length}`);
  console.log(`Removal-only changes:            ${removalsOnly.length}`);

  if (!changed.length) {
    console.log('\nNo category differences found.');
    return;
  }

  console.log(`\n=== Differences needing review (first ${Math.min(REVIEW_LIMIT, changed.length)}) ===\n`);
  changed
    .sort((a, b) => b.added.length + b.removed.length - (a.added.length + a.removed.length))
    .slice(0, REVIEW_LIMIT)
    .forEach((r, index) => {
      console.log(`${index + 1}. ${r.name}`);
      console.log(`   Event ID: ${r.id}`);
      console.log(`   Current: ${r.current.length ? r.current.join('; ') : '(none)'}`);
      console.log(`   ${OPENAI_MODEL}: ${r.candidate.length ? r.candidate.join('; ') : '(none)'}`);
      if (r.added.length) console.log(`   Added:   ${r.added.join('; ')}`);
      if (r.removed.length) console.log(`   Removed: ${r.removed.join('; ')}`);
      console.log('');
    });

  if (changed.length > REVIEW_LIMIT) {
    console.log(`...and ${changed.length - REVIEW_LIMIT} more changed events.`);
  }
}

async function main() {
  console.log(`Loading events from the last ${MONTHS_BACK} months...`);
  const [interests, events] = await Promise.all([getInterests(), getEvents()]);

  console.log(`Loaded ${interests.length} interests and ${events.length} events.`);
  if (!events.length) {
    console.log('No events found for comparison.');
    return;
  }

  const systemPrompt = buildSystemPrompt(interests);
  const schema = buildResponseSchema(interests.map((i) => i.name));
  const started = Date.now();
  const classified = await runBatches(
    chunksOf(events, BATCH_SIZE),
    CONCURRENCY,
    (batch) => classifyBatch(batch, interests, systemPrompt, schema),
  );

  const results = classified.map(({ event, candidate }) => {
    const current = currentInterestNames(event);
    const { added, removed } = diffSets(current, candidate);
    return {
      id: event.id,
      name: event.name,
      current,
      candidate,
      added,
      removed,
    };
  });

  printReport(results, (Date.now() - started) / 1000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
