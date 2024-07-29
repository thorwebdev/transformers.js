import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://buktbeyvzlhbalkpodkn.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a3RiZXl2emxoYmFsa3BvZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4ODk5MzgsImV4cCI6MjAzNzQ2NTkzOH0.zHIazuMNLhXUlYjplCRTIZIoj1wAUpocCx_2-zMyP1I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const channel = supabase.channel('cityjsconfsg');

function getLastFullSentence(message) {
  // Regular expression to match sentences ending with '.', '!', or '?'
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentences = message.match(sentenceRegex);

  // Return the last sentence if found, otherwise return an empty string
  return sentences ? sentences[sentences.length - 1].trim() : '';
}

let lastBroadcast = '';

export default function broadcast({ message, language }) {
  // TDOD: better chinese handling as there's no punctuaction.
  const lastSentence =
    language === 'zh' ? message : getLastFullSentence(message);
  if (lastSentence === lastBroadcast) return;
  console.log('broadcast', { message: lastSentence, language });
  channel.send({
    type: 'broadcast',
    event: 'transcript',
    payload: { message: lastSentence, language },
  });
  lastBroadcast = lastSentence;
}
