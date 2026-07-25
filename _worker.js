/**
 * SF Tools — Cloudflare Pages _worker.js
 * Dynamic rendering: bots get pre-rendered HTML, users get the SPA.
 * Google officially recommends this pattern for JS-heavy SPAs.
 */

const BASE = 'https://www.salesforcetools.in';

const BOT = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|twitterbot|linkedinbot|facebookexternalhit|facebot|whatsapp|telegrambot|applebot|discordbot|slackbot|semrushbot|ahrefsbot|mj12bot|rogerbot|screaming.frog|pinterestbot|redditbot|ia_archiver|archive\.org_bot|bytespider|gptbot|claudebot/i;

const STATIC = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|json|xml|txt|webmanifest|map|pdf|zip)$/i;

/* ── Per-route SEO content ───────────────────────────────────────────── */
const PAGES = {

  '/': {
    title: 'SF Tools — Free Salesforce Developer Tools | AI Test Class Generator, Workbench Alternative & 28+ Tools',
    desc:  'Free Salesforce developer and admin tools — AI Apex test class generator, debug log viewer, REST API explorer (Workbench alternative), SOQL builder, field security checker, profile comparator, package XML builder & 28+ tools. No signup required.',
    h1:    'Free Salesforce Developer & Admin Tools',
    body:  `<p>SF Tools (salesforcetools.in) is the most comprehensive free browser-based toolkit for Salesforce developers and admins in 2026. Access 28+ tools with no signup, no installation, and no cost. Connect your Salesforce org securely via OAuth and start working instantly.</p>
<h2>AI-Powered Tools</h2>
<ul>
  <li><a href="/test-generator">AI Apex Test Class Generator</a> — Generate complete Apex test classes with 90%+ coverage automatically using Claude AI. Paste your Apex class and get a full test class with @TestSetup, positive, negative, and bulk tests in seconds.</li>
  <li><a href="/agent">Salesforce AI Agent</a> — Chat with your Salesforce org in plain English. Ask questions, run SOQL queries, and execute Apex — no coding required.</li>
</ul>
<h2>Org Tools (requires Salesforce OAuth)</h2>
<ul>
  <li><a href="/rest-explorer">REST API Explorer</a> — Free Workbench alternative for Salesforce REST API</li>
  <li><a href="/apex-execute">Execute Anonymous Apex</a> — Run Apex code in your org instantly</li>
  <li><a href="/debug-logs">Debug Log Viewer</a> — Browse and analyze Apex debug logs</li>
  <li><a href="/field-security">Field Security Checker</a> — Check FLS for any object and profile</li>
  <li><a href="/test-coverage">Apex Test Coverage Report</a> — View coverage for all Apex classes</li>
  <li><a href="/profile-compare">Profile & Permission Set Comparator</a> — Diff two profiles side by side</li>
  <li><a href="/flow-inspector">Flow Inspector</a> — Browse all Flows and Process Builders</li>
  <li><a href="/org-limits">Org Limits Dashboard</a> — Monitor governor limits in real time</li>
  <li><a href="/dependencies">Metadata Dependency Finder</a> — Find references for any component</li>
  <li><a href="/record-explorer">Record Explorer</a> — Browse any sObject record by ID or SOQL</li>
  <li><a href="/scheduled-jobs">Scheduled Jobs Manager</a> — View and manage scheduled Apex</li>
  <li><a href="/user-explorer">User & License Explorer</a> — Track user licenses and profiles</li>
  <li><a href="/perm-sets">Permission Set Viewer</a> — Browse permission sets and assignments</li>
  <li><a href="/val-rules">Validation Rule Viewer</a> — List all validation rules by object</li>
  <li><a href="/deploy-status">Deployment Status Checker</a> — Track metadata deployment status</li>
</ul>
<h2>Free Tools (no login required)</h2>
<ul>
  <li><a href="/package-xml">Package XML Builder</a> — Build deployment manifests for 150+ metadata types</li>
  <li><a href="/soql-builder">SOQL Relationship Builder</a> — Build SOQL queries visually</li>
  <li><a href="/code-diff">Code Diff Tool</a> — Compare Apex and Salesforce code side by side</li>
  <li><a href="/formatter">JSON & XML Formatter</a> — Beautify and validate Salesforce API responses</li>
  <li><a href="/cron-builder">Cron Expression Builder</a> — Build Salesforce scheduled job cron expressions</li>
  <li><a href="/certifications">Salesforce Certifications Guide</a> — All 40 certifications with exam details</li>
</ul>`
  },

  '/test-generator': {
    title: 'AI Salesforce Apex Test Class Generator — Auto-Generate with 90%+ Coverage | SF Tools',
    desc:  'Generate complete Salesforce Apex test classes automatically using AI. Paste your Apex class, get a full @IsTest class with @TestSetup, positive tests, negative tests, bulk tests and 90%+ coverage in seconds. Free with Anthropic API key.',
    h1:    'AI Salesforce Apex Test Class Generator',
    body:  `<p>The SF Tools AI Apex Test Class Generator uses Claude AI to automatically generate complete, production-ready Apex test classes for your Salesforce code. Stop writing boilerplate test code manually — paste your Apex class and get a full test class in seconds.</p>
<h2>What the AI generates</h2>
<ul>
  <li><strong>@TestSetup methods</strong> — Creates reusable test data for all test methods</li>
  <li><strong>Positive test cases</strong> — Tests happy path scenarios with assertions</li>
  <li><strong>Negative test cases</strong> — Tests error handling and exception scenarios</li>
  <li><strong>Bulk test cases</strong> — Tests with 200+ records for governor limit safety</li>
  <li><strong>90%+ code coverage</strong> — Designed to meet and exceed Salesforce's 75% requirement</li>
</ul>
<h2>How to use</h2>
<ol>
  <li>Go to <a href="/test-generator">salesforcetools.in/test-generator</a></li>
  <li>Paste your Apex class code (triggers, service classes, controllers, etc.)</li>
  <li>Click "Generate Test Class"</li>
  <li>Get a complete @IsTest class ready to deploy</li>
</ol>
<h2>FAQ</h2>
<h3>How do I generate an Apex test class automatically?</h3>
<p>Use SF Tools AI Test Class Generator at salesforcetools.in/test-generator. Paste your Apex class code and get a full test class with @TestSetup, positive tests, negative tests, bulk tests, and 90%+ coverage — in seconds. Requires a free Anthropic API key or SF Tools Pro subscription.</p>
<h3>Does it work for Apex triggers?</h3>
<p>Yes — the generator supports Apex classes, triggers, batch classes, schedulable classes, queueable jobs, and REST API handlers.</p>
<h3>Is it free?</h3>
<p>Yes — use your free Anthropic API key, or upgrade to <a href="/pro">SF Tools Pro</a> for instant access without API key setup.</p>`
  },

  '/agent': {
    title: 'Salesforce AI Agent — Chat with Your Org in Plain English | SF Tools',
    desc:  'AI-powered Salesforce assistant that understands plain English. Ask questions about your org, run SOQL queries automatically, execute Apex, analyze data — no coding required. Connect your Salesforce org and start chatting.',
    h1:    'Salesforce AI Agent',
    body:  `<p>The SF Tools AI Agent lets you interact with your Salesforce org using natural language. Ask questions, run SOQL queries, execute Apex code, and analyze org data — all through a conversational chat interface powered by Claude AI.</p>
<h2>What you can ask the AI Agent</h2>
<ul>
  <li>"Show me all Accounts created this month"</li>
  <li>"How many open opportunities do we have?"</li>
  <li>"Find all contacts without an email address"</li>
  <li>"What are my org's API limits?"</li>
  <li>"Run a SOQL query to find duplicate leads"</li>
  <li>"Execute anonymous Apex to update all inactive users"</li>
</ul>
<h2>How it works</h2>
<ol>
  <li>Connect your Salesforce org via OAuth at <a href="/agent">salesforcetools.in/agent</a></li>
  <li>Type your question in plain English</li>
  <li>The AI translates it to SOQL or Apex and runs it automatically</li>
  <li>Results are shown in a readable format with explanations</li>
</ol>
<h2>FAQ</h2>
<h3>Can I run SOSL global search queries online?</h3>
<p>Yes — the AI Agent at salesforcetools.in/agent understands plain English and can run SOSL searches across multiple objects simultaneously. Just ask it to search for something and it handles the query automatically.</p>`
  },

  '/rest-explorer': {
    title: 'Salesforce REST API Explorer — Free Workbench Alternative 2026 | SF Tools',
    desc:  'Free Salesforce REST API Explorer — browse sObject endpoints, run SOQL queries, make GET/POST/PATCH/DELETE calls. The best free Workbench alternative in 2026. No installation needed, works in your browser.',
    h1:    'Salesforce REST API Explorer — Free Workbench Alternative',
    body:  `<p>SF Tools REST Explorer is a free browser-based Salesforce REST API explorer — the best Workbench alternative available in 2026. Connect your Salesforce org via OAuth and instantly explore REST endpoints, run SOQL queries, and make API calls without any installation.</p>
<h2>Features</h2>
<ul>
  <li>Browse all Salesforce sObject REST endpoints</li>
  <li>Run SOQL queries and see formatted results</li>
  <li>Make GET, POST, PATCH, DELETE API calls</li>
  <li>View formatted JSON responses with syntax highlighting</li>
  <li>Access Tooling API and Metadata API endpoints</li>
  <li>No installation required — runs entirely in your browser</li>
  <li>AI-assisted endpoint suggestions</li>
</ul>
<h2>Why use SF Tools instead of Workbench?</h2>
<ul>
  <li>Faster — no server round-trips, runs in browser</li>
  <li>Modern UI — cleaner than the legacy Workbench interface</li>
  <li>AI-powered — ask AI to help construct queries</li>
  <li>Always available — no downtime or maintenance windows</li>
  <li>Free — no subscription required</li>
</ul>
<h2>FAQ</h2>
<h3>Is there a free Salesforce Workbench alternative?</h3>
<p>Yes — SF Tools REST Explorer (salesforcetools.in/rest-explorer) is a free Workbench alternative. Connect your Salesforce org via OAuth, browse sObject endpoints, run SOQL queries, and make GET/POST/PATCH/DELETE REST API calls directly from your browser. No installation needed.</p>
<h3>Does it support the Salesforce Tooling API?</h3>
<p>Yes — you can access the Tooling API, Metadata API, and all standard REST API endpoints through the SF Tools REST Explorer.</p>`
  },

  '/package-xml': {
    title: 'Salesforce Package XML Generator — Build package.xml for 150+ Metadata Types | SF Tools',
    desc:  'Free Salesforce package.xml generator. Search from 150+ metadata types, add components, bulk import, and download a ready-to-deploy package.xml file. No login required.',
    h1:    'Salesforce Package XML Builder',
    body:  `<p>Build Salesforce deployment package.xml files instantly. Search from 150+ metadata types, add components by name, bulk import from a list, and download a ready-to-use package.xml in seconds — no Salesforce login required.</p>
<h2>Supported Metadata Types (150+)</h2>
<ul>
  <li>ApexClass, ApexTrigger, ApexPage, ApexComponent</li>
  <li>CustomObject, CustomField, CustomMetadata, CustomSettings</li>
  <li>Flow, FlowDefinition, WorkflowRule, ProcessBuilder</li>
  <li>Layout, PermissionSet, Profile, Role</li>
  <li>Report, Dashboard, EmailTemplate</li>
  <li>LightningComponentBundle, AuraDefinitionBundle</li>
  <li>StaticResource, ContentAsset, Document</li>
  <li>And 120+ more metadata types</li>
</ul>
<h2>How to use</h2>
<ol>
  <li>Go to <a href="/package-xml">salesforcetools.in/package-xml</a></li>
  <li>Search for a metadata type (e.g. "ApexClass")</li>
  <li>Add component names — one per line, or use * for all</li>
  <li>Repeat for all metadata types needed</li>
  <li>Click Generate (Ctrl+G) and Download (Ctrl+D)</li>
</ol>
<h2>FAQ</h2>
<h3>How do I generate a package.xml for Salesforce deployment?</h3>
<p>Use the SF Tools Package.xml Generator at salesforcetools.in/package-xml. Search from 150+ Salesforce metadata types, add components by name, bulk import from text, and download a ready-to-deploy package.xml file.</p>`
  },

  '/apex-execute': {
    title: 'Execute Anonymous Apex Online — Run Apex in Your Salesforce Org | SF Tools',
    desc:  'Run anonymous Apex code in your connected Salesforce org instantly. Like the Developer Console Execute Anonymous window, but better — with AI assistance, syntax highlighting, and execution history.',
    h1:    'Execute Anonymous Apex Online',
    body:  `<p>Run anonymous Apex code directly in your connected Salesforce org — just like the Developer Console Execute Anonymous window, but faster and with AI assistance. Connect your org, write Apex, and execute with a click.</p>
<h2>Features</h2>
<ul>
  <li>Execute any anonymous Apex code in your Salesforce org</li>
  <li>See debug output and execution results instantly</li>
  <li>AI-powered Apex code suggestions and error explanations</li>
  <li>Syntax highlighting for Apex code</li>
  <li>Execution history — save and reuse common snippets</li>
  <li>Keyboard shortcut: Ctrl+Enter to run</li>
</ul>
<h2>Common use cases</h2>
<ul>
  <li>Update records in bulk without writing a data loader job</li>
  <li>Test Apex logic before deploying</li>
  <li>Run administrative tasks programmatically</li>
  <li>Debug issues in production without deploying code</li>
  <li>Quickly test SOQL queries and DML operations</li>
</ul>`
  },

  '/debug-logs': {
    title: 'Salesforce Debug Log Viewer — Browse & Analyze Apex Logs | SF Tools',
    desc:  'Browse, search and analyze Salesforce Apex debug logs online. Filter logs by user, operation type, and log level. View formatted log output with highlighted errors and SOQL queries.',
    h1:    'Salesforce Debug Log Viewer',
    body:  `<p>Browse, search and analyze Salesforce Apex debug logs directly in your browser. Connect your Salesforce org and instantly access debug logs — no Developer Console needed.</p>
<h2>Features</h2>
<ul>
  <li>List all debug logs with user, date, duration, and size</li>
  <li>Open and read formatted log content with syntax highlighting</li>
  <li>Filter by user and log category</li>
  <li>Highlight SOQL queries, DML statements, and exceptions</li>
  <li>Set up new debug log traces for specific users</li>
  <li>Download logs for offline analysis</li>
</ul>
<h2>How to analyze Salesforce debug logs</h2>
<ol>
  <li>Connect your Salesforce org via OAuth at <a href="/debug-logs">salesforcetools.in/debug-logs</a></li>
  <li>Select the log you want to analyze</li>
  <li>View formatted output with highlighted errors, SOQL, and DML</li>
  <li>Use search to find specific events in large logs</li>
</ol>`
  },

  '/field-security': {
    title: 'Salesforce Field Level Security Checker — FLS Checker Online | SF Tools',
    desc:  'Check field-level security (FLS) for any Salesforce object and profile or permission set. Instantly see which fields are readable, editable, or hidden — without going through Setup.',
    h1:    'Salesforce Field Level Security (FLS) Checker',
    body:  `<p>Check Salesforce field-level security (FLS) permissions instantly. Select any sObject and any Profile or Permission Set, and see a complete table of field permissions — readable, editable, or restricted — without navigating through Setup menus.</p>
<h2>Features</h2>
<ul>
  <li>Check FLS for any sObject across all Profiles and Permission Sets</li>
  <li>View Read and Edit permissions side by side</li>
  <li>Filter fields to find hidden or restricted fields quickly</li>
  <li>Compare FLS across multiple profiles</li>
  <li>Export results to CSV</li>
</ul>
<h2>FAQ</h2>
<h3>How do I check field-level security in Salesforce?</h3>
<p>Use SF Tools Field Security Checker at salesforcetools.in/field-security. Connect your Salesforce org, select an sObject and a Profile or Permission Set, and instantly see which fields are readable, editable, or restricted — without going through Setup.</p>`
  },

  '/test-coverage': {
    title: 'Salesforce Apex Test Coverage Report — Check Code Coverage Online | SF Tools',
    desc:  'View Salesforce Apex test coverage for all classes instantly. Filter by coverage threshold, find classes below 75%, export to CSV. Free alternative to the Developer Console coverage report.',
    h1:    'Salesforce Apex Test Coverage Report',
    body:  `<p>View Apex code coverage for all classes in your Salesforce org instantly. Filter by coverage threshold, identify classes below 75%, and export results to CSV — without opening the Developer Console.</p>
<h2>Features</h2>
<ul>
  <li>See coverage percentage for all Apex classes and triggers</li>
  <li>Filter by threshold — find all classes below 75% or 90%</li>
  <li>View line-by-line covered and uncovered code</li>
  <li>Export coverage report to CSV for documentation</li>
  <li>Sort by coverage, class name, or last modified date</li>
</ul>
<h2>FAQ</h2>
<h3>How can I check Salesforce Apex test coverage?</h3>
<p>Use SF Tools Test Coverage at salesforcetools.in/test-coverage. Connect your Salesforce org and instantly see code coverage percentages for all Apex classes. Filter by coverage threshold, export to CSV, and identify which classes need more test coverage.</p>`
  },

  '/profile-compare': {
    title: 'Salesforce Profile Comparator — Diff Two Profiles or Permission Sets | SF Tools',
    desc:  'Compare two Salesforce profiles or permission sets side by side. See every difference in object permissions, field permissions, and system permissions highlighted. Free online profile diff tool.',
    h1:    'Salesforce Profile & Permission Set Comparator',
    body:  `<p>Compare any two Salesforce profiles or permission sets side by side and see every difference instantly. Object permissions, field permissions, system permissions, and tab settings — all differences are highlighted clearly.</p>
<h2>Features</h2>
<ul>
  <li>Compare any two Profiles or Permission Sets side by side</li>
  <li>See added, removed, and changed permissions highlighted</li>
  <li>Compare object permissions, field permissions, and system permissions</li>
  <li>Compare Apex class and Visualforce page access</li>
  <li>Export the diff report to CSV</li>
  <li>Works for standard and custom profiles</li>
</ul>
<h2>FAQ</h2>
<h3>How do I compare two Salesforce profiles side by side?</h3>
<p>Use SF Tools Profile Comparator at salesforcetools.in/profile-compare. Connect your Salesforce org, select any two profiles or permission sets, and instantly see every difference in object permissions, field permissions, and system permissions side by side.</p>`
  },

  '/soql-builder': {
    title: 'Salesforce SOQL Query Builder — Build Queries Visually | SF Tools',
    desc:  'Build Salesforce SOQL queries visually — no coding required. Select the object, choose fields, add WHERE conditions, set up parent-child relationships, and get ready-to-use Apex code.',
    h1:    'Salesforce SOQL Relationship Builder',
    body:  `<p>Build Salesforce SOQL queries visually with point-and-click simplicity. Select your sObject, choose fields, add WHERE filters, and build parent-to-child and child-to-parent relationship queries — then get the ready-to-use SOQL and Apex code.</p>
<h2>Features</h2>
<ul>
  <li>Visual object and field selector — no memorising API names</li>
  <li>Add WHERE, ORDER BY, LIMIT, and OFFSET clauses visually</li>
  <li>Build parent-to-child (subquery) and child-to-parent relationships</li>
  <li>Generate ready-to-use Apex code with the SOQL query</li>
  <li>Copy SOQL to clipboard with one click</li>
</ul>
<h2>FAQ</h2>
<h3>Can I build SOQL queries visually without writing code?</h3>
<p>Yes — the SF Tools SOQL Builder at salesforcetools.in/soql-builder lets you build SOQL queries visually. Select the object, choose fields, add WHERE conditions, and set up parent-to-child and child-to-parent relationship queries. The tool also generates ready-to-use Apex code.</p>`
  },

  '/flow-inspector': {
    title: 'Salesforce Flow Inspector — List All Flows & Process Builders | SF Tools',
    desc:  'Browse and filter all Salesforce Flows and Process Builders in your org. View type, status, trigger object, and last modified date. Free Flow management tool for Salesforce admins.',
    h1:    'Salesforce Flow Inspector',
    body:  `<p>Get a complete list of all Flows and Process Builders in your Salesforce org with their type, status, trigger object, and last modified details. Filter and search to quickly find what you need.</p>
<h2>Features</h2>
<ul>
  <li>List all Flows and Process Builders with full details</li>
  <li>Filter by type: Screen Flow, Auto-launched, Schedule-Triggered, Record-Triggered</li>
  <li>Filter by status: Active, Inactive, Draft</li>
  <li>Filter by trigger object</li>
  <li>See last modified date and created by information</li>
  <li>Export flow list to CSV</li>
</ul>
<h2>FAQ</h2>
<h3>How do I view all Flows and Process Builders in my Salesforce org?</h3>
<p>Use SF Tools Flow Inspector at salesforcetools.in/flow-inspector. Connect your Salesforce org and get a complete list of all Flows and Process Builders with their type, status, trigger object, and last modified date. You can filter by type, status or object to quickly find what you need.</p>`
  },

  '/org-limits': {
    title: 'Salesforce Org Limits Dashboard — Monitor Governor Limits in Real Time | SF Tools',
    desc:  'Monitor Salesforce governor limits and API usage in real time. See daily API requests, concurrent Apex executions, SOQL rows, data storage, file storage and more — all in one dashboard.',
    h1:    'Salesforce Org Limits Dashboard',
    body:  `<p>Monitor all Salesforce governor limits and API usage in real time without digging through Setup. Connect your org and see a live dashboard of all limit consumption — daily API calls, concurrent executions, storage, and more.</p>
<h2>Limits monitored</h2>
<ul>
  <li>Daily API Requests (remaining vs total)</li>
  <li>Concurrent Apex Executions</li>
  <li>SOQL Query Rows returned</li>
  <li>Data Storage usage</li>
  <li>File Storage usage</li>
  <li>Daily Bulk API calls</li>
  <li>Streaming API Events</li>
  <li>Email sending limits</li>
  <li>And 20+ more governor limits</li>
</ul>
<h2>FAQ</h2>
<h3>How do I monitor Salesforce governor limits in real time?</h3>
<p>Use SF Tools Org Limits Dashboard at salesforcetools.in/org-limits. Connect your Salesforce org to see real-time governor limit consumption including daily API requests remaining, concurrent Apex executions, SOQL query rows, data storage, file storage, and more — all in one place without digging through Setup.</p>`
  },

  '/dependencies': {
    title: 'Salesforce Metadata Dependency Finder — Find Component References | SF Tools',
    desc:  'Find all metadata dependencies for any Salesforce component. See every component that references it and everything it depends on. Essential for safe refactoring and deletion.',
    h1:    'Salesforce Metadata Dependency Finder',
    body:  `<p>Find all references and dependencies for any Salesforce metadata component before you refactor, rename, or delete it. Enter a component name and instantly see the complete dependency graph — what uses it and what it uses.</p>
<h2>Features</h2>
<ul>
  <li>Find all components that reference a given metadata component</li>
  <li>Find all components that a given component depends on</li>
  <li>Supports Apex classes, fields, objects, flows, validation rules, and more</li>
  <li>Safe refactoring — know the full impact before making changes</li>
  <li>Export dependency list to CSV</li>
</ul>
<h2>FAQ</h2>
<h3>How do I find metadata dependencies in Salesforce?</h3>
<p>Use SF Tools Metadata Dependency Finder at salesforcetools.in/dependencies. Connect your Salesforce org, enter a component name, and see every component that references it and every component it depends on. This helps you safely refactor, delete, or change Salesforce metadata.</p>`
  },

  '/record-explorer': {
    title: 'Salesforce Record Explorer — Browse Any sObject Record by ID | SF Tools',
    desc:  'Browse any Salesforce sObject record by ID or SOQL query. View all field values, related records, and record history. Free online Salesforce record viewer.',
    h1:    'Salesforce Record Explorer',
    body:  `<p>Browse any Salesforce sObject record by its 15 or 18 character ID, or run a SOQL query to find records. See all field values, related lists, and record details without opening Salesforce Setup or the classic detail page.</p>
<h2>Features</h2>
<ul>
  <li>Look up any record by ID (15 or 18 character)</li>
  <li>Run SOQL queries to find records</li>
  <li>View all field values including system fields</li>
  <li>Browse related records and child relationships</li>
  <li>See field API names alongside labels</li>
  <li>Works for standard and custom objects</li>
</ul>`
  },

  '/scheduled-jobs': {
    title: 'Salesforce Scheduled Jobs Manager — View & Manage Scheduled Apex | SF Tools',
    desc:  'View and manage all Salesforce scheduled Apex jobs in one place. See job name, status, next run time, and abort unwanted jobs — without going through Setup.',
    h1:    'Salesforce Scheduled Jobs Manager',
    body:  `<p>View all scheduled Apex jobs in your Salesforce org, monitor their status and next run times, and abort unwanted jobs — without navigating through Setup > Scheduled Jobs.</p>
<h2>Features</h2>
<ul>
  <li>List all scheduled Apex jobs with status and next run time</li>
  <li>See job class, cron expression, and job owner</li>
  <li>Abort selected scheduled jobs with one click</li>
  <li>View job execution history</li>
  <li>Filter by status: Waiting, Running, Complete, Error, Deleted</li>
</ul>`
  },

  '/user-explorer': {
    title: 'Salesforce User & License Explorer — Browse Users and Track License Usage | SF Tools',
    desc:  'Browse Salesforce users and track license consumption. See user profiles, permission sets, active/inactive status, and license usage across your org.',
    h1:    'Salesforce User & License Explorer',
    body:  `<p>Browse all Salesforce users, track license usage, view user profiles and permission sets, and monitor active vs inactive user counts — all in one place.</p>
<h2>Features</h2>
<ul>
  <li>Browse all users with profile, role, and license type</li>
  <li>Track license consumption vs total available</li>
  <li>Filter by active/inactive, profile, or license type</li>
  <li>View permission sets assigned to each user</li>
  <li>Identify inactive users consuming licenses</li>
  <li>Export user list to CSV</li>
</ul>`
  },

  '/perm-sets': {
    title: 'Salesforce Permission Set Viewer — Browse Permissions & Assignments | SF Tools',
    desc:  'Browse all Salesforce permission sets, view their object and field permissions, and see which users are assigned to each permission set. Free online permission set viewer.',
    h1:    'Salesforce Permission Set Viewer',
    body:  `<p>Browse all permission sets in your Salesforce org, see their complete permissions (object, field, system), and view user assignments — without opening each permission set individually in Setup.</p>
<h2>Features</h2>
<ul>
  <li>List all permission sets with description and license type</li>
  <li>View object permissions, field permissions, and system permissions</li>
  <li>See all users assigned to a permission set</li>
  <li>Browse Apex class and Visualforce page access</li>
  <li>Search and filter permission sets by name or permission</li>
</ul>`
  },

  '/val-rules': {
    title: 'Salesforce Validation Rule Viewer — List All Validation Rules | SF Tools',
    desc:  'View all Salesforce validation rules across all objects in one place. See rule name, active/inactive status, error condition formula, error message grouped by object.',
    h1:    'Salesforce Validation Rule Viewer',
    body:  `<p>See every validation rule in your Salesforce org grouped by object — rule name, active status, error condition formula, error message, and description — without clicking through Setup for each object.</p>
<h2>Features</h2>
<ul>
  <li>List all validation rules across all sObjects</li>
  <li>Group by object for easy navigation</li>
  <li>See active/inactive status at a glance</li>
  <li>View error condition formula and error message</li>
  <li>Filter by object name or active status</li>
  <li>Export to CSV for org documentation</li>
</ul>
<h2>FAQ</h2>
<h3>How do I view all validation rules across Salesforce objects?</h3>
<p>Use SF Tools Validation Rule Viewer at salesforcetools.in/val-rules. Connect your Salesforce org and see every validation rule across all sObjects — rule name, active/inactive status, error condition formula, error message, and description, all grouped by object.</p>`
  },

  '/deploy-status': {
    title: 'Salesforce Deployment Status Checker — Track Metadata Deployment | SF Tools',
    desc:  'Check Salesforce metadata deployment status by deployment ID. See deployment progress, component results, test results, and errors in real time.',
    h1:    'Salesforce Deployment Status Checker',
    body:  `<p>Check the status of any Salesforce metadata deployment by its deployment ID. See deployment progress, per-component results, Apex test results, and any errors — in real time without opening Setup.</p>
<h2>Features</h2>
<ul>
  <li>Check deployment status by deployment ID</li>
  <li>See overall progress — components deployed vs total</li>
  <li>View per-component success and failure results</li>
  <li>See Apex test run results and coverage during deployment</li>
  <li>View detailed error messages for failed components</li>
</ul>`
  },

  '/code-diff': {
    title: 'Salesforce Code Diff Tool — Compare Apex Code Side by Side | SF Tools',
    desc:  'Compare two Apex classes, LWC files, triggers, or any Salesforce code side by side. Highlight additions, deletions, and changes. Free online code diff tool for Salesforce developers.',
    h1:    'Salesforce Code Diff Tool',
    body:  `<p>Compare any two pieces of Salesforce code side by side — Apex classes, triggers, LWC JavaScript, HTML templates, CSS, or any text. Differences are highlighted clearly with additions in green and deletions in red.</p>
<h2>Features</h2>
<ul>
  <li>Side-by-side diff view with syntax highlighting</li>
  <li>Supports Apex, JavaScript, HTML, CSS, XML, and any text</li>
  <li>Character-level diff highlighting for precise change detection</li>
  <li>No file upload needed — paste code directly</li>
  <li>Copy diff results to clipboard</li>
</ul>`
  },

  '/formatter': {
    title: 'Salesforce JSON & XML Formatter — Beautify and Validate API Responses | SF Tools',
    desc:  'Beautify, validate, and format Salesforce JSON and XML responses. Also formats Apex code. Free online formatter for Salesforce developers.',
    h1:    'JSON, XML & Apex Formatter',
    body:  `<p>Paste messy JSON, XML, or Apex code and instantly get a clean, formatted, and validated version. Ideal for reading Salesforce REST API responses, metadata XML files, and Apex code.</p>
<h2>Features</h2>
<ul>
  <li>Format and beautify JSON with syntax highlighting</li>
  <li>Format and validate XML (Salesforce metadata files)</li>
  <li>Format Apex code</li>
  <li>JSON validation — see errors with line numbers</li>
  <li>Minify JSON and XML for smaller payload sizes</li>
  <li>No data sent to server — formatting happens in your browser</li>
</ul>`
  },

  '/cron-builder': {
    title: 'Salesforce Cron Expression Builder — Build Scheduled Apex Cron Expressions | SF Tools',
    desc:  'Build Salesforce scheduled Apex cron expressions visually. See next run times, validate your expression, and generate ready-to-use System.schedule() Apex code.',
    h1:    'Salesforce Cron Expression Builder',
    body:  `<p>Build valid Salesforce cron expressions for scheduled Apex jobs visually. Set seconds, minutes, hours, day, month, and day-of-week with a point-and-click interface, then see the next 10 run times and get ready-to-use Apex code.</p>
<h2>Features</h2>
<ul>
  <li>Visual cron expression builder — no memorising syntax</li>
  <li>Shows next 10 scheduled run times instantly</li>
  <li>Validates expression against Salesforce cron format</li>
  <li>Generates System.schedule() Apex code</li>
  <li>Common templates: Every hour, Daily at midnight, Weekly, Monthly</li>
</ul>
<h2>FAQ</h2>
<h3>What is the Salesforce cron expression format for scheduled jobs?</h3>
<p>Salesforce cron expressions use a 6-field format: Seconds Minutes Hours Day-of-month Month Day-of-week. Use SF Tools Cron Builder at salesforcetools.in/cron-builder to build cron expressions visually and see the next run times. Example: '0 0 12 * * ?' runs every day at noon.</p>`
  },

  '/certifications': {
    title: 'Salesforce Certifications Guide 2026 — All 40 Certs with Exam Details | SF Tools',
    desc:  'Complete guide to all Salesforce certifications in 2026. Exam format, passing score, question count, cost, and recommended experience for all 40 Salesforce certifications including Admin, Developer, Architect, and Consultant tracks.',
    h1:    'Salesforce Certifications Guide 2026',
    body:  `<p>Complete reference for all Salesforce certifications in 2026 — exam details, passing scores, question counts, cost, recommended experience, and study tips for every certification across all tracks.</p>
<h2>Certification Tracks</h2>
<ul>
  <li><strong>Administrator Track</strong> — Salesforce Administrator, Advanced Administrator, CPQ Specialist, Business Analyst</li>
  <li><strong>Developer Track</strong> — Platform Developer I, Platform Developer II, JavaScript Developer I</li>
  <li><strong>Architect Track</strong> — Application Architect, System Architect, Certified Technical Architect (CTA)</li>
  <li><strong>Consultant Track</strong> — Sales Cloud, Service Cloud, Field Service, Experience Cloud, Education Cloud</li>
  <li><strong>Marketing Track</strong> — Marketing Cloud Email Specialist, Marketing Cloud Administrator, Marketing Cloud Consultant, Marketing Cloud Developer</li>
  <li><strong>AI & Data Track</strong> — AI Associate, AI Specialist, Data Architect, Sharing and Visibility Architect</li>
</ul>
<h2>FAQ</h2>
<h3>What are the best free Salesforce admin tools in 2026?</h3>
<p>SF Tools (salesforcetools.in) is the most comprehensive free Salesforce admin toolkit in 2026. It includes Flow Inspector, Validation Rule Viewer, Permission Set Viewer, Profile Comparator, User Explorer, Field Security Checker, Org Limits Dashboard, Record Explorer, Scheduled Jobs Manager, and Deployment Status Checker — all free, no signup.</p>`
  },

  '/pro': {
    title: 'SF Tools Pro — AI-Powered Salesforce Tools Subscription | ₹400 per 100 Credits',
    desc:  'Upgrade to SF Tools Pro for instant access to AI Apex test class generator and AI Agent — no API key needed. ₹400 per 100 AI credits. Cancel anytime.',
    h1:    'SF Tools Pro',
    body:  `<p>SF Tools Pro gives you instant access to all AI-powered features — no Anthropic API key required. Generate Apex test classes, chat with your Salesforce org, and use all AI tools with a simple credit-based subscription.</p>
<h2>What's included</h2>
<ul>
  <li>AI Apex Test Class Generator — generate unlimited test classes (uses credits)</li>
  <li>Salesforce AI Agent — chat with your org in plain English</li>
  <li>No API key setup needed</li>
  <li>Priority access — no rate limits</li>
  <li>All 28+ standard tools remain free</li>
</ul>
<h2>Pricing</h2>
<ul>
  <li>₹400 per 100 AI credits</li>
  <li>Credits never expire</li>
  <li>Pay only when you need more</li>
  <li>7-day money-back guarantee</li>
</ul>`
  },

  '/about': {
    title: 'About SF Tools — Free Salesforce Developer Toolkit | salesforcetools.in',
    desc:  'SF Tools is a free browser-based Salesforce developer toolkit with 28+ tools for Salesforce developers and admins. No signup, no installation, no cost.',
    h1:    'About SF Tools',
    body:  `<p>SF Tools (salesforcetools.in) is a free, browser-based toolkit built for Salesforce developers and admins who want to work faster without the friction of logging into Setup, opening the Developer Console, or installing tools.</p>
<p>Every tool runs entirely in your browser. Your Salesforce data stays between your browser and Salesforce — we don't store or transmit your org data.</p>
<h2>Our mission</h2>
<p>Make Salesforce development and administration faster, easier, and more accessible — with free tools that just work, no account required.</p>
<h2>Contact</h2>
<p>Questions or feedback? Email <a href="mailto:support@salesforcetools.in">support@salesforcetools.in</a></p>`
  },

  '/privacy': {
    title: 'Privacy Policy — SF Tools (salesforcetools.in)',
    desc:  'SF Tools privacy policy. We do not store your Salesforce data. Learn how we handle your information when you use SF Tools.',
    h1:    'Privacy Policy',
    body:  `<p>SF Tools is committed to protecting your privacy. We do not store, transmit, or share your Salesforce org data. All Salesforce API calls are made directly from your browser to Salesforce.</p>
<p>For the full privacy policy, please visit <a href="/privacy">salesforcetools.in/privacy</a>.</p>`
  },

  '/terms': {
    title: 'Terms of Service — SF Tools (salesforcetools.in)',
    desc:  'SF Tools terms of service. By using SF Tools you agree to these terms. Free tools are provided as-is. Pro subscriptions include a 7-day money-back guarantee.',
    h1:    'Terms of Service',
    body:  `<p>By using SF Tools at salesforcetools.in, you agree to these Terms of Service. SF Tools is an independent developer toolkit — not affiliated with or endorsed by Salesforce, Inc.</p>
<p>For the full terms of service, please visit <a href="/terms">salesforcetools.in/terms</a>.</p>`
  },
};

/* ── Navigation links for all bot pages ─────────────────────────────── */
const NAV = [
  ['/test-generator','AI Test Class Generator'],
  ['/agent','AI Agent'],
  ['/rest-explorer','REST API Explorer'],
  ['/package-xml','Package XML Builder'],
  ['/profile-compare','Profile Comparator'],
  ['/apex-execute','Execute Apex'],
  ['/debug-logs','Debug Log Viewer'],
  ['/field-security','FLS Checker'],
  ['/test-coverage','Test Coverage'],
  ['/flow-inspector','Flow Inspector'],
  ['/soql-builder','SOQL Builder'],
  ['/org-limits','Org Limits'],
  ['/dependencies','Metadata Dependencies'],
  ['/cron-builder','Cron Builder'],
  ['/code-diff','Code Diff'],
  ['/formatter','JSON Formatter'],
  ['/certifications','Certifications Guide'],
  ['/pro','SF Tools Pro'],
].map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('\n');

/* ── HTML template ───────────────────────────────────────────────────── */
function render(path, page) {
  const canon = BASE + (path === '/' ? '/' : path);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${page.title}</title>
<meta name="description" content="${page.desc}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"/>
<link rel="canonical" href="${canon}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${page.title}"/>
<meta property="og:description" content="${page.desc}"/>
<meta property="og:url" content="${canon}"/>
<meta property="og:image" content="${BASE}/og-image.png"/>
<meta property="og:site_name" content="SF Tools"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${page.title}"/>
<meta name="twitter:description" content="${page.desc}"/>
<meta name="twitter:image" content="${BASE}/og-image.png"/>
<style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px;color:#1a1a2e;line-height:1.7}
h1{font-size:2rem;color:#0d0d2b;margin-bottom:8px}
h2{font-size:1.25rem;color:#1a1a4e;margin-top:28px}
h3{font-size:1rem;color:#2a2a5e}
a{color:#4f6cf7;text-decoration:none}a:hover{text-decoration:underline}
header{border-bottom:1px solid #eee;padding-bottom:12px;margin-bottom:24px;font-weight:600}
nav{border-top:1px solid #eee;margin-top:40px;padding-top:20px}
nav ul{display:flex;flex-wrap:wrap;gap:8px 16px;list-style:none;padding:0}
ul{padding-left:20px}li{margin:4px 0}
p{margin:12px 0}ol{padding-left:20px}
</style>
</head>
<body>
<header><a href="/">⚡ SF Tools — Free Salesforce Developer Tools</a></header>
<main>
<h1>${page.h1}</h1>
${page.body}
</main>
<nav>
<h2>All SF Tools</h2>
<ul>${NAV}</ul>
</nav>
</body>
</html>`;
}

/* ── Worker entry point ──────────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const ua   = request.headers.get('User-Agent') || '';

    // 1. Non-GET requests → straight to assets
    if (request.method !== 'GET') {
      return env.ASSETS.fetch(request);
    }

    // 2. Static file extensions → serve from Pages assets
    if (STATIC.test(path)) {
      return env.ASSETS.fetch(request);
    }

    // 3. Bot? → pre-rendered HTML
    if (BOT.test(ua)) {
      const page = PAGES[path] || PAGES['/'];
      return new Response(render(path, page), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Robots-Tag': 'index, follow',
          'Vary': 'User-Agent',
        },
      });
    }

    // 4. Real user → serve SPA (index.html handles all routing client-side)
    try {
      // Try the exact path first (in case it's a real file)
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
    } catch (_) {}

    // Fall back to index.html for SPA routing
    return env.ASSETS.fetch(
      new Request(new URL('/index.html', url.origin).toString(), {
        method:  request.method,
        headers: request.headers,
      })
    );
  },
};
