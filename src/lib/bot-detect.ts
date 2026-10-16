// Crawlers, link previews, speed tests and our own scheduled jobs (the order sweep
// and the Lighthouse check) are not visitors, so they are left out of the numbers.
const AUTOMATED_AGENT =
  /bot\b|bot\/|crawl|spider|slurp|lighthouse|pagespeed|headless|phantomjs|puppeteer|playwright|selenium|webdriver|curl\/|wget\/|python-requests|python-urllib|axios\/|node-fetch|undici|go-http-client|okhttp|java\/|facebookexternalhit|facebookcatalog|whatsapp\/|telegrambot|discordbot|preview|vercel-screenshot|uptime|pingdom|statuscake/i;

export function isAutomatedUserAgent(userAgent: string | null | undefined) {
  const value = String(userAgent || "").trim();
  if (!value) return true;
  return AUTOMATED_AGENT.test(value);
}

export function isPhoneUserAgent(userAgent: string | null | undefined) {
  return /mobi|android|iphone|ipod|ipad|opera mini|iemobile/i.test(String(userAgent || ""));
}
