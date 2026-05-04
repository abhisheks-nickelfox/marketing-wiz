import logger from '../config/logger';
import { Transcript } from '../models';
import { Op } from 'sequelize';
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
  date: string;
  duration: number;
  participants: string[];
  sentences: FirefliesSentence[];
}

interface FirefliesResponse {
  data?: { transcripts: FirefliesTranscript[] };
  errors?: { message: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRawTranscript(sentences: FirefliesSentence[]): string {
  return sentences.map((s) => `${s.speaker_name}: ${s.text}`).join('\n');
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches transcripts from the last 30 days via the Fireflies GraphQL API
 * and upserts them into the `transcripts` table via Sequelize.
 *
 * When FIREFLIES_API_KEY is not set the function returns a no-op result.
 */
export async function syncTranscripts(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: [] };

  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    logger.warn('[fireflies.service] No FIREFLIES_API_KEY — skipping sync');
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

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const json = (await response.json()) as FirefliesResponse;

    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors.map((e) => e.message).join(', '));
    }

    ffTranscripts = json.data?.transcripts ?? [];
  } catch (err) {
    result.errors.push(`Fireflies API error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.synced = ffTranscripts.length;

  // ── Look up existing fireflies_ids in one batch query ────────────────────
  const ffIds = ffTranscripts.map((t) => t.id);

  const existingRows = await Transcript.findAll({
    where: { fireflies_id: { [Op.in]: ffIds } },
    attributes: ['id', 'fireflies_id'],
    raw: true,
  });

  const existingMap = new Map<string, string>(
    (existingRows as unknown as { id: string; fireflies_id: string }[]).map((r) => [r.fireflies_id, r.id]),
  );

  // ── Upsert each transcript ────────────────────────────────────────────────
  for (const ff of ffTranscripts) {
    const rowData = {
      fireflies_id:   ff.id,
      title:          ff.title || 'Untitled Call',
      call_date:      new Date(ff.date).toISOString(),
      duration_sec:   ff.duration ?? 0,
      participants:   ff.participants ?? [],
      raw_transcript: buildRawTranscript(ff.sentences ?? []),
      archived:       false,
      fetched_at:     new Date().toISOString(),
    };

    try {
      if (existingMap.has(ff.id)) {
        await Transcript.update(rowData, { where: { fireflies_id: ff.id } });
        result.updated++;
      } else {
        await Transcript.create(rowData);
        result.created++;
      }
    } catch (err) {
      result.errors.push(`Upsert error for ${ff.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
