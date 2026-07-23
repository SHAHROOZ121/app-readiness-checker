const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const MOBILE_AUDIT_IDS = ["viewport", "tap-targets", "font-size", "target-size"];

const SECURITY_AUDIT_IDS = [
  "is-on-https",
  "redirects-http",
  "clickjacking-mitigation",
  "csp-xss",
  "trusted-types-xss",
  "geolocation-on-start",
  "notification-on-start",
];

const PERFORMANCE_AUDIT_IDS = [
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
];

const SEO_AUDIT_IDS = [
  "document-title",
  "meta-description",
  "http-status-code",
  "link-text",
  "crawlable-anchors",
  "is-crawlable",
  "robots-txt",
];

/** Plain-English fixes keyed by Lighthouse audit id */
const PLAIN_ENGLISH_FIXES = {
  // Core Web Vitals & performance timing
  "largest-contentful-paint":
    "Make the main part of your page show up faster — visitors are waiting too long for the first meaningful content.",
  "first-contentful-paint":
    "Show something useful on screen sooner so people know the page is working, not stuck loading.",
  "first-meaningful-paint":
    "Show the main content of your page sooner — visitors see a blank or incomplete screen too long.",
  "speed-index": "Reduce how long it takes before the page looks ready to use on a phone.",
  "total-blocking-time":
    "Cut down delays that freeze taps and scrolling — the page should respond right away when someone touches it.",
  interactive:
    "Let people use buttons and forms sooner — the page stays unresponsive for too long after it appears.",
  "cumulative-layout-shift":
    "Stop buttons and text from jumping around while the page loads — that causes mis-taps on phones.",
  "max-potential-fid":
    "Reduce JavaScript work so the page responds quickly to the first tap or click.",

  // Server & network
  "server-response-time":
    "Speed up your server's response time — slow servers delay everything else on the page.",
  "network-dependency-tree":
    "Reduce the chain of files that must load one-after-another before the page can appear.",
  "critical-request-chains":
    "Reduce the chain of files that must load one-after-another before the page can appear.",
  "network-rtt":
    "High network round-trip time detected — consider a CDN closer to your users.",
  "network-server-latency":
    "Your server is slow to respond — consider upgrading hosting or adding a CDN.",
  "total-byte-weight":
    "Reduce the total size of files your page downloads — large pages are slow on mobile data.",
  "uses-long-cache-ttl":
    "Tell browsers to cache your files for longer so returning visitors don't re-download everything.",
  "uses-http2": "Use HTTP/2 on your server so multiple files can load in parallel.",
  redirects: "Cut unnecessary redirects — each hop adds delay before your app opens.",
  "resource-summary":
    "Reduce the number and size of files your page loads — fewer requests means faster loading.",

  // JavaScript
  "render-blocking-resources":
    "Change how styles and scripts load so the page can draw content earlier instead of showing a blank screen.",
  "unused-javascript": "Remove or defer JavaScript the page does not need on first load.",
  "unminified-javascript": "Compress your JavaScript files so they download faster.",
  "bootup-time": "Reduce how long JavaScript takes to start — less code on first load helps.",
  "mainthread-work-breakdown": "Lighten work the browser does on load — split up or defer heavy tasks.",
  "long-tasks": "Break up long JavaScript tasks so the page stays responsive while loading.",
  "no-document-write":
    "Remove document.write() calls — they block the page from loading and are unsafe.",
  "uses-passive-event-listeners":
    "Use passive scroll listeners so the page scrolls smoothly without waiting on JavaScript.",
  "no-unload-listeners":
    "Remove unload event listeners — they prevent the browser's fast back/forward cache.",
  "legacy-javascript": "Stop shipping outdated JavaScript polyfills to modern phones that do not need them.",
  "duplicated-javascript":
    "Remove JavaScript modules that are loaded more than once — duplicate code wastes bandwidth.",
  "errors-in-console": "Fix JavaScript errors shown in the browser console — they can break features.",
  "bf-cache": "Allow back/forward cache so returning visitors see your app instantly.",

  // CSS
  "unused-css-rules": "Remove CSS your page does not use so phones download less data.",
  "unminified-css": "Compress your CSS files so they download faster.",

  // Images
  "uses-responsive-images":
    "Serve smaller image sizes on phones instead of huge desktop images.",
  "properly-size-images": "Resize images to match how large they appear on screen — oversized images slow loading.",
  "offscreen-images": "Load images only when they are about to scroll into view, not all at once at the start.",
  "modern-image-formats": "Use WebP or AVIF images — they are smaller than old JPEG/PNG formats.",
  "uses-optimized-images":
    "Compress images more before uploading — many images are larger than they need to be.",
  "efficient-animated-content": "Use lighter animation formats (like video or CSS) instead of heavy GIFs.",
  "image-size-responsive": "Check that images scale down correctly on small screens.",
  "image-aspect-ratio":
    "Fix images that appear stretched or squashed — set the correct width and height attributes.",
  "unsized-images":
    "Add width and height to images so the page doesn't reflow when they finish loading.",
  "prioritize-lcp-image": "Tell the browser to load your main hero image first — it is the biggest visual delay.",
  "preload-lcp-image": "Tell the browser to load your main hero image first — it is the biggest visual delay.",
  "lcp-lazy-loaded": "Do not lazy-load the main above-the-fold image — load it immediately.",

  // Fonts & rendering
  "uses-text-compression": "Turn on gzip or Brotli compression on your server so files are smaller over the network.",
  "uses-rel-preconnect": "Pre-connect to important third-party domains (fonts, analytics) so they load faster.",
  "uses-rel-preload": "Tell the browser to fetch critical files earlier so the page appears sooner.",
  "font-display": "Set web fonts to show fallback text immediately instead of hiding text while fonts load.",
  "dom-size": "Simplify the page structure — too many elements make phones work harder.",
  "layout-shift-elements":
    "Stop specific elements from jumping around during load — identify and fix the shifting content.",

  // Third parties
  "third-party-summary": "Reduce or delay third-party scripts (ads, widgets, trackers) that slow your app.",
  "third-party-facades":
    "Delay loading chat widgets, video players, and other embeds until the visitor actually needs them.",

  // Mobile friendliness
  viewport:
    "Add a proper mobile viewport tag so your app scales correctly on phones instead of looking zoomed out.",
  "tap-targets": "Make buttons and links bigger with more space between them so they are easy to tap on phones.",
  "target-size": "Increase the size of small tap targets — links and buttons should be finger-friendly.",
  "font-size": "Use readable text sizes on mobile — avoid tiny fonts that force people to pinch-zoom.",

  // Security
  "is-on-https":
    "Serve your app over HTTPS (the padlock) — browsers warn users on insecure http:// sites.",
  "redirects-http": "Automatically send http:// visitors to the secure https:// version of your site.",
  "clickjacking-mitigation": "Add basic security headers so other sites cannot embed your app in a fake frame.",
  "csp-xss": "Add a content security policy to reduce the risk of cross-site scripting attacks.",
  "trusted-types-xss": "Enable Trusted Types to block script injection attacks.",
  "geolocation-on-start": "Do not ask for location permission the instant the app opens — ask only when needed.",
  "notification-on-start": "Do not ask for notification permission right away — wait until the user sees value.",
  "no-vulnerable-libraries":
    "Update or replace JavaScript libraries that have known security vulnerabilities.",
  "password-inputs-can-be-pasted-into":
    "Allow users to paste into password fields — blocking paste makes your login form harder to use.",

  // SEO
  "document-title": "Set a clear page title — it appears in browser tabs and Google search results.",
  "meta-description":
    "Add a short meta description summarizing your app — search engines often show it under your link.",
  "link-text": 'Use descriptive link text (not just "click here") so users and search engines understand links.',
  "crawlable-anchors": "Fix links that search engines cannot follow — use normal <a href> links where possible.",
  "is-crawlable": "Remove blocks that stop Google from indexing your app if you want search traffic.",
  "robots-txt": "Review your robots.txt file — make sure you are not accidentally blocking search engines.",
  "http-status-code": "Fix broken pages that return errors — dead links hurt trust and search rankings.",
  "canonical": "Set a canonical URL so Google knows which page is the main version if you have duplicates.",
  "hreflang": "Set language/region tags correctly if you serve multiple locales.",
  "structured-data": "Add structured data (schema) if you want richer results in search — optional but helpful.",
  "heading-order":
    "Use headings in logical order (H1 → H2 → H3) — scrambled headings confuse screen readers and Google.",
  "html-has-lang":
    "Add a language attribute to your page so screen readers and search engines know what language it is.",

  // Accessibility
  "color-contrast": "Improve text/background contrast so text is easy to read for everyone.",
  "image-alt": "Add short alt text to images so screen readers and search engines understand them.",
  "label": "Add visible labels to form fields so people know what to type.",
  "accessibility": "Fix accessibility issues so more people can use your app.",

  // Best practices / misc
  "plugins": "Remove outdated browser plugins (like Flash) — they are unsupported and unsafe.",
  "charset": "Declare UTF-8 character encoding so special characters display correctly.",
  "valid-source-maps": "Source maps are a developer detail — safe to ignore unless you are debugging.",
  "inspector-issues": "Fix issues flagged in Chrome DevTools that may affect users.",
};

/** Ready-to-paste fix prompts keyed by Lighthouse audit id */
const FIX_PROMPTS = {
  // Core Web Vitals & performance timing
  "largest-contentful-paint":
    "My app's main content takes too long to appear on screen, failing Google's Largest Contentful Paint metric. Please optimize the largest above-the-fold element — usually a hero image or main heading — so it loads within 2.5 seconds. This may involve preloading the image, reducing its file size, or eliminating render-blocking resources that delay it.",
  "first-contentful-paint":
    "My app is slow to show any content on screen, making visitors think it's not loading. Please optimize the page so something meaningful appears within 1.8 seconds — this could mean reducing server response time, eliminating render-blocking scripts and styles, or inlining critical CSS.",
  "first-meaningful-paint":
    "My app takes too long before its main content is visible. Please ensure the primary content loads and paints as early as possible, without being blocked by scripts, fonts, or large images.",
  "speed-index":
    "My app looks unfinished for too long while loading — parts appear slowly rather than all at once. Please reduce the Speed Index by prioritizing above-the-fold content, deferring non-critical scripts, and ensuring styles load efficiently.",
  "total-blocking-time":
    "My app freezes after it first appears — taps and clicks don't work because JavaScript is monopolizing the browser. Please break up or defer large JavaScript tasks so the page becomes interactive faster. Aim to keep total blocking time under 200ms.",
  interactive:
    "My app takes too long to become usable after it first appears on screen. Please reduce the time to interactive by deferring non-critical JavaScript, splitting large scripts into smaller chunks, and removing unused code.",
  "cumulative-layout-shift":
    "Elements on my page jump and shift around while loading, causing visitors to mis-tap buttons. Please fix layout shift by adding explicit width and height to all images, avoiding injecting content above existing content, and ensuring web fonts don't cause text to reflow.",
  "max-potential-fid":
    "My app may freeze on the first tap or click because of long-running JavaScript tasks. Please split large JavaScript bundles into smaller pieces and defer any scripts that aren't needed immediately so the page responds quickly to the first user interaction.",

  // Server & network
  "server-response-time":
    "My server is taking too long to respond, which delays everything on the page. Please reduce the server response time to under 200ms — this may involve enabling server-side caching, optimizing database queries, upgrading the hosting plan, or adding a CDN.",
  "network-dependency-tree":
    "My page requires multiple files to load one after another in a chain before it can display content. Please break up these dependencies by preloading critical resources, inlining small CSS, and deferring non-critical scripts so content can appear sooner.",
  "critical-request-chains":
    "My page requires multiple files to load one after another in a chain before it can display content. Please break up these dependencies by preloading critical resources, inlining small CSS, and deferring non-critical scripts so content can appear sooner.",
  "network-rtt":
    "My app has high round-trip times to load resources, slowing it down for visitors far from my server. Please add a CDN (Content Delivery Network) so files are served from locations closer to my users.",
  "network-server-latency":
    "My server has high latency when responding to requests. Please investigate server performance — this may require upgrading hosting, enabling caching, or using a CDN to serve static assets from edge locations closer to users.",
  "total-byte-weight":
    "My app downloads too much data to load, making it slow on mobile connections. Please reduce the total page weight by compressing images, minifying CSS and JavaScript, removing unused code, and enabling server-side compression.",
  "uses-long-cache-ttl":
    "My server is not telling browsers to cache files for long enough, so returning visitors re-download everything on each visit. Please set long cache expiry headers (at least 1 year) on static assets like images, CSS, and JavaScript files.",
  "uses-http2":
    "My server is using an older HTTP protocol that loads files one at a time instead of in parallel. Please enable HTTP/2 on the server so multiple files can be downloaded simultaneously.",
  redirects:
    "My page is sending visitors through unnecessary redirects before they reach the final destination. Please eliminate redirect chains — serve directly to the final URL so there are zero hops before the page loads.",
  "resource-summary":
    "My page is loading too many files or files that are too large. Please reduce the number of network requests by combining files where possible, and reduce total transfer size by compressing and optimizing all assets.",

  // JavaScript
  "render-blocking-resources":
    "Scripts and stylesheets are blocking my page from showing content — the browser has to wait for them before it can draw anything. Please add defer or async to non-critical scripts, and ensure critical CSS is either inlined or loads without blocking render.",
  "unused-javascript":
    "My app is sending JavaScript to the browser that it doesn't use on first load, wasting time and bandwidth. Please remove or defer any scripts that aren't needed immediately — this includes analytics, chat widgets, or feature code that only activates later.",
  "unminified-javascript":
    "My JavaScript files are not compressed, making them larger than necessary. Please minify all JavaScript files to remove whitespace, comments, and unnecessary characters so they download faster.",
  "bootup-time":
    "My JavaScript takes too long to parse and execute when the page loads. Please reduce JavaScript bundle size by removing unused libraries, code-splitting into smaller chunks, and deferring non-critical scripts.",
  "mainthread-work-breakdown":
    "The browser's main thread is overloaded with work while my page loads, causing slowdowns and unresponsiveness. Please identify and reduce heavy JavaScript execution, large style recalculations, and excessive layout work that happens during page load.",
  "long-tasks":
    "My page has JavaScript tasks that run for too long without a break, blocking user interaction. Please break large JavaScript functions into smaller chunks using techniques like setTimeout or requestIdleCallback so the browser can handle user input between tasks.",
  "no-document-write":
    "My app uses document.write(), which blocks the browser while loading and can break on slow connections. Please replace all document.write() calls with modern DOM methods like appendChild or innerHTML.",
  "uses-passive-event-listeners":
    "My page's scroll and touch event listeners are slowing down scrolling performance. Please mark scroll, touch, and wheel event listeners as passive (add { passive: true } to addEventListener) so the browser doesn't have to wait for them before scrolling.",
  "no-unload-listeners":
    "My page has unload event listeners that prevent the browser from caching it for instant back/forward navigation. Please remove all unload event listeners and replace them with pagehide or visibilitychange if needed.",
  "legacy-javascript":
    "My app is sending old JavaScript code that modern phones don't need, wasting bandwidth. Please update the build configuration to target modern browsers and remove polyfills for features that are now universally supported.",
  "duplicated-javascript":
    "The same JavaScript code is being loaded more than once on my page, wasting bandwidth. Please audit the JavaScript bundles and remove duplicate modules — this often happens when multiple packages include the same dependency.",
  "errors-in-console":
    "My page has JavaScript errors showing in the browser console, which may be breaking features for users. Please fix all console errors — look for undefined variables, failed network requests, and missing resources.",
  "bf-cache":
    "My page is blocking the browser's back/forward cache, so returning visitors see a slow reload instead of an instant restore. Please remove unload event listeners, avoid cache-control: no-store headers, and ensure the page can be safely restored from cache.",

  // CSS
  "unused-css-rules":
    "My page is loading CSS rules that are never used, wasting bandwidth and slowing load time. Please audit and remove unused CSS — this can be done with PurgeCSS or similar tools that strip styles not referenced in the HTML.",
  "unminified-css":
    "My CSS files are not compressed, making them larger than they need to be. Please minify all CSS files to remove whitespace and comments so they download faster.",

  // Images
  "uses-responsive-images":
    "My app is sending full-size desktop images to mobile users, wasting their bandwidth. Please serve appropriately sized images using srcset so phones download smaller versions — for example, 400px wide on mobile instead of 1600px.",
  "properly-size-images":
    "My images are much larger than the space they appear in on screen, wasting bandwidth. Please resize images to match their display size — if an image appears at 300px wide, serve it at 300px or 600px for retina screens, not 2000px.",
  "offscreen-images":
    "My app loads all images at once even when they are far below the visible screen area. Please add lazy loading to images not in the initial viewport — use loading='lazy' on img tags.",
  "modern-image-formats":
    "My app is using old image formats (JPEG or PNG) when smaller, better options are available. Please convert images to WebP or AVIF format, which are typically 30–50% smaller than JPEG at the same visual quality.",
  "uses-optimized-images":
    "My images are not efficiently compressed before being served. Please run all images through an optimizer (like Squoosh, TinyPNG, or ImageOptim) to reduce file size without visible quality loss.",
  "efficient-animated-content":
    "My app is using GIFs for animation, which are much larger than video alternatives. Please convert animated GIFs to MP4 or WebM video, or use CSS animations instead — this can reduce file size by up to 90%.",
  "image-size-responsive":
    "My images are not scaling correctly on small screens. Please ensure all images have max-width: 100% in CSS and that large images shrink proportionally on mobile devices.",
  "image-aspect-ratio":
    "Some images on my page appear stretched or squashed because the aspect ratio is wrong. Please add explicit width and height attributes to all img tags matching the image's natural dimensions so the browser maintains the correct proportions.",
  "unsized-images":
    "My images don't have explicit width and height attributes, causing the page to reflow and shift when they load. Please add width and height attributes to all img tags so the browser reserves the correct space before images download.",
  "prioritize-lcp-image":
    "The main hero image on my page loads too late because the browser doesn't know it's important. Please add <link rel='preload' as='image'> for the largest above-the-fold image so the browser starts downloading it as early as possible.",
  "preload-lcp-image":
    "The main hero image on my page loads too late because the browser doesn't know it's important. Please add <link rel='preload' as='image'> for the largest above-the-fold image so the browser starts downloading it as early as possible.",
  "lcp-lazy-loaded":
    "The main above-the-fold image is set to lazy load, which delays it unnecessarily since it's immediately visible. Please remove lazy loading from the hero or largest visible image — only lazy load images that are below the fold.",

  // Fonts & rendering
  "uses-text-compression":
    "My server is not compressing text files before sending them, making them larger than necessary. Please enable Gzip or Brotli compression on the server for HTML, CSS, and JavaScript files — this typically reduces file sizes by 60–80%.",
  "uses-rel-preconnect":
    "My page is wasting time establishing connections to third-party domains (fonts, analytics, CDNs) late in the loading process. Please add <link rel='preconnect'> tags in the HTML head for each important third-party domain so the connection is ready when needed.",
  "uses-rel-preload":
    "Critical files needed to render the page are being discovered too late by the browser. Please add <link rel='preload'> tags for the most important CSS, fonts, and scripts so they start downloading immediately.",
  "font-display":
    "My web fonts are hiding text while they load, causing a blank flash before text appears. Please add font-display: swap to all @font-face declarations so fallback text shows immediately and is replaced by the custom font when it finishes loading.",
  "dom-size":
    "My page has an extremely large number of HTML elements, making the browser work harder to render and update. Please simplify the page structure by removing unnecessary wrapper divs, avoiding rendering hidden content in the DOM, and paginating or virtualizing long lists.",
  "layout-shift-elements":
    "Specific elements on my page are causing layout shifts — they move after the page appears and cause mis-clicks. Please identify the shifting elements and fix them by reserving their space with explicit dimensions or skeleton placeholders.",

  // Third parties
  "third-party-summary":
    "Third-party scripts (analytics, ads, chat widgets, social embeds) are significantly slowing down my page. Please audit all third-party scripts and either remove unnecessary ones, replace them with lighter alternatives, or load them with defer or async so they don't block the page.",
  "third-party-facades":
    "Embedded widgets like live chat, video players, or social feeds are loading immediately and slowing the page. Please replace them with static placeholder images (facades) that only load the real widget when a visitor clicks on it.",

  // Mobile friendliness
  viewport:
    "My app is missing a proper mobile viewport meta tag, which means it appears zoomed out and tiny on phones. Please add <meta name='viewport' content='width=device-width, initial-scale=1'> to the HTML head of every page.",
  "tap-targets":
    "Buttons and links on my app are too small or too close together to tap reliably on a phone. Please make all interactive elements at least 44x44 pixels and add sufficient spacing between them so they are easy to tap without hitting the wrong one.",
  "target-size":
    "Interactive elements like buttons and links are too small to tap comfortably on a phone. Please increase the size of all tap targets to at least 44x44 pixels — this is especially important for navigation links and form buttons.",
  "font-size":
    "Text on my app is too small to read on phones without pinch-zooming. Please ensure the base font size is at least 16px for body text and that no text is smaller than 12px, using relative units rather than fixed pixels.",

  // Security
  "is-on-https":
    "My app is not served over HTTPS, which means browsers will show a security warning to visitors. Please enable SSL/TLS on the server and serve all pages over https:// — most hosting providers offer free certificates through Let's Encrypt.",
  "redirects-http":
    "Visitors who type my URL without https:// are not being automatically redirected to the secure version. Please configure the server to redirect all http:// traffic to https:// so all visitors get the secure version.",
  "clickjacking-mitigation":
    "My app is missing security headers that prevent it from being embedded in malicious iframes. Please add the X-Frame-Options: SAMEORIGIN header (or frame-ancestors 'self' in a Content Security Policy) to all server responses.",
  "csp-xss":
    "My app is missing a Content Security Policy, which protects against cross-site scripting attacks. Please add a Content-Security-Policy header to restrict which sources can run scripts, load styles, and make requests on my page.",
  "trusted-types-xss":
    "My app is not using Trusted Types, a browser security feature that prevents DOM-based script injection. Please enable Trusted Types via the Content-Security-Policy header and update code to use trusted type policies when inserting HTML.",
  "geolocation-on-start":
    "My app asks for location permission immediately when it opens, before the visitor understands why it's needed. Please delay the geolocation request until the user performs an action that makes it obvious why location is required.",
  "notification-on-start":
    "My app asks for notification permission immediately, which most users dismiss or block. Please delay the notification permission request until after the user has engaged with the app and seen its value.",
  "no-vulnerable-libraries":
    "My app is using JavaScript libraries that have known security vulnerabilities. Please update all dependencies to their latest patched versions and run a dependency audit regularly to catch new vulnerabilities.",
  "password-inputs-can-be-pasted-into":
    "My app is blocking users from pasting into password fields, which makes it harder to use password managers. Please remove any JavaScript that prevents paste events on password input fields.",

  // SEO
  "document-title":
    "My page is missing a descriptive title tag, which appears in browser tabs and Google search results. Please add a unique <title> tag to every page that clearly describes what it is about — ideally under 60 characters.",
  "meta-description":
    "My page is missing a meta description, which search engines often show under the link in search results. Please add <meta name='description' content='...'> to every page with a concise summary of the page content (under 160 characters).",
  "link-text":
    "Some links on my page use vague text like 'click here' or 'read more' that doesn't describe the destination. Please update link text to be descriptive — for example, 'View our pricing plans' instead of 'click here'.",
  "crawlable-anchors":
    "Some links on my page can't be followed by search engine crawlers. Please ensure all important links use standard <a href='...'> tags with real URLs, and avoid navigation that relies only on JavaScript click handlers without an href.",
  "is-crawlable":
    "My page has something blocking search engines from indexing it. Please check for noindex meta tags, X-Robots-Tag headers, or disallow rules in robots.txt that might be unintentionally preventing Google from crawling the page.",
  "robots-txt":
    "There may be an issue with my robots.txt file that is accidentally blocking search engines. Please review the robots.txt file to ensure it only blocks pages that should genuinely be kept out of search results.",
  "http-status-code":
    "My page is returning an error status code (like 404 or 500) instead of a successful 200 response. Please fix the page so it returns correctly, or set up a proper redirect if the page has moved.",
  canonical:
    "My page is missing a canonical URL tag, which can confuse search engines when multiple URLs serve the same content. Please add <link rel='canonical' href='...'> to indicate the preferred URL for each page.",
  hreflang:
    "My page has incorrect or missing hreflang tags for multiple languages or regions. Please fix the hreflang attributes to correctly indicate which language/region version of each page should be shown to which users.",
  "structured-data":
    "My page is missing structured data markup that could give it richer search result appearances. Please add schema.org markup (JSON-LD) for the appropriate content type — for example, Article, Product, or FAQPage.",
  "heading-order":
    "The headings on my page don't follow a logical order (H1 → H2 → H3), which confuses screen readers and hurts SEO. Please fix the heading hierarchy so there is one H1 per page and all subheadings nest properly beneath it.",
  "html-has-lang":
    "My page's HTML tag is missing a lang attribute, which means screen readers don't know what language to use. Please add lang='en' (or the appropriate language code) to the <html> tag on every page.",

  // Accessibility
  "color-contrast":
    "Text on my page doesn't have enough contrast against its background, making it hard to read for users with low vision. Please increase the contrast ratio to at least 4.5:1 for normal text and 3:1 for large text — use a contrast checker to verify.",
  "image-alt":
    "Images on my page are missing alt text, which screen readers need to describe them to visually impaired users. Please add descriptive alt attributes to all meaningful images, and use alt='' for purely decorative images.",
  label:
    "Form fields on my page are missing visible labels, making them confusing for screen reader users. Please add a <label> element connected to each form input, or use aria-label if a visible label is not possible.",
  accessibility:
    "My page has accessibility issues that make it harder for people with disabilities to use. Please run an accessibility audit using axe or Lighthouse and fix the flagged issues, starting with anything affecting keyboard navigation and screen reader compatibility.",

  // Best practices / misc
  plugins:
    "My page is using browser plugins like Flash that are no longer supported in modern browsers. Please remove all plugin-based content and replace it with standard HTML5 equivalents.",
  charset:
    "My page is missing a character encoding declaration, which can cause special characters to display incorrectly. Please add <meta charset='UTF-8'> as the first element inside the HTML <head> tag.",
  "valid-source-maps":
    "Source maps for my JavaScript files are invalid or missing, making debugging harder. Please regenerate source maps during the build process, or disable them for production if they are not needed.",
  "inspector-issues":
    "Chrome DevTools has flagged issues on my page that may be affecting users. Please open Chrome DevTools, check the Issues panel, and fix any flagged problems — these often include deprecated APIs, CORS issues, or permission policy violations.",
};

const CATEGORY_FALLBACK_FIX = {
  Performance: (score) =>
    `Speed up load time on phones — your performance score is ${Math.round(score)}/10.`,
  "Mobile Friendliness": (score) =>
    `Improve the phone experience (layout, tap targets, readability) — score ${Math.round(score)}/10.`,
  "Security Basics": (score) =>
    `Strengthen basic security (HTTPS and safe headers) — score ${Math.round(score)}/10.`,
  "SEO Basics": (score) =>
    `Improve search basics (title, description, crawlability) — score ${Math.round(score)}/10.`,
};

const CATEGORY_FALLBACK_PROMPT = {
  Performance:
    "My app scores poorly on performance for mobile users. Please run a Lighthouse audit and fix the flagged performance issues — focus on reducing load time, optimizing images, deferring JavaScript, and improving Core Web Vitals scores.",
  "Mobile Friendliness":
    "My app has mobile usability issues that make it harder to use on phones. Please audit the app for mobile friendliness — check tap target sizes, font sizes, viewport configuration, and ensure the layout works well on small screens.",
  "Security Basics":
    "My app has security issues that should be resolved before launch. Please check that the app uses HTTPS, sends secure response headers, and does not expose vulnerabilities flagged in a Lighthouse security audit.",
  "SEO Basics":
    "My app has SEO issues that may hurt its visibility in search results. Please run an SEO audit and fix the flagged issues — common problems include missing meta tags, poor link structure, and crawlability problems.",
};

const FALLBACK_PROMPTS_BY_CATEGORY = {
  performance:
    "My app has a performance issue slowing it down for mobile users. Please run a Lighthouse audit and fix the flagged performance issues, focusing on load time, JavaScript execution, and Core Web Vitals.",
  seo:
    "My app has an SEO issue that may hurt search visibility. Please run an SEO audit and fix the flagged issues — common problems include missing meta tags, poor link structure, or crawlability problems.",
  accessibility:
    "My app has an accessibility issue making it harder for some users. Please run an accessibility audit using axe or Lighthouse and fix the flagged problems, starting with keyboard navigation and screen reader issues.",
  security:
    "My app has a security issue that should be resolved before launch. Please check security headers, HTTPS configuration, and any flagged vulnerabilities.",
  "best-practices":
    "My app has a best-practice issue flagged by Google's quality tools. Please run a Lighthouse audit, review the Best Practices section, and fix the specific issue found.",
};

export class PageSpeedError extends Error {
  /** @param {number} status */
  constructor(message, status = 500) {
    super(message);
    this.name = "PageSpeedError";
    this.status = status;
  }
}

/**
 * @param {string} url
 */
export function normalizeUrl(url) {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("URL must use http or https");
    }
    return parsed.toString();
  } catch {
    throw new PageSpeedError("Invalid URL. Please enter a valid website address.", 400);
  }
}

/**
 * @param {number | null | undefined} score
 */
function lighthouseScoreToTen(score) {
  if (score === null || score === undefined) {
    return 0;
  }
  return Math.round(score * 100) / 10;
}

/**
 * @param {Record<string, { score?: number | null }>} audits
 * @param {string[]} auditIds
 */
function averageAuditScores(audits, auditIds) {
  const scores = auditIds
    .map((id) => audits[id]?.score)
    .filter((score) => score !== null && score !== undefined);

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * @param {string} text
 */
function firstSentence(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : trimmed;
}

/**
 * Derive a broad category label from an audit ID using the known ID lists.
 * @param {string} auditId
 * @returns {"performance" | "seo" | "accessibility" | "security" | "best-practices"}
 */
function auditCategory(auditId) {
  if (PERFORMANCE_AUDIT_IDS.includes(auditId)) return "performance";
  if (SEO_AUDIT_IDS.includes(auditId)) return "seo";
  if (SECURITY_AUDIT_IDS.includes(auditId)) return "security";
  if (MOBILE_AUDIT_IDS.includes(auditId)) return "best-practices";
  // Heuristic: audit IDs containing these substrings belong to their category
  if (/lcp|fcp|cls|tbt|paint|speed|render|javascript|css|image|font|cache|byte|compress|network|server|redirect|http|dom|task|bootup|blocking|preload|preconnect/.test(auditId)) return "performance";
  if (/seo|title|description|crawl|robots|canonical|hreflang|structured|heading|lang/.test(auditId)) return "seo";
  if (/contrast|alt|label|aria|button|link-name|role|screen/.test(auditId)) return "accessibility";
  return "best-practices";
}

const FALLBACK_FIX_BY_CATEGORY = {
  performance: "A technical speed issue was found — ask your developer to optimize this.",
  seo: "A technical SEO issue was found — ask your developer to review this.",
  accessibility: "A technical accessibility issue was found — ask your developer to fix this.",
  security: "A technical security issue was found — ask your developer to review this.",
  "best-practices": "A technical best-practice issue was found — ask your developer to review this.",
};

/**
 * @param {string} auditId
 * @param {{ title?: string; description?: string }} audit
 */
function plainEnglishFix(auditId, audit) {
  if (PLAIN_ENGLISH_FIXES[auditId]) {
    return PLAIN_ENGLISH_FIXES[auditId];
  }
  return FALLBACK_FIX_BY_CATEGORY[auditCategory(auditId)];
}

/**
 * @param {string} auditId
 * @returns {{ description: string; prompt: string }}
 */
function topFixItem(auditId) {
  return {
    description: plainEnglishFix(auditId, {}),
    prompt: FIX_PROMPTS[auditId] ?? FALLBACK_PROMPTS_BY_CATEGORY[auditCategory(auditId)],
  };
}

/**
 * @param {Record<string, { score?: number | null; title?: string }>} audits
 * @param {string[]} auditIds
 */
function getWorstFailingAuditPlain(audits, auditIds) {
  const failing = auditIds
    .map((id) => ({ id, audit: audits[id] }))
    .filter(
      ({ audit }) =>
        audit && audit.score !== null && audit.score !== undefined && audit.score < 1,
    )
    .sort((a, b) => (a.audit.score ?? 1) - (b.audit.score ?? 1));

  const worst = failing[0];
  if (!worst?.audit) {
    return null;
  }

  return firstSentence(plainEnglishFix(worst.id, worst.audit));
}

/**
 * @param {string} categoryName
 * @param {number} score
 * @param {string | null} issue
 */
function buildSummary(categoryName, score, issue) {
  const rounded = Math.round(score);
  const label = categoryName.replace(/Basics$/, "").trim();

  if (rounded >= 9) {
    return `${label} looks great on phones (${rounded}/10).`;
  }
  if (rounded >= 7) {
    return `${label} is in good shape — only small tweaks needed (${rounded}/10).`;
  }
  if (rounded >= 5) {
    const detail = issue ? ` Biggest issue: ${issue}` : "";
    return `${label} is okay but needs work (${rounded}/10).${detail}`;
  }

  const detail = issue ? ` Start here: ${issue}` : " Fix the main issues before launch.";
  return `${label} needs attention (${rounded}/10).${detail}`;
}

/**
 * @param {Record<string, { score?: number | null; title?: string; description?: string; weight?: number; scoreDisplayMode?: string }>} audits
 */
function getTopFixesFromAudits(audits) {
  return Object.entries(audits)
    .filter(
      ([, audit]) =>
        audit &&
        audit.scoreDisplayMode !== "notApplicable" &&
        audit.score !== null &&
        audit.score !== undefined &&
        audit.score < 1 &&
        audit.title,
    )
    .sort(([idA, a], [idB, b]) => {
      // Audits with a specific plain-English mapping rank above generic fallbacks
      const mappedA = PLAIN_ENGLISH_FIXES[idA] ? 1 : 0;
      const mappedB = PLAIN_ENGLISH_FIXES[idB] ? 1 : 0;
      if (mappedB !== mappedA) return mappedB - mappedA;
      // Within the same tier, rank by Lighthouse weight (higher = more impactful)
      return (b.weight ?? 0) - (a.weight ?? 0);
    })
    .slice(0, 3)
    .map(([auditId]) => topFixItem(auditId));
}

/**
 * @param {Array<{ name: string; score: number }>} categories
 * @param {Array<{ description: string; prompt: string }>} auditFixes
 * @returns {Array<{ description: string; prompt: string }>}
 */
function buildTopFixes(categories, auditFixes) {
  const fixes = [...auditFixes];

  if (fixes.length < 3) {
    for (const category of categories) {
      if (fixes.length >= 3) break;
      if (category.score >= 7) continue;
      const fallbackDesc = CATEGORY_FALLBACK_FIX[category.name];
      const fallbackPrompt = CATEGORY_FALLBACK_PROMPT[category.name];
      fixes.push({
        description: fallbackDesc
          ? fallbackDesc(category.score)
          : `Improve ${category.name} — score ${Math.round(category.score)}/10.`,
        prompt: fallbackPrompt ?? FALLBACK_PROMPTS_BY_CATEGORY["best-practices"],
      });
    }
  }

  while (fixes.length < 3) {
    fixes.push({
      description: "Run another check after you make changes to see your score improve.",
      prompt:
        "Please make any performance, SEO, or accessibility improvements you can, then re-run the readiness check to measure your progress.",
    });
  }

  return fixes.slice(0, 3);
}

/**
 * @param {string} url
 * @param {string} apiKey
 */
export async function analyzeWithPageSpeed(url, apiKey) {
  const normalizedUrl = normalizeUrl(url);

  const params = new URLSearchParams({
    url: normalizedUrl,
    key: apiKey,
    strategy: "mobile",
  });

  for (const category of ["performance", "seo", "best-practices"]) {
    params.append("category", category);
  }

  let response;
  try {
    response = await fetch(`${PAGESPEED_API}?${params}`, {
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new PageSpeedError(
        "PageSpeed analysis timed out. The site may be slow or unreachable — please try again.",
        504,
      );
    }
    throw new PageSpeedError("Could not reach Google PageSpeed API. Please try again.", 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new PageSpeedError(
      "ERROR_BLOCKED_SITE: The website may be blocking our analysis tool or not returning data.",
      502,
    );
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `PageSpeed API error (${response.status})`;

    if (response.status === 429) {
      throw new PageSpeedError("PageSpeed API quota exceeded. Please wait a moment and try again.", 429);
    }
    if (response.status === 400) {
      // 400 often means the site rejected the request
      throw new PageSpeedError(
        "ERROR_BLOCKED_SITE: " + (message || "The website is blocking our analysis tool."),
        400,
      );
    }
    if (response.status === 403) {
      throw new PageSpeedError(
        "PageSpeed API access denied. Check that PAGESPEED_API_KEY is valid and the PageSpeed Insights API is enabled.",
        500,
      );
    }

    throw new PageSpeedError(message, 502);
  }

  const lighthouse = payload.lighthouseResult;
  if (!lighthouse?.categories || !lighthouse.audits) {
    throw new PageSpeedError("PageSpeed returned incomplete results. Please try again.", 502);
  }

  const { categories, audits } = lighthouse;

  const performanceScore = lighthouseScoreToTen(categories.performance?.score);
  const seoScore = lighthouseScoreToTen(categories.seo?.score);

  const mobileRaw = averageAuditScores(audits, MOBILE_AUDIT_IDS);
  const mobileScore =
    mobileRaw !== null
      ? lighthouseScoreToTen(mobileRaw)
      : lighthouseScoreToTen(categories["best-practices"]?.score);

  const securityRaw = averageAuditScores(audits, SECURITY_AUDIT_IDS);
  const securityScore =
    securityRaw !== null
      ? lighthouseScoreToTen(securityRaw)
      : lighthouseScoreToTen(categories["best-practices"]?.score);

  const categoryResults = [
    {
      name: "Performance",
      score: performanceScore,
      summary: buildSummary(
        "Performance",
        performanceScore,
        getWorstFailingAuditPlain(audits, PERFORMANCE_AUDIT_IDS),
      ),
    },
    {
      name: "Mobile Friendliness",
      score: mobileScore,
      summary: buildSummary(
        "Mobile friendliness",
        mobileScore,
        getWorstFailingAuditPlain(audits, MOBILE_AUDIT_IDS),
      ),
    },
    {
      name: "Security Basics",
      score: securityScore,
      summary: buildSummary(
        "Security",
        securityScore,
        getWorstFailingAuditPlain(audits, SECURITY_AUDIT_IDS),
      ),
    },
    {
      name: "SEO Basics",
      score: seoScore,
      summary: buildSummary("SEO", seoScore, getWorstFailingAuditPlain(audits, SEO_AUDIT_IDS)),
    },
  ];

  const overallPercentage = Math.round(
    (categoryResults.reduce((sum, category) => sum + category.score, 0) / categoryResults.length) * 10,
  );

  return {
    url: normalizedUrl,
    overallPercentage,
    categories: categoryResults,
    topFixes: buildTopFixes(categoryResults, getTopFixesFromAudits(audits)),
  };
}
