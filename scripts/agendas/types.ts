import type { City } from '../../src/constants/areas.ts';

export type { City };

export type AgendaDoc = {
  kind: 'agenda' | 'packet' | 'notice';
  format: 'pdf' | 'html';
  url: string;
};

/** One public meeting, normalized across every city's system. */
export type Meeting = {
  /** Stable across runs: `<source>:<source id>`. */
  id: string;
  city: City;
  source: 'legistar' | 'civicclerk' | 'primegov' | 'boston-notices';
  /** The board or committee holding the meeting. */
  body: string;
  title: string;
  /** Local Boston time, ISO without offset, e.g. 2026-10-27T09:30. */
  start: string;
  location: string | null;
  /** Human-readable page for the meeting, when the source has one. */
  pageUrl: string | null;
  docs: AgendaDoc[];
  /** Short text we already have without opening documents (public notices include it inline). */
  summary: string | null;
};

export type DateWindow = { from: Date; to: Date };

/** One thing on an agenda that residents could act on, as extracted by Claude. */
export type AgendaItem = {
  /** `<meeting id>#<index>`. */
  id: string;
  meetingId: string;
  city: City;
  body: string;
  meetingTitle: string;
  meetingStart: string;
  location: string | null;
  sourceUrl: string | null;
  title: string;
  summary: string;
  docket: string;
  action:
    | 'attend_and_testify'
    | 'public_comment'
    | 'survey_or_feedback'
    | 'design_input'
    | 'budget_input'
    | 'service_test'
    | 'other';
  /** YYYY-MM-DD or "". */
  deadline: string;
  neighborhoods: string[];
  citywide: boolean;
  contacts: { name?: string; office?: string; email?: string; phone?: string }[];
  include: boolean;
  skip_reason: string;
};
