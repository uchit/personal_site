/* hellouchit.com — Google Analytics 4 (G-XKE8WPKMMX) + outbound-click attribution.
 * Pairs with <script async src="https://www.googletagmanager.com/gtag/js?id=G-XKE8WPKMMX">
 * on the same page. Kept as a single external file so no page needs an inline
 * <script> block for analytics (CSP script-src has no 'unsafe-inline'). */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-XKE8WPKMMX', { anonymize_ip: true });

document.addEventListener('click', function (e) {
  var a = e.target.closest('a'); if (!a || !a.href) return;
  var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
  if (!u.hostname || u.hostname === location.hostname) return;
  var dest = 'outbound_click', h = u.hostname.replace(/^www\./, '');
  if (/substack\.com$/.test(h)) dest = 'substack_click';
  else if (/linkedin\.com$/.test(h)) dest = 'linkedin_click';
  else if (/github\.com$/.test(h)) dest = 'github_click';
  else if (/chatgpt\.com$/.test(h) || /openai\.com$/.test(h)) dest = 'gpt_click';
  else if (/claude\.ai$/.test(h) || /anthropic\.com$/.test(h)) dest = 'claude_click';
  gtag('event', dest, { link_url: a.href, link_domain: h, link_text: (a.innerText || '').slice(0, 80) });
});

/* Visits that arrive from AI assistants. Referrers are often stripped by the
   apps, so this undercounts; it is still the only first-party signal. Fires
   once per landing, never with anything beyond the assistant's domain. */
(function () {
  var AI = /(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|meta\.ai|you\.com|phind\.com|duckduckgo\.com\/aichat)$/;
  var host = "";
  try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch (_) {}
  var utm = (new URLSearchParams(location.search).get("utm_source") || "").toLowerCase();
  var source = AI.test(host) ? host : (/chatgpt|perplexity|claude|gemini|copilot/.test(utm) ? utm : "");
  if (source) gtag("event", "ai_referral", { ai_source: source, landing_page: location.pathname });
})();
