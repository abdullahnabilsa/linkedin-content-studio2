/**
 * LinkedIn Score — Prompt Builders
 *
 * Constructs the system-level prompts that instruct the AI to
 * evaluate or improve a LinkedIn post.
 */

/**
 * Builds the evaluation prompt sent to the AI. The AI returns a
 * structured JSON-like text block that the frontend parses.
 */
export function buildScorePrompt(postContent: string): string {
  return (
    'You are a LinkedIn content strategist with 10+ years of experience ' +
    'analysing post performance on LinkedIn. Evaluate the following ' +
    'LinkedIn post on these 7 criteria (score each 0\u2013100):\n\n' +
    'CRITERIA:\n' +
    '1. **Hook Power** \u2014 How strong is the opening line? Does it stop the scroll?\n' +
    '2. **Readability** \u2014 Is the text scannable, well-spaced, and easy to consume on mobile?\n' +
    '3. **Call to Action** \u2014 Does the post invite engagement (comment, share, save)?\n' +
    '4. **Formatting** \u2014 Does it use white space, line breaks, emojis, or bullets effectively?\n' +
    '5. **Hashtag Usage** \u2014 Are hashtags relevant, well-placed (end), and 3\u20135 in count?\n' +
    '6. **Engagement Potential** \u2014 Will this post spark conversation or shares?\n' +
    '7. **Length** \u2014 Is the length optimal for LinkedIn (ideal: 150\u2013300 words)?\n\n' +
    'RESPONSE FORMAT (follow EXACTLY):\n' +
    '```\n' +
    'LINKEDIN SCORE REPORT\n' +
    '\n' +
    'Overall Score: [OVERALL]/100\n' +
    '\n' +
    'Hook Power:          [SCORE]/100\n' +
    'Readability:         [SCORE]/100\n' +
    'Call to Action:      [SCORE]/100\n' +
    'Formatting:          [SCORE]/100\n' +
    'Hashtag Usage:       [SCORE]/100\n' +
    'Engagement Potential: [SCORE]/100\n' +
    'Length:              [SCORE]/100\n' +
    '\n' +
    'IMPROVEMENT TIPS:\n' +
    '1. [First specific, actionable tip]\n' +
    '2. [Second specific, actionable tip]\n' +
    '3. [Third specific, actionable tip]\n' +
    '```\n\n' +
    'IMPORTANT:\n' +
    '- The Overall Score is a weighted average: Hook Power 20%, Engagement Potential 20%, ' +
    'Readability 15%, CTA 15%, Formatting 10%, Hashtags 10%, Length 10%.\n' +
    '- Be honest and specific. Do NOT inflate scores.\n' +
    '- Tips must reference the actual content.\n\n' +
    '--- POST TO EVALUATE ---\n' +
    postContent +
    '\n--- END POST ---'
  );
}

/**
 * Builds a prompt asking the AI to rewrite the post,
 * fixing the weak areas identified in a previous score.
 */
export function buildImprovePrompt(): string {
  return (
    'Based on the LinkedIn Score evaluation above, rewrite the original ' +
    'post with the following improvements:\n\n' +
    '1. Fix all weak areas identified in the score (anything below 70).\n' +
    '2. Keep the same core message and voice.\n' +
    '3. Apply LinkedIn best practices for maximum engagement.\n' +
    '4. Ensure proper formatting with line breaks and white space.\n' +
    '5. Add or fix the call to action.\n' +
    '6. Place 3\u20135 relevant hashtags at the end.\n' +
    '7. Keep the length in the 150\u2013300 word sweet spot.\n\n' +
    'Return ONLY the improved post (no explanations or preamble).'
  );
}

/* ─── Score Parsing Helpers (used by LinkedInScoreDisplay) ─── */

export interface ParsedScore {
  overall: number;
  hookPower: number;
  readability: number;
  callToAction: number;
  formatting: number;
  hashtagUsage: number;
  engagementPotential: number;
  length: number;
  tips: string[];
}

/**
 * Attempts to parse a structured score response from AI output text.
 * Returns null if the text does not contain a valid score report.
 */
export function parseScoreResponse(text: string): ParsedScore | null {
  const extractScore = (label: string): number => {
    const patterns = [
      new RegExp(`${label}[:\\s]*([0-9]{1,3})/100`, 'i'),
      new RegExp(`${label}[:\\s]*([0-9]{1,3})\\s*/\\s*100`, 'i'),
      new RegExp(`${label}[:\\s]+([0-9]{1,3})`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= 0 && val <= 100) return val;
      }
    }
    return -1;
  };

  const overall = extractScore('Overall Score');
  if (overall < 0) return null;

  const hookPower = extractScore('Hook Power');
  const readability = extractScore('Readability');
  const callToAction = extractScore('Call to Action');
  const formatting = extractScore('Formatting');
  const hashtagUsage = extractScore('Hashtag Usage');
  const engagementPotential = extractScore('Engagement Potential');
  const length = extractScore('Length');

  if ([hookPower, readability, callToAction, formatting, hashtagUsage, engagementPotential, length].some(s => s < 0)) {
    return null;
  }

  const tips: string[] = [];
  const tipsSection = text.split(/IMPROVEMENT TIPS/i)[1];
  if (tipsSection) {
    const tipMatches = tipsSection.matchAll(/\d+\.\s*(.+)/g);
    for (const m of tipMatches) {
      const tip = m[1].trim();
      if (tip.length > 5) tips.push(tip);
    }
  }

  return {
    overall,
    hookPower,
    readability,
    callToAction,
    formatting,
    hashtagUsage,
    engagementPotential,
    length,
    tips: tips.slice(0, 5),
  };
}

/**
 * Returns a colour class string based on a 0-100 score.
 */
export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}