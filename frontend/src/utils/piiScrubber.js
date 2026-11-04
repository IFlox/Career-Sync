/**
 * PII Privacy Scrubber
 * Automatically scrubs phone numbers, emails, and street addresses
 * before feeding text into agent reasoning loops.
 */
export function scrubPII(rawText) {
  if (!rawText) return { cleanText: "", scrubbedLog: [] };

  const scrubbedLog = [];
  let cleanText = rawText;

  // 1. Scrub Email Addresses
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  cleanText = cleanText.replace(emailRegex, (match) => {
    scrubbedLog.push(`Email Scrubbed: [PROTECTED_EMAIL]`);
    return "[PROTECTED_EMAIL]";
  });

  // 2. Scrub Phone Numbers (Indian & Global formats)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}/g;
  cleanText = cleanText.replace(phoneRegex, (match) => {
    if (match.trim().length >= 8) {
      scrubbedLog.push(`Phone Scrubbed: [PROTECTED_PHONE]`);
      return "[PROTECTED_PHONE]";
    }
    return match;
  });

  // 3. Scrub Addresses (Common keywords: Flat, Room, Apts, Hostel, Street, Sector)
  const addressRegex = /(?:Room|Flat|Hostel|Sector|Apts|Apartment|Street|Road|Nagar|Colony)[\w\s,-]{5,35}/gi;
  cleanText = cleanText.replace(addressRegex, (match) => {
    scrubbedLog.push(`Address Masked: [PROTECTED_RESIDENCE]`);
    return "[PROTECTED_RESIDENCE]";
  });

  return { cleanText, scrubbedLog };
}