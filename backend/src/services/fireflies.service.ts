import supabase from '../config/supabase';
import { SyncResult } from '../types';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

// ─── GraphQL query ────────────────────────────────────────────────────────────

const TRANSCRIPTS_QUERY = `
  query Transcripts($fromDate: DateTime) {
    transcripts(fromDate: $fromDate) {
      id
      title
      date
      duration
      participants
      sentences {
        speaker_name
        text
      }
    }
  }
`;

// ─── Types returned by Fireflies API ─────────────────────────────────────────

interface FirefliesSentence {
  speaker_name: string;
  text: string;
}

interface FirefliesTranscript {
  id: string;
  title: string;
  date: string; // ISO timestamp
  duration: number; // seconds
  participants: string[];
  sentences: FirefliesSentence[];
}

interface FirefliesResponse {
  data?: {
    transcripts: FirefliesTranscript[];
  };
  errors?: { message: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts the sentences array into a single readable transcript string.
 */
function buildRawTranscript(sentences: FirefliesSentence[]): string {
  return sentences.map((s) => `${s.speaker_name}: ${s.text}`).join('\n');
}

/**
 * Returns an ISO string for 30 days ago.
 */
function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches transcripts from the last 30 days via the Fireflies GraphQL API
 * and upserts them into the Supabase `transcripts` table.
 *
 * When FIREFLIES_API_KEY is not set the function returns a mock result so
 * the rest of the app can be exercised without a real Fireflies account.
 */
export async function syncTranscripts(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: [] };

  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    console.warn('[fireflies.service] No FIREFLIES_API_KEY — skipping sync');
    result.errors.push('FIREFLIES_API_KEY not configured');
    return result;
  }

  // ── Fetch from Fireflies ──────────────────────────────────────────────────
  let ffTranscripts: FirefliesTranscript[] = [];

  try {
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: TRANSCRIPTS_QUERY,
        variables: { fromDate: thirtyDaysAgo() },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as FirefliesResponse;

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors.map((e) => e.message).join(', '));
    }

    ffTranscripts = json.data?.transcripts ?? [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fireflies API error: ${message}`);
    return result;
  }

  result.synced = ffTranscripts.length;

  // ── Fetch existing fireflies_ids from Supabase ────────────────────────────
  const ffIds = ffTranscripts.map((t) => t.id);
  const { data: existingRows, error: fetchError } = await supabase
    .from('transcripts')
    .select('id, fireflies_id')
    .in('fireflies_id', ffIds);

  if (fetchError) {
    result.errors.push(`Supabase fetch error: ${fetchError.message}`);
    return result;
  }

  const existingMap = new Map<string, string>(
    (existingRows ?? []).map((r: { id: string; fireflies_id: string }) => [r.fireflies_id, r.id])
  );

  // ── Upsert each transcript ────────────────────────────────────────────────
  for (const ff of ffTranscripts) {
    const row = {
      fireflies_id: ff.id,
      title: ff.title || 'Untitled Call',
      call_date: new Date(ff.date).toISOString(),
      duration_sec: ff.duration ?? 0,
      participants: ff.participants ?? [],
      raw_transcript: buildRawTranscript(ff.sentences ?? []),
      archived: false,
      fetched_at: new Date().toISOString(),
    };

    if (existingMap.has(ff.id)) {
      // Update existing record
      const { error } = await supabase
        .from('transcripts')
        .update(row)
        .eq('fireflies_id', ff.id);

      if (error) {
        result.errors.push(`Update error for ${ff.id}: ${error.message}`);
      } else {
        result.updated++;
      }
    } else {
      // Insert new record
      const { error } = await supabase.from('transcripts').insert(row);

      if (error) {
        result.errors.push(`Insert error for ${ff.id}: ${error.message}`);
      } else {
        result.created++;
      }
    }
  }

  return result;
}
