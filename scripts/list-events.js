import 'dotenv/config';
import fetch from 'node-fetch';

const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;

if (!EVENTBRITE_TOKEN) {
  console.error('Missing VITE_EVENTBRITE_TOKEN environment variable');
  process.exit(1);
}

const ORGANIZER_ID = '33348151359';

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

  console.log(`Fetching events for organizer ${organizerId}...`);

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
      console.error(`Failed to fetch events: HTTP error! status: ${response.status}`);
      const errorData = await response.text();
      console.error(`Error details: ${errorData}`);
      return [];
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`Error fetching events for organizer ${organizerId}:`, error);
    return [];
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

async function listEvents() {
  try {
    const events = await fetchEventbriteEvents(ORGANIZER_ID);
    
    if (events.length === 0) {
      console.log('No events found for this organizer');
      return;
    }
    
    console.log(`\nFound ${events.length} events for organizer ID ${ORGANIZER_ID}:\n`);
    
    events.forEach((event, index) => {
      console.log(`----- Event ${index + 1} -----`);
      console.log(`Name: ${event.name.text}`);
      console.log(`Status: ${event.status}`);
      console.log(`Start: ${formatDate(event.start.utc)} UTC`);
      console.log(`End: ${formatDate(event.end.utc)} UTC`);
      console.log(`Venue: ${event.venue?.name || 'Online'}`);
      console.log(`Location: ${event.venue?.address?.localized_address_display || 'N/A'}`);
      console.log(`URL: ${event.url}`);
      console.log(`Online Event: ${event.online_event ? 'Yes' : 'No'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing events:', error);
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
  return listEvents();
})
.catch(error => {
  console.error('Failed to validate Eventbrite token:', error);
  process.exit(1);
}); 