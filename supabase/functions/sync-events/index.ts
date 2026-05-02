/**
 * Scheduled Eventbrite -> Supabase sync plus OpenAI interest analysis.
 *
 * Required production secrets:
 *   EVENTBRITE_TOKEN, OPENAI_API_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional secrets:
 *   OPENAI_CATEGORY_MODEL (default: gpt-5.4-mini)
 *   MAX_ANALYZE_EVENTS (default: 50)
 *   ALLOW_SYNC_WITHOUT_SECRET=true (local dev only)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_REASONING_EFFORT = "none";
const DEFAULT_MAX_ANALYZE_EVENTS = 50;
const DEFAULT_ANALYSIS_BATCH_SIZE = 10;
const SYNC_LOOKBACK_DAYS = 7;
const MAX_DELETION_PERCENTAGE = 40;
const MIN_LIVE_EVENTS_FOR_DELETION = 1;

interface EbEvent {
  id: string;
  name?: { text?: string };
  description?: { text?: string };
  start?: { utc?: string };
  end?: { utc?: string };
  url?: string;
  status?: string;
  online_event?: boolean;
  is_free?: boolean;
  shareable?: boolean;
  venue?: {
    name?: string;
    address?: {
      localized_address_display?: string;
      city?: string;
    };
  };
  logo?: { url?: string };
}

interface Organization {
  id: string;
  name: string;
  eventbrite_id?: string | null;
}

interface EventRow {
  id: string;
  name: string;
  description: string | null;
  detailed_summary: string | null;
  start_date: string;
  end_date: string;
  url: string | null;
  status: string | null;
  is_online: boolean | null;
  is_free: boolean | null;
  is_shareable: boolean | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  logo_url: string | null;
  organization_id: string;
}

type AnalysisEvent = EventRow & {
  organization_name?: string;
};

interface Interest {
  id: string;
  name: string;
  description: string;
}

interface RequestBody {
  dryRun?: boolean;
  analyze?: boolean;
  sync?: boolean;
  maxAnalyzeEvents?: number;
  analysisBatchSize?: number;
  analyzeRecentEventsLimit?: number;
  maxOrganizations?: number;
}

type Supabase = ReturnType<typeof createClient<any, "public", any>>;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isoNoMillis(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function bool(value: unknown): boolean {
  return value === true;
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function eventChanged(existing: EventRow | undefined, next: EventRow): boolean {
  if (!existing) return true;

  const textFields: Array<keyof EventRow> = [
    "name",
    "description",
    "detailed_summary",
    "status",
    "url",
    "venue_name",
    "venue_address",
    "venue_city",
    "logo_url",
    "organization_id",
  ];

  for (const field of textFields) {
    if (text(existing[field]) !== text(next[field])) return true;
  }

  if (!sameInstant(existing.start_date, next.start_date)) return true;
  if (!sameInstant(existing.end_date, next.end_date)) return true;
  if (bool(existing.is_online) !== bool(next.is_online)) return true;
  if (bool(existing.is_free) !== bool(next.is_free)) return true;
  if (bool(existing.is_shareable) !== bool(next.is_shareable)) return true;

  return false;
}

async function fetchStructuredContent(
  eventId: string,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/${eventId}/structured_content/`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.modules) return null;

    const textContent = (data.modules as Array<{
      type: string;
      data?: { body?: { html?: string; text?: string } };
    }>)
      .map((module) => {
        if (module.type === "text" && module.data?.body) {
          const body = module.data.body;
          return stripHtml(body.html || body.text || "");
        }
        return "";
      })
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

    return textContent || null;
  } catch (error) {
    console.error(`structured_content ${eventId}:`, error);
    return null;
  }
}

async function fetchAllEventbriteEvents(
  organizerId: string,
  token: string,
): Promise<EbEvent[]> {
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - SYNC_LOOKBACK_DAYS);
  const rangeEnd = addMonths(now, 6);

  const all: EbEvent[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page < 100) {
    const params = new URLSearchParams({
      order_by: "start_asc",
      "start_date.range_start": isoNoMillis(rangeStart),
      "start_date.range_end": isoNoMillis(rangeEnd),
      expand: "venue,ticket_classes,organizer",
      status: "live,started,ended",
      page: String(page),
    });

    const response = await fetch(
      `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      if (response.status === 404) return [];
      console.error(`Eventbrite ${organizerId} page ${page}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const events = (data.events || []) as EbEvent[];
    all.push(...events);
    hasMore = data.pagination?.has_more_items === true;
    page += 1;
  }

  return all;
}

async function mapInChunks<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

async function validateEventbriteToken(token: string): Promise<boolean> {
  const response = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

async function fetchExistingEvents(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, EventRow>> {
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,description,detailed_summary,start_date,end_date,url,status,is_online,is_free,is_shareable,venue_name,venue_address,venue_city,logo_url,organization_id",
    )
    .in("id", ids);

  if (error) throw error;
  return new Map(((data || []) as EventRow[]).map((event) => [String(event.id), event]));
}

function toEventRow(
  event: EbEvent,
  organizationId: string,
  existing?: EventRow,
  detailedSummary?: string | null,
): EventRow {
  return {
    id: String(event.id),
    name: event.name?.text || "",
    description: event.description?.text || "",
    detailed_summary: detailedSummary ?? existing?.detailed_summary ?? null,
    start_date: event.start?.utc || new Date().toISOString(),
    end_date: event.end?.utc || new Date().toISOString(),
    url: event.url || "",
    status: event.status || null,
    is_online: !!event.online_event,
    is_free: !!event.is_free,
    is_shareable: !!event.shareable,
    venue_name: event.venue?.name ?? null,
    venue_address: event.venue?.address?.localized_address_display ?? null,
    venue_city: event.venue?.address?.city ?? null,
    logo_url: event.logo?.url ?? null,
    organization_id: organizationId,
  };
}

async function removeCancelledEventsForOrg(
  supabase: Supabase,
  org: Organization,
  fetchedEventIds: Set<string>,
  log: string[],
  dryRun: boolean,
): Promise<number> {
  const { data, error } = await supabase
    .from("events")
    .select("id,name")
    .eq("organization_id", org.id)
    .gte("end_date", new Date().toISOString());

  if (error) throw error;
  const dbEvents = (data || []) as Array<{ id: string; name: string }>;
  if (!dbEvents.length) return 0;

  if (fetchedEventIds.size < MIN_LIVE_EVENTS_FOR_DELETION) {
    log.push(`${org.name}: skipped cancellation cleanup; Eventbrite returned too few events`);
    return 0;
  }

  const cancelled = dbEvents.filter((event) => !fetchedEventIds.has(String(event.id)));
  if (!cancelled.length) return 0;

  const deletionPercentage = (cancelled.length / dbEvents.length) * 100;
  if (deletionPercentage > MAX_DELETION_PERCENTAGE) {
    log.push(
      `${org.name}: skipped cancellation cleanup; ${deletionPercentage.toFixed(1)}% exceeds ${MAX_DELETION_PERCENTAGE}% safety limit`,
    );
    return 0;
  }

  if (dryRun) {
    log.push(`${org.name}: dry run would remove ${cancelled.length} cancelled events`);
    return 0;
  }

  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .in("id", cancelled.map((event) => event.id));

  if (deleteError) throw deleteError;
  log.push(`${org.name}: removed ${cancelled.length} cancelled events`);
  return cancelled.length;
}

async function syncEvents(
  supabase: Supabase,
  eventbriteToken: string,
  log: string[],
  options: { dryRun: boolean; maxOrganizations?: number },
): Promise<{ changedEvents: AnalysisEvent[]; upserted: number; cancelledRemoved: number }> {
  const changedEvents: AnalysisEvent[] = [];
  let upserted = 0;
  let cancelledRemoved = 0;

  if (options.dryRun) {
    log.push("Dry run: database writes are disabled.");
  } else {
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .lt("end_date", new Date().toISOString());
    if (deleteError) throw deleteError;
    log.push("Deleted past events.");
  }

  const { data: organizations, error: orgError } = await supabase
    .from("organizations")
    .select("id,name,eventbrite_id")
    .order("name");

  if (orgError) throw orgError;

  const orgs = ((organizations || []) as Organization[])
    .filter((org) => text(org.eventbrite_id))
    .slice(0, options.maxOrganizations || undefined);

  log.push(`Processing ${orgs.length} organizations.`);

  for (const org of orgs) {
    const organizerId = text(org.eventbrite_id);
    try {
      const rawEvents = await fetchAllEventbriteEvents(organizerId, eventbriteToken);
      const fetchedEventIds = new Set(rawEvents.map((event) => String(event.id)));
      log.push(`${org.name}: ${rawEvents.length} Eventbrite events`);

      const existing = await fetchExistingEvents(supabase, [...fetchedEventIds]);
      const processedEvents = await mapInChunks(rawEvents, 8, async (event) => {
        const previous = existing.get(String(event.id));
        const detailedSummary = await fetchStructuredContent(String(event.id), eventbriteToken);
        return toEventRow(event, org.id, previous, detailedSummary);
      });

      const changed = processedEvents.filter((event) =>
        eventChanged(existing.get(String(event.id)), event)
      );

      if (changed.length) {
        changedEvents.push(
          ...changed
            .filter((event) =>
              bool(event.is_shareable) && new Date(event.end_date).getTime() >= Date.now()
            )
            .map((event) => ({ ...event, organization_name: org.name })),
        );
      }

      if (changed.length && !options.dryRun) {
        const { error: upsertError } = await supabase
          .from("events")
          .upsert(changed as unknown as Array<Record<string, unknown>>, { onConflict: "id" });
        if (upsertError) throw upsertError;
        upserted += changed.length;
      }

      cancelledRemoved += await removeCancelledEventsForOrg(
        supabase,
        org,
        fetchedEventIds,
        log,
        options.dryRun,
      );

      log.push(`${org.name}: ${changed.length} new or changed events`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.push(`${org.name}: ${msg}`);
      console.error(org.name, error);
    }

    await delay(150);
  }

  return { changedEvents, upserted, cancelledRemoved };
}

function buildSystemPrompt(interests: Interest[]): string {
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
${interests.map((interest) => `- ${interest.name}: ${interest.description}`).join("\n")}`;
}

function buildResponseSchema(interestNames: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["results"],
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["event_id", "matches"],
          properties: {
            event_id: {
              type: "string",
            },
            matches: {
              type: "array",
              minItems: 1,
              items: {
                type: "string",
                enum: interestNames,
              },
            },
          },
        },
      },
    },
  };
}

function extractOutputText(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string") return response.output_text;

  const chunks: string[] = [];
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: Array<Record<string, unknown>> }).content
      : [];
    for (const part of content) {
      if (
        (part.type === "output_text" || part.type === "text") &&
        typeof part.text === "string"
      ) {
        chunks.push(part.text);
      }
      if (part.type === "refusal" && typeof part.refusal === "string") {
        throw new Error(`OpenAI refusal: ${part.refusal}`);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function getInterests(
  supabase: Supabase,
): Promise<Interest[]> {
  const { data, error } = await supabase
    .from("interests")
    .select("id,name,description")
    .order("name");

  if (error) throw error;
  const interests = (data || []) as Interest[];
  if (!interests.length) throw new Error("No interests found");
  return interests;
}

async function analyzeEventBatch(
  events: AnalysisEvent[],
  interests: Interest[],
  openAiKey: string,
  model: string,
  reasoningEffort: string,
): Promise<Array<{ event: EventRow; interestNames: string[] }>> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: {
        effort: reasoningEffort,
      },
      instructions: buildSystemPrompt(interests),
      input: JSON.stringify({
        events: events.map(toPromptEvent),
      }),
      text: {
        format: {
          type: "json_schema",
          name: "event_interest_matches_batch",
          strict: true,
          schema: buildResponseSchema(interests.map((interest) => interest.name)),
        },
      },
      max_output_tokens: Math.max(800, events.length * 90),
      store: false,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI ${response.status}: ${details.slice(0, 500)}`);
  }

  const json = await response.json();
  const textOutput = extractOutputText(json);
  if (!textOutput) throw new Error("OpenAI response did not include output text");

  const parsed = JSON.parse(textOutput) as {
    results?: Array<{ event_id?: string; matches?: string[] }>;
  };
  const allowed = new Set(interests.map((interest) => interest.name));
  const byId = new Map<string, string[]>();

  for (const result of parsed.results || []) {
    const eventId = String(result.event_id || "");
    if (!eventId) continue;
    byId.set(eventId, [
      ...new Set((result.matches || []).filter((name) => allowed.has(name))),
    ]);
  }

  return events.map((event) => ({
    event,
    interestNames: byId.get(String(event.id)) || [],
  }));
}

function toPromptEvent(event: AnalysisEvent) {
  return {
    event_id: String(event.id),
    name: event.name,
    organization_name: event.organization_name || "",
    description: event.description || "",
    detailed_summary: event.detailed_summary || "",
    start_date: event.start_date,
    end_date: event.end_date,
    status: event.status || "",
    url: event.url || "",
    is_online: event.is_online === true,
    is_free: event.is_free === true,
    venue: {
      name: event.venue_name || "",
      address: event.venue_address || "",
      city: event.venue_city || "",
    },
  };
}

async function saveEventInterests(
  supabase: Supabase,
  eventId: string,
  interestNames: string[],
  interests: Interest[],
): Promise<number> {
  const { error: deleteError } = await supabase
    .from("event_interests")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) throw deleteError;

  const interestIdByName = new Map(interests.map((interest) => [interest.name, interest.id]));
  const rows = interestNames
    .map((name) => interestIdByName.get(name))
    .filter((id): id is string => !!id)
    .map((interestId) => ({
      event_id: eventId,
      interest_id: interestId,
    }));

  if (!rows.length) return 0;

  const { error: insertError } = await supabase.from("event_interests").insert(rows);
  if (insertError) throw insertError;
  return rows.length;
}

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function analyzeChangedEvents(
  supabase: Supabase,
  events: AnalysisEvent[],
  openAiKey: string,
  model: string,
  reasoningEffort: string,
  maxEvents: number,
  batchSize: number,
  log: string[],
  dryRun: boolean,
): Promise<{ analyzed: number; analysisErrors: number; interestRows: number }> {
  const interests = await getInterests(supabase);
  const limitedEvents = events.slice(0, maxEvents);
  let analyzed = 0;
  let analysisErrors = 0;
  let interestRows = 0;

  if (events.length > limitedEvents.length) {
    log.push(`Analysis limited to ${limitedEvents.length} of ${events.length} changed events`);
  }

  for (const batch of chunksOf(limitedEvents, Math.max(1, batchSize))) {
    try {
      const results = await analyzeEventBatch(batch, interests, openAiKey, model, reasoningEffort);
      for (const { event, interestNames } of results) {
        if (!dryRun) {
          interestRows += await saveEventInterests(supabase, event.id, interestNames, interests);
        }
        analyzed += 1;
        log.push(`${event.name}: ${interestNames.length ? interestNames.join(", ") : "no interests"}`);
      }
    } catch (error) {
      analysisErrors += batch.length;
      const msg = error instanceof Error ? error.message : String(error);
      log.push(`Analysis batch failed (${batch.length} events): ${msg}`);
      console.error("analysis batch", error);
    }
  }

  return { analyzed, analysisErrors, interestRows };
}

async function fetchRecentEventsForDryRunAnalysis(
  supabase: Supabase,
  limit: number,
): Promise<AnalysisEvent[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,description,detailed_summary,start_date,end_date,url,status,is_online,is_free,is_shareable,venue_name,venue_address,venue_city,logo_url,organization_id,organizations(name)",
    )
    .eq("is_shareable", true)
    .gte("start_date", since.toISOString())
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data || []) as Array<EventRow & { organizations?: { name?: string } }>).map((
    event,
  ) => ({
    ...event,
    organization_name: event.organizations?.name || "",
  }));
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const allowUnauth = Deno.env.get("ALLOW_SYNC_WITHOUT_SECRET") === "true";
  const headerSecret = req.headers.get("x-cron-secret");

  if (!cronSecret && !allowUnauth) {
    return jsonResponse({
      error:
        "Set CRON_SECRET (Edge secret) or ALLOW_SYNC_WITHOUT_SECRET=true for local dev only",
    }, 500);
  }

  if (cronSecret && headerSecret !== cronSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const syncEnabled = body.sync !== false;
  const analyzeEnabled = body.analyze !== false;
  const dryRun = body.dryRun === true;
  const eventbriteToken = Deno.env.get("EVENTBRITE_TOKEN");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const model = Deno.env.get("OPENAI_CATEGORY_MODEL") || DEFAULT_MODEL;
  const reasoningEffort = Deno.env.get("OPENAI_REASONING_EFFORT") || DEFAULT_REASONING_EFFORT;
  const maxAnalyzeEvents = body.maxAnalyzeEvents ||
    envNumber("MAX_ANALYZE_EVENTS", DEFAULT_MAX_ANALYZE_EVENTS);
  const analysisBatchSize = body.analysisBatchSize ||
    envNumber("ANALYSIS_BATCH_SIZE", DEFAULT_ANALYSIS_BATCH_SIZE);

  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    }, 500);
  }

  if (syncEnabled && !eventbriteToken) {
    return jsonResponse({ error: "Missing EVENTBRITE_TOKEN" }, 500);
  }

  if (analyzeEnabled && !dryRun && !openAiKey) {
    return jsonResponse({ error: "Missing OPENAI_API_KEY" }, 500);
  }

  if (syncEnabled && eventbriteToken && !(await validateEventbriteToken(eventbriteToken))) {
    return jsonResponse({ error: "Invalid Eventbrite token" }, 502);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const started = Date.now();
  const log: string[] = [];

  try {
    log.push("Starting scheduled event sync and analysis.");
    const syncResult = syncEnabled && eventbriteToken
      ? await syncEvents(supabase, eventbriteToken, log, {
        dryRun,
        maxOrganizations: body.maxOrganizations,
      })
      : { changedEvents: [], upserted: 0, cancelledRemoved: 0 };

    const analysisEvents = body.analyzeRecentEventsLimit && dryRun
      ? await fetchRecentEventsForDryRunAnalysis(supabase, body.analyzeRecentEventsLimit)
      : syncResult.changedEvents;

    if (body.analyzeRecentEventsLimit && dryRun) {
      log.push(`Dry run: analyzing ${analysisEvents.length} recent existing events for verification.`);
    }

    const analysisResult = analyzeEnabled && openAiKey && analysisEvents.length
      ? await analyzeChangedEvents(
        supabase,
        analysisEvents,
        openAiKey,
        model,
        reasoningEffort,
        maxAnalyzeEvents,
        analysisBatchSize,
        log,
        dryRun,
      )
      : { analyzed: 0, analysisErrors: 0, interestRows: 0 };

    const durationMs = Date.now() - started;
    log.push(`Completed in ${durationMs}ms.`);

    return jsonResponse({
      ok: true,
      dryRun,
      model,
      reasoningEffort,
      durationMs,
      upserted: syncResult.upserted,
      changedEvents: syncResult.changedEvents.length,
      cancelledRemoved: syncResult.cancelledRemoved,
      analyzed: analysisResult.analyzed,
      analysisErrors: analysisResult.analysisErrors,
      interestRows: analysisResult.interestRows,
      log,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(error);
    return jsonResponse({ ok: false, error: msg, log }, 500);
  }
});
