/**
 * Profile Context Builder
 *
 * Constructs system-prompt fragments from the user's professional
 * profile, writing style samples, and selected format template.
 * These fragments are appended to the persona system prompt before
 * sending to the AI provider.
 *
 * SERVER-SIDE ONLY — imported by /api/chat and /api/chat-private.
 */

import type { ProfessionalProfile } from '@/types/professional-profile';

/* ------------------------------------------------------------------ */
/*  Professional Profile Context                                       */
/* ------------------------------------------------------------------ */

/**
 * Converts a professional profile into a structured context block
 * that helps the AI personalise its output.
 *
 * Only non-empty fields are included so the prompt stays lean.
 * Returns an empty string when the profile is effectively blank.
 */
export function buildProfileContext(profile: ProfessionalProfile | null | undefined): string {
  if (!profile) return '';

  const parts: string[] = [];

  /* ── Section 1 — Professional identity ── */
  if (profile.full_name) parts.push(`Full Name: ${profile.full_name}`);
  if (profile.job_title) parts.push(`Job Title: ${profile.job_title}`);
  if (profile.company) parts.push(`Company: ${profile.company}`);
  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.experience_level) parts.push(`Experience Level: ${profile.experience_level}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);

  /* ── Section 2 — Expertise ── */
  if (profile.expertise_areas && profile.expertise_areas.length > 0) {
    parts.push(`Areas of Expertise: ${profile.expertise_areas.join(', ')}`);
  }
  if (profile.key_skills) parts.push(`Key Skills: ${profile.key_skills}`);
  if (profile.notable_achievements) parts.push(`Notable Achievements: ${profile.notable_achievements}`);
  if (profile.certifications) parts.push(`Certifications: ${profile.certifications}`);

  /* ── Section 3 — LinkedIn goals ── */
  if (profile.linkedin_goals && profile.linkedin_goals.length > 0) {
    parts.push(`LinkedIn Goals: ${profile.linkedin_goals.join(', ')}`);
  }

  /* ── Section 4 — Target audience ── */
  if (profile.target_audience_description) {
    parts.push(`Target Audience: ${profile.target_audience_description}`);
  }
  if (profile.target_audience_region) {
    parts.push(`Target Region: ${profile.target_audience_region}`);
  }
  if (profile.target_audience_level && profile.target_audience_level.length > 0) {
    parts.push(`Audience Level: ${profile.target_audience_level.join(', ')}`);
  }
  if (profile.audience_pain_points) {
    parts.push(`Audience Pain Points: ${profile.audience_pain_points}`);
  }

  /* ── Section 5 — Writing preferences (non-style) ── */
  if (profile.preferred_tone) parts.push(`Preferred Tone: ${profile.preferred_tone}`);
  if (profile.primary_language) parts.push(`Primary Writing Language: ${profile.primary_language}`);
  if (profile.emoji_usage) parts.push(`Emoji Usage Preference: ${profile.emoji_usage}`);
  if (profile.preferred_post_length) parts.push(`Preferred Post Length: ${profile.preferred_post_length}`);

  /* ── Section 6 — Product / service ── */
  if (profile.has_product && profile.product_name) {
    parts.push(`Product/Service Name: ${profile.product_name}`);
    if (profile.product_description) parts.push(`Product Description: ${profile.product_description}`);
    if (profile.product_url) parts.push(`Product URL: ${profile.product_url}`);
    if (profile.product_value_proposition) parts.push(`Value Proposition: ${profile.product_value_proposition}`);
  }

  if (parts.length === 0) return '';

  return (
    '[USER PROFESSIONAL CONTEXT]\n' +
    'Use this information to personalise the content you create. ' +
    'Do NOT repeat these details verbatim unless asked — integrate ' +
    'them naturally into the writing.\n\n' +
    parts.join('\n') +
    '\n[END USER PROFESSIONAL CONTEXT]'
  );
}

/* ------------------------------------------------------------------ */
/*  Writing Style Context                                              */
/* ------------------------------------------------------------------ */

/**
 * Wraps the user's writing samples in a style-reference block.
 *
 * The AI is instructed to analyse cadence, vocabulary, structure and
 * tone, then mirror them when generating content.
 */
export function buildWritingStyleContext(samples: string | null | undefined): string {
  if (!samples || samples.trim().length === 0) return '';

  return (
    '[WRITING STYLE REFERENCE]\n' +
    'Below are examples of the user\u2019s own LinkedIn writing. ' +
    'Carefully analyse the following stylistic dimensions and ' +
    'mirror them in every piece of content you generate:\n' +
    '\u2022 Sentence length & rhythm\n' +
    '\u2022 Vocabulary sophistication level\n' +
    '\u2022 Paragraph length & white-space usage\n' +
    '\u2022 Tone (formal / conversational / inspirational / witty)\n' +
    '\u2022 Use of emojis, hashtags, and line breaks\n' +
    '\u2022 Opening-hook style (question, statistic, bold claim, story)\n' +
    '\u2022 CTA style (soft ask, direct, rhetorical question)\n\n' +
    '--- BEGIN SAMPLES ---\n' +
    samples.trim() +
    '\n--- END SAMPLES ---\n' +
    '[END WRITING STYLE REFERENCE]'
  );
}

/* ------------------------------------------------------------------ */
/*  Format Template Instructions                                       */
/* ------------------------------------------------------------------ */

/**
 * Maps a format-template name to a detailed system-prompt instruction
 * that tells the AI exactly how to structure the LinkedIn post.
 *
 * Seven templates are supported (matching the PDD):
 *   story | listicle | qa | tip | before_after | statistics | default
 */
export function buildFormatInstruction(template: string | null | undefined): string {
  if (!template || template === 'default') return '';

  const instructions: Record<string, string> = {
    story: (
      '[FORMAT: STORY POST]\n' +
      'Write this LinkedIn post using a compelling narrative arc:\n' +
      '1. HOOK (1\u20132 lines): Start with a surprising statement, a vivid scene, ' +
      'or an emotional moment that stops the scroll.\n' +
      '2. CONTEXT (2\u20133 lines): Set the stage \u2014 who, what, where, when.\n' +
      '3. CONFLICT / CHALLENGE (3\u20134 lines): Describe the obstacle, struggle, ' +
      'or turning point with sensory details.\n' +
      '4. RESOLUTION (2\u20133 lines): Show the outcome and what changed.\n' +
      '5. LESSON / TAKEAWAY (1\u20132 lines): Distil the insight in a quotable sentence.\n' +
      '6. CTA (1 line): Invite the reader to reflect, share, or act.\n\n' +
      'Use short paragraphs (1\u20132 sentences each) separated by blank lines. ' +
      'First-person voice. Keep total length 150\u2013250 words.\n' +
      '[END FORMAT]'
    ),

    listicle: (
      '[FORMAT: LISTICLE POST]\n' +
      'Write this LinkedIn post as a numbered or bulleted list:\n' +
      '1. HOOK (1\u20132 lines): Open with a bold claim, surprising number, ' +
      'or a question that promises value (e.g., \u201c7 things I wish I knew\u2026\u201d).\n' +
      '2. LIST BODY (5\u201310 items): Each item gets its own line with a number ' +
      'or bullet emoji (\u2022, \u2713, \u27a1\ufe0f). Keep each item 1\u20132 sentences. ' +
      'Start with the strongest or most surprising item.\n' +
      '3. WRAP-UP (1\u20132 lines): Summarise or add a bonus insight.\n' +
      '4. CTA (1 line): Ask which item resonates, or invite additions.\n\n' +
      'Use consistent formatting across all list items. ' +
      'Blank line between each item for readability. 150\u2013300 words total.\n' +
      '[END FORMAT]'
    ),

    qa: (
      '[FORMAT: Q&A POST]\n' +
      'Write this LinkedIn post in question-and-answer style:\n' +
      '1. HOOK QUESTION (1\u20132 lines): Ask a thought-provoking question the ' +
      'target audience genuinely wonders about.\n' +
      '2. SHORT ANSWER (1\u20132 lines): Provide a concise, direct answer.\n' +
      '3. DEEP DIVE (4\u20136 lines): Elaborate with examples, data, or a ' +
      'mini-story. You may use 2\u20133 follow-up Q&A pairs.\n' +
      '4. TAKEAWAY (1\u20132 lines): Crystallise the key insight.\n' +
      '5. CTA QUESTION (1 line): End with an open question inviting discussion.\n\n' +
      'Use \u201cQ:\u201d / \u201cA:\u201d prefixes or bold the questions. ' +
      '150\u2013250 words total. Conversational tone.\n' +
      '[END FORMAT]'
    ),

    tip: (
      '[FORMAT: DIRECT TIP POST]\n' +
      'Write this LinkedIn post as a single actionable tip or advice:\n' +
      '1. HOOK (1 line): State the tip boldly or present the problem it solves.\n' +
      '2. WHY IT MATTERS (2\u20133 lines): Explain the pain or missed opportunity.\n' +
      '3. THE TIP (2\u20134 lines): Give clear, step-by-step or concrete advice. ' +
      'Use \u201cDo this:\u201d or \u201cHere\u2019s how:\u201d framing.\n' +
      '4. PROOF / EXAMPLE (1\u20132 lines): Brief evidence or personal anecdote.\n' +
      '5. CTA (1 line): \u201cSave this for later\u201d or \u201cTag someone who needs this.\u201d\n\n' +
      'Keep it punchy \u2014 100\u2013200 words. One core idea only. ' +
      'Short paragraphs with white space.\n' +
      '[END FORMAT]'
    ),

    before_after: (
      '[FORMAT: BEFORE / AFTER POST]\n' +
      'Write this LinkedIn post showing a transformation or contrast:\n' +
      '1. HOOK (1\u20132 lines): Tease the transformation (\u201cThis one change\u2026\u201d).\n' +
      '2. BEFORE (3\u20134 lines): Paint the old state vividly \u2014 the struggle, ' +
      'the frustration, the status quo. Use emotive language.\n' +
      '3. TURNING POINT (1\u20132 lines): What triggered the change?\n' +
      '4. AFTER (3\u20134 lines): Describe the new reality with concrete results ' +
      'or feelings.\n' +
      '5. LESSON (1\u20132 lines): The principle behind the transformation.\n' +
      '6. CTA (1 line): \u201cWhat\u2019s YOUR before/after?\u201d\n\n' +
      'Use visual separators (\u2014, \u2192, or emojis) between before and after. ' +
      '150\u2013250 words total.\n' +
      '[END FORMAT]'
    ),

    statistics: (
      '[FORMAT: STATISTICS / DATA POST]\n' +
      'Write this LinkedIn post leading with data and analysis:\n' +
      '1. HOOK (1\u20132 lines): Open with a jaw-dropping statistic or data point.\n' +
      '2. CONTEXT (2\u20133 lines): Source the data and explain why it matters.\n' +
      '3. ANALYSIS (3\u20135 lines): Break down what the numbers mean. ' +
      'Add 2\u20133 supporting data points or trends.\n' +
      '4. IMPLICATION (2\u20133 lines): What should professionals do with this info?\n' +
      '5. CTA (1 line): Ask for audience\u2019s take on the data.\n\n' +
      'Use percentage symbols, arrows (\u2191\u2193), and bold numbers for scannability. ' +
      '150\u2013250 words. Cite or reference the source briefly.\n' +
      '[END FORMAT]'
    ),
  };

  return instructions[template] || '';
}

/* ------------------------------------------------------------------ */
/*  Combined Builder (convenience)                                     */
/* ------------------------------------------------------------------ */

/**
 * Builds the full supplementary context to append after the persona
 * system prompt. Combines profile, writing style, and format template.
 */
export function buildFullContext(
  profile: ProfessionalProfile | null | undefined,
  formatTemplate: string | null | undefined,
  includeWritingStyle: boolean = true
): string {
  const sections: string[] = [];

  const profileCtx = buildProfileContext(profile);
  if (profileCtx) sections.push(profileCtx);

  if (includeWritingStyle && profile?.writing_samples) {
    const styleCtx = buildWritingStyleContext(profile.writing_samples);
    if (styleCtx) sections.push(styleCtx);
  }

  const formatCtx = buildFormatInstruction(formatTemplate);
  if (formatCtx) sections.push(formatCtx);

  return sections.join('\n\n');
}