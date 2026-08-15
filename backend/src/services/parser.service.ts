import { RawMessage } from './gmail.service';

export interface ParsedReminder {
  gmailMessageId: string;
  title: string;
  course: string | null;
  sender: string | null;
  dueDate: Date | null;
}

// e.g. "Prof. Rao <rao@iimb.ac.in>" -> "Prof. Rao"
//      "vrushank.shah@spjimr.org"   -> "Vrushank Shah"
function parseSenderName(from: string): string | null {
  if (!from) return null;
  const named = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  if (named) return named[1].trim();
  const emailOnly = from.match(/([^<>@\s]+)@/);
  if (!emailOnly) return from.trim();
  const local = emailOnly[1];
  // Leave functional addresses as-is; title-case dotted names.
  if (/^(noreply|no-reply|info|admin|support|mailer|notifications?)$/i.test(local)) {
    return local;
  }
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Try to pull a course/subject name out of subject or body.
// Matches patterns like "MKT101", "FIN-502", "Course: Marketing Management",
// or "for <Course Name>".
function parseCourse(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;

  // Course code like ABC123 / ABC-123
  const code = text.match(/\b([A-Z]{2,4}[- ]?\d{2,4})\b/);
  if (code) return code[1].replace(/\s/, '').toUpperCase();

  // "Course: X" / "Subject: X" / "Class: X"
  const labelled = text.match(/\b(?:course|subject|class)\s*[:\-]\s*([^\n\r,.;]{3,60})/i);
  if (labelled) return labelled[1].trim();

  // "feedback for <Course>" / "evaluation of <Course>"
  const forMatch = subject.match(
    /(?:feedback|evaluation|survey|review)\s+(?:for|of|on)\s+([^\n\r,.;]{3,60})/i
  );
  if (forMatch) return cleanCourse(forMatch[1]);

  // "... Feedback - <Course>" / "Course Feedback: <Course>"  (dash/colon form)
  const dashMatch = subject.match(
    /(?:course|faculty)?\s*(?:feedback|evaluation|survey)\s*[-–:]\s*([^\n\r|]{3,60})/i
  );
  if (dashMatch) return cleanCourse(dashMatch[1]);

  return null;
}

// Trim trailing noise like "- Submission Link" or batch prefixes.
function cleanCourse(raw: string): string {
  return raw
    .replace(/\s*[-–|].*$/, '') // drop anything after a dash/pipe
    .replace(/^(the)\s+/i, '')
    .trim();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Words that introduce the *closing* date/time of a task. We prefer a date
// that follows one of these over the first date in the text — e.g. "opens today
// … accessible until 8:00 AM tomorrow" should resolve to *tomorrow*, not today.
const DEADLINE_CUE =
  /(?:due|deadline|submit(?:ted)?\s+by|respond\s+by|reply\s+by|by|before|until|till|no later than|last date|closes?|closing|accessible until|open until)\b[:\s]*/gi;

// Extract the most likely *due* date from text.
export function parseDueDate(text: string, reference = new Date()): Date | null {
  // 1. Prefer a date that appears right after a deadline cue.
  DEADLINE_CUE.lastIndex = 0;
  let cue: RegExpExecArray | null;
  while ((cue = DEADLINE_CUE.exec(text)) !== null) {
    const start = cue.index + cue[0].length;
    const tail = text.slice(start, start + 60);
    const d = matchDate(tail, reference);
    if (d) return d;
  }
  // 2. Otherwise fall back to the first date anywhere in the text.
  return matchDate(text, reference);
}

// Match the first date in `text` in any supported format.
function matchDate(text: string, reference: Date): Date | null {
  const lower = text.toLowerCase();

  // 1. ISO or numeric: 2026-08-20, 20/08/2026, 08/20/2026
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return utcDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const numeric = text.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/);
  if (numeric) {
    const [, a, b, y] = numeric;
    const year = Number(y.length === 2 ? `20${y}` : y);
    // Default to DD/MM (common outside the US); swap only if the first group
    // can't be a day-of-month but could be a month.
    let day = Number(a);
    let month = Number(b) - 1;
    if (Number(a) > 12 && Number(b) <= 12) {
      day = Number(a);
      month = Number(b) - 1;
    } else if (Number(a) <= 12 && Number(b) > 12) {
      day = Number(b);
      month = Number(a) - 1; // MM/DD fallback
    }
    return utcDate(year, month, day);
  }

  // 2. "20 August 2026" / "20-Aug-26" / "18-Aug-26 5:00 PM"
  const dmy = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s-]*(\d{2,4})?/
  );
  if (dmy) {
    const day = Number(dmy[1]);
    const month = MONTHS[dmy[2]];
    const year = dmy[3]
      ? expandYear(dmy[3])
      : inferYear(month, day, reference);
    return utcDate(year, month, day);
  }
  const mdy = lower.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/
  );
  if (mdy) {
    const month = MONTHS[mdy[1]];
    const day = Number(mdy[2]);
    const year = mdy[3] ? Number(mdy[3]) : inferYear(month, day, reference);
    return utcDate(year, month, day);
  }

  // 3. Relative: "by tomorrow", "due in 3 days", "by end of week"
  if (/\btomorrow\b/.test(lower)) return addDays(reference, 1);
  if (/\btoday\b/.test(lower)) return reference;
  const inDays = lower.match(/\bin\s+(\d{1,2})\s+days?\b/);
  if (inDays) return addDays(reference, Number(inDays[1]));
  if (/end of (the )?week/.test(lower)) return addDays(reference, 5);

  return null;
}

// "26" -> 2026, "2026" -> 2026
function expandYear(y: string): number {
  const n = Number(y);
  return y.length === 2 ? 2000 + n : n;
}

// Anchor calendar dates at 12:00 UTC so they render as the same day in any
// timezone (avoids off-by-one when the server runs in UTC and the user doesn't).
function utcDate(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

function inferYear(month: number, day: number, ref: Date): number {
  // If the date already passed this year, assume next year.
  const candidate = new Date(Date.UTC(ref.getFullYear(), month, day, 12));
  return candidate < ref ? ref.getFullYear() + 1 : ref.getFullYear();
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Turn a raw Gmail message into a structured reminder. */
export function parseMessage(msg: RawMessage): ParsedReminder {
  const course = parseCourse(msg.subject, msg.body);
  const dueDate = parseDueDate(`${msg.subject}\n${msg.body}`, msg.internalDate);
  return {
    gmailMessageId: msg.id,
    title: msg.subject || '(no subject)',
    course,
    sender: parseSenderName(msg.from),
    dueDate,
  };
}
