import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!EVENTBRITE_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchEventbriteEvents(organizerId) {
  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  
  const params = new URLSearchParams({
    order_by: 'start_asc',
    'start_date.range_start': now.toISOString().split('.')[0] + 'Z',
    'start_date.range_end': sixMonthsFromNow.toISOString().split('.')[0] + 'Z',
    expand: 'venue,ticket_classes,organizer',
    status: 'live,started,ended'
  });

  console.log(`Fetching: https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/?${params}`);

  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      console.log(`Failed to fetch from ${response.url}: HTTP error! status: ${response.status}`);
      return [];
    }

    console.log(`Successfully fetched events from ${response.url}`);
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`Error fetching events for organizer ${organizerId}:`, error);
    return [];
  }
}

function stripHtml(html) {
  // Basic HTML stripping - you might want to use a proper HTML parser for production
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
}

async function fetchStructuredContent(eventId) {
  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/${eventId}/structured_content/`,
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data && data.modules) {
      const textContent = data.modules
        .map(module => {
          if (module.type === 'text' && module.data && module.data.body) {
            // Strip HTML and clean up the text
            return stripHtml(module.data.body.html || module.data.body.text);
          }
          return '';
        })
        .filter(text => text.length > 0)
        .join('\n\n');

      return textContent;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching structured content for event ${eventId}:`, error);
    return null;
  }
}

async function syncEvents() {
  try {
    // Test connection first
    console.log('Starting event sync...');
    const { data: testData, error: testError } = await supabase.from('events').select('count');
    if (testError) throw testError;
    console.log('Successfully connected to Supabase');

    // Delete old events
    console.log('Deleting old events...');
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .lt('end_date', new Date().toISOString());
    
    if (deleteError) throw deleteError;
    console.log('Successfully deleted past events');

    // Get organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*');

    if (orgError) throw orgError;
    console.log(`Found ${organizations.length} organizations to process\n`);

    // Process each organization
    for (const org of organizations) {
      console.log(`\nProcessing ${org.name} (ID: ${org.eventbrite_id})...`);
      
      try {
        const events = await fetchEventbriteEvents(org.eventbrite_id);
        console.log(`Found ${events.length} events for ${org.name}`);

        if (events.length > 0) {
          // Process events
          const processedEvents = await Promise.all(
            events.map(async (event) => {
              const detailedSummary = await fetchStructuredContent(event.id);
              
              return {
                id: event.id,
                name: event.name.text,
                description: event.description?.text || '',
                detailed_summary: detailedSummary,
                start_date: event.start.utc,
                end_date: event.end.utc,
                url: event.url,
                is_online: event.online_event,
                is_shareable: event.shareable,
                venue_name: event.venue?.name,
                venue_address: event.venue?.address?.localized_address_display,
                venue_city: event.venue?.address?.city,
                logo_url: event.logo?.url,
                organization_id: org.id
              };
            })
          );

          // Upsert events to database
          const { error: upsertError } = await supabase
            .from('events')
            .upsert(processedEvents, {
              onConflict: 'id'
            });

          if (upsertError) {
            throw new Error(`Failed to upsert events: ${upsertError.message}`);
          }

          console.log(`✓ Successfully processed ${events.length} events for ${org.name}`);
        }

        // Wait between organizations to avoid rate limits
        await delay(1000);
      } catch (error) {
        console.error(`✗ Error processing ${org.name}:`, error.message);
      }
    }

    console.log('\nSync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

// Validate Eventbrite token
fetch('https://www.eventbriteapi.com/v3/users/me/', {
  headers: {
    'Authorization': `Bearer ${EVENTBRITE_TOKEN}`
  }
})
.then(response => {
  if (!response.ok) {
    throw new Error(`Invalid Eventbrite token (Status: ${response.status})`);
  }
  console.log('Eventbrite token validated successfully');
  return syncEvents();
})
.catch(error => {
  console.error('Failed to validate Eventbrite token:', error);
  process.exit(1);
});