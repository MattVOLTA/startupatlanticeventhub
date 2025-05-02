import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getInterests() {
  const { data: interests, error } = await supabase
    .from('interests')
    .select('id, name, description')
    .order('name');

  if (error) throw error;
  return interests;
}

async function getEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, description, detailed_summary');

  if (error) throw error;
  return events;
}

async function analyzeEvent(event, interests, systemPrompt) {
  const eventContent = {
    name: event.name,
    description: event.description || '',
    detailed_summary: event.detailed_summary || ''
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: JSON.stringify(eventContent)
        }
      ],
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error(`Error analyzing event ${event.id}:`, error);
    return null;
  }
}

async function saveEventInterests(eventId, interestMatches, interests) {
  // Delete existing interests for this event
  const { error: deleteError } = await supabase
    .from('event_interests')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    console.error(`Error deleting existing interests for event ${eventId}:`, deleteError);
    return;
  }

  // Create interest mappings
  const interestNameToId = {};
  for (const interest of interests) {
    interestNameToId[interest.name] = interest.id;
  }

  // Prepare new interest associations
  const eventInterests = Object.keys(interestMatches)
    .filter(interestName => interestNameToId[interestName]) // Only include interests that exist in our database
    .map(interestName => ({
      event_id: eventId,
      interest_id: interestNameToId[interestName]
    }));

  if (eventInterests.length > 0) {
    const { error: insertError } = await supabase
      .from('event_interests')
      .insert(eventInterests);

    if (insertError) {
      console.error(`Error inserting interests for event ${eventId}:`, insertError);
    }
  }
}

async function main() {
  try {
    // Get interests and create system prompt
    const interests = await getInterests();
    const systemPrompt = `You will be provided with the name, description, and summary of an event. Your task is to analyze this information and assign the most relevant interest areas from the following list. Each interest area is defined with a specific focus to ensure accurate categorization. Please include all relevant interest areas, as multiple may apply.

${interests.map(i => `${i.name}: ${i.description}`).join('\n\n')}

Return your analysis in valid JSON format with interest names as keys and brief explanations as values. Only use the exact interest names provided above as keys.`;

    // Get events
    const events = await getEvents();
    console.log(`Found ${events.length} events to analyze`);

    // Process each event
    for (const event of events) {
      console.log(`\nAnalyzing event: ${event.name}`);
      
      const analysis = await analyzeEvent(event, interests, systemPrompt);
      
      if (analysis) {
        console.log('Matched interests:', Object.keys(analysis).join(', '));
        await saveEventInterests(event.id, analysis, interests);
        console.log('✓ Interests saved successfully');
      }

      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nAnalysis completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();