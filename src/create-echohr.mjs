import { resolve } from "node:path";
import {
  NotionClient,
  pageTitleProperty,
  richTextProperty,
  emailProperty,
  selectProperty,
  multiSelectProperty,
  dateProperty,
  checkboxProperty,
  paragraph,
  heading,
  bulleted,
  callout
} from "./lib/notion.mjs";
import { loadDotEnv, requireEnv, loadJsonIfExists, loadNotionTokenFromOAuthSession } from "./lib/env.mjs";
import {
  sections,
  databases,
  relationPatches,
  rollupPatches,
  seededTemplates,
  automationPlaybooks,
  demoSeed
} from "./echohr-config.mjs";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    seedDemo: argv.includes("--seed-demo"),
    forceNew: argv.includes("--force-new")
  };
}

function loadExistingInstallState() {
  return loadJsonIfExists(".echohr-install-state.json");
}

function getNextInstallVersion(existingInstall, forceNew, dryRun) {
  if (dryRun) {
    return existingInstall?.version || 1;
  }

  if (!existingInstall) {
    return 1;
  }

  return forceNew ? (existingInstall.version || 1) + 1 : (existingInstall.version || 1);
}

function rootTitleForVersion(version, isLatest = true) {
  return isLatest ? `EchoHR HQ v${version} (latest)` : `EchoHR HQ v${version}`;
}

function relationProperty(targetDataSourceId, syncedName) {
  return {
    type: "relation",
    relation: {
      data_source_id: targetDataSourceId,
      dual_property: {
        synced_property_name: syncedName
      }
    }
  };
}

function rollupProperty(relationPropertyId, relationPropertyName, rollupPropertyId, rollupPropertyName, fn) {
  return {
    type: "rollup",
    rollup: {
      relation_property_id: relationPropertyId,
      relation_property_name: relationPropertyName,
      rollup_property_id: rollupPropertyId,
      rollup_property_name: rollupPropertyName,
      function: fn
    }
  };
}

function topLevelIntroBlocks() {
  const blocks = [
    heading(1, "EchoHR"),
    paragraph("EchoHR is a Notion-native employee lifecycle system built around clarity, empathy, and speed."),
    callout("Rejections hurt, but ghosting hurts even more. Everyone deserves timely feedback and clarity.", "💬"),
    bulleted("Candidates and employees should always know their stage, owner, next step, and expected update date."),
    bulleted("Automations should feel human: personalized reminders, clear ownership, and visible timelines."),
    bulleted("AI should summarize and surface insight, not replace judgment.")
  ];

  if (process.env.LOGO_URL) {
    blocks.unshift({
      object: "block",
      type: "image",
      image: {
        type: "external",
        external: { url: process.env.LOGO_URL }
      }
    });
  }

  return blocks;
}

function viewGuideBlocks() {
  return [
    heading(2, "How to make EchoHR look like a product (5–10 min)"),
    paragraph("Notion’s API can’t create views. Apply these after provisioning for the best UX:"),
    heading(3, "Hiring"),
    bulleted("Candidates: Board grouped by Stage; show Stage Owner, Last Update Sent, Personalized Next Step, Sentiment; filter Last Update Sent before 2 days ago for “Needs update”."),
    bulleted("Offers: Calendar by Response Due; Board by Offer Status; show Base Salary, Start Date Proposed, Approval Owner."),
    bulleted("Interviews: Calendar by Scheduled For."),
    heading(3, "Onboarding"),
    bulleted("Onboarding Journeys: Timeline by Start Date; Board by Journey Status; show Health Status, New Hire Portal."),
    bulleted("Tasks (Onboarding): Board by Status; badge Priority."),
    bulleted("Check-ins: Calendar by Scheduled Date; Board by Status; badge Mood Score."),
    heading(3, "Growth"),
    bulleted("Goals: Board by Status; Table by Due Date; show Progress %, Manager Notes."),
    bulleted("Performance Reviews: Board by Review Status; Gallery showing Rating & Promotion Recommendation; Timeline by Review Due Date."),
    bulleted("Achievements: Gallery grouped by Impact; card preview = page cover."),
    heading(3, "Culture"),
    bulleted("Recognition: Gallery grouped by Category; show From, To, Message, Date."),
    bulleted("Pulse: Board by Survey Type; Table sorted by Submitted At; add formula badge for Mood = avg(Energy, Clarity, Support)."),
    heading(3, "Offboarding"),
    bulleted("Offboarding Cases: Board by Status; show Reason Category, Last Working Day, Knowledge Transfer."),
    heading(3, "Dashboards"),
    bulleted("Hiring Command Center: Candidates board, Offers calendar, Interviews calendar + KPI callouts."),
    bulleted("Onboarding: Journeys timeline, Tasks board (Onboarding), Check-ins calendar."),
    bulleted("Growth: Goals board, Reviews board, Achievements gallery."),
    bulleted("Culture: Recognition gallery, Pulse board, Mood-of-day linked view."),
    bulleted("Mood Logs: Board grouped by Mood; Table sorted by Date; filter Date is today for “Mood of Day”."),
    bulleted("Offboarding: Offboarding board, Knowledge Transfer table."),
    heading(3, "Charts"),
    bulleted("If Notion Charts are available, add bar/line charts on the dashboards; otherwise embed Sheets/Datawrapper charts via an Embed block."),
    callout("Tip: add a cover + emoji to each hub page; keep 4–6 status colors total for clean badges.", "🎨")
  ];
}

function textLink(text, url) {
  return {
    type: "text",
    text: { content: text, link: { url } }
  };
}

function calloutLink(text, url, emoji = "➡️") {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: [
        {
          type: "text",
          text: { content: text, link: { url } }
        }
      ],
      icon: { type: "emoji", emoji }
    }
  };
}

function linkText(text, url) {
  return {
    type: "text",
    text: { content: text, link: { url } }
  };
}

function landingBlocks(root, sectionPages) {
  const hiringUrl = sectionPages.hiring.url;
  const onboardingUrl = sectionPages.onboarding.url;
  const growthUrl = sectionPages.growth.url;
  const cultureUrl = sectionPages.culture.url;
  const offboardingUrl = sectionPages.offboarding.url;
  const automationUrl = sectionPages.automation.url;

  const navLine = {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        textLink("Hiring", hiringUrl),
        { type: "text", text: { content: "   ·   " } },
        textLink("Onboarding", onboardingUrl),
        { type: "text", text: { content: "   ·   " } },
        textLink("Growth", growthUrl),
        { type: "text", text: { content: "   ·   " } },
        textLink("Culture", cultureUrl),
        { type: "text", text: { content: "   ·   " } },
        textLink("Offboarding", offboardingUrl),
        { type: "text", text: { content: "   ·   " } },
        textLink("Automation", automationUrl)
      ]
    }
  };

  const hero = callout("No ghosting. Clear next steps for everyone.", "✨");

  const ctaRow = {
    object: "block",
    type: "column_list",
    column_list: {
      children: [
        {
          object: "block",
          type: "column",
          column: {
            children: [calloutLink("Go to Hiring Command Center", hiringUrl, "🎯")]
          }
        },
        {
          object: "block",
          type: "column",
          column: {
            children: [calloutLink("Start Today’s Ops Sweep", automationUrl, "⚡")]
          }
        }
      ]
    }
  };

  const metricsRow = {
    object: "block",
    type: "column_list",
    column_list: {
      children: [
        {
          object: "block",
          type: "column",
          column: {
            children: [
              callout("Open roles → add a view: Roles board grouped by Hiring Status", "🧩")
            ]
          }
        },
        {
          object: "block",
          type: "column",
          column: {
            children: [
              callout("Active candidates → Candidates board grouped by Stage", "💼")
            ]
          }
        },
        {
          object: "block",
          type: "column",
          column: {
            children: [
              callout("Updates due → filter Candidates where Last Update Sent < 2 days ago", "⏰")
            ]
          }
        }
      ]
    }
  };

  const featureGrid = {
    object: "block",
    type: "column_list",
    column_list: {
      children: [
        {
          object: "block",
          type: "column",
          column: {
            children: [
              calloutLink("No-Ghosting Guardrail", hiringUrl, "💬"),
              calloutLink("Onboarding Clarity", onboardingUrl, "🚀")
            ]
          }
        },
        {
          object: "block",
          type: "column",
          column: {
            children: [
              calloutLink("Growth & Reviews", growthUrl, "📈"),
              calloutLink("Culture Signals", cultureUrl, "🎉")
            ]
          }
        }
      ]
    }
  };

  const todayPanel = {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: "📅" },
      rich_text: [
        { type: "text", text: { content: "Today: Add linked views → Tasks (Due today/tomorrow, sort by Priority) and Check-ins (Scheduled today)." } }
      ]
    }
  };

  const charts = callout("Add charts: embed Sheets/Datawrapper for candidates by stage, offer acceptance, pulse score trend. If Notion Charts are enabled, add chart blocks on dashboard views.", "📊");

  return [hero, navLine, ctaRow, metricsRow, featureGrid, todayPanel, charts];
}

function mediaEmbed(url, type = "video") {
  if (!url) return null;
  return {
    object: "block",
    type: "embed",
    embed: { url }
  };
}

function heroImage(url) {
  if (!url) return null;
  return {
    object: "block",
    type: "image",
    image: { type: "external", external: { url } }
  };
}

function sectionBlocks(section, sectionPages, covers) {
  const blocks = [
    heading(2, section.title),
    paragraph(section.description),
    callout("Build the recommended filtered views in Notion’s UI after provisioning. The API cannot create views, but links below jump you into each DB.", "🛠️")
  ];

  const hero = heroImage(covers[section.key] || covers.root);
  if (hero) blocks.splice(1, 0, hero);

  const video = mediaEmbed(process.env.HERO_VIDEO_URL);
  if (video) blocks.push(video);

  return blocks;
}

function playbookBlocks(playbook) {
  return [
    heading(2, playbook.title),
    paragraph(playbook.summary),
    heading(3, "Steps"),
    ...playbook.steps.map((step) => bulleted(step))
  ];
}

function templateBlocks(template) {
  return [
    heading(2, template.name),
    paragraph(template.body),
    heading(3, "Suggested content"),
    ...template.content.map((line) => bulleted(line))
  ];
}

function propertiesByName(dataSource) {
  const map = {};
  for (const [name, property] of Object.entries(dataSource.properties ?? {})) {
    map[name] = property;
  }
  return map;
}

function extractPropertySchema(databaseLike) {
  if (databaseLike?.properties) {
    return propertiesByName(databaseLike);
  }

  if (databaseLike?.data_source?.properties) {
    return propertiesByName(databaseLike.data_source);
  }

  if (databaseLike?.data_sources?.[0]?.properties) {
    return propertiesByName(databaseLike.data_sources[0]);
  }

  return {};
}

function filterPropertiesForDatabase(entry, properties) {
  const allowed = entry.propertySchema || {};
  if (!Object.keys(allowed).length) {
    return properties;
  }
  const filtered = {};

  for (const [name, value] of Object.entries(properties)) {
    if (!allowed[name]) {
      console.warn(`Skipping property ${name}: not available on ${entry.title}`);
      continue;
    }
    filtered[name] = value;
  }

  return filtered;
}

async function createSafeRow(notion, entry, properties, children = []) {
  return notion.createRow({
    dataSourceId: entry.dataSourceId,
    properties: filterPropertiesForDatabase(entry, properties),
    children
  });
}

function titlePropertyNameForEntry(entry) {
  for (const [name, schema] of Object.entries(entry.propertySchema || {})) {
    if (schema.type === "title") {
      return name;
    }
  }

  return "";
}

function pageTitleValue(page, titlePropertyName) {
  const titleProperty = page.properties?.[titlePropertyName];
  const items = titleProperty?.title || [];
  return items.map((item) => item.plain_text || "").join("");
}

async function findRowByTitle(notion, entry, title) {
  const titlePropertyName = titlePropertyNameForEntry(entry);
  if (!titlePropertyName) {
    return null;
  }

  const response = await notion.queryDatabase(entry.dataSourceId || entry.databaseId);
  return response.results.find((page) => pageTitleValue(page, titlePropertyName) === title) || null;
}

async function createOrFindSafeRow(notion, entry, title, properties, children = []) {
  const existing = await findRowByTitle(notion, entry, title);
  if (existing) {
    return existing;
  }

  return createSafeRow(notion, entry, properties, children);
}

async function createPageHierarchy(notion, parentPageId, version) {
  const rootTitle = rootTitleForVersion(version, true);
  const root = await notion.createPage({
    parent: {
      type: "page_id",
      page_id: parentPageId
    },
    title: rootTitle,
    children: topLevelIntroBlocks()
  });

  const sectionPages = {};
  for (const section of sections) {
    const page = await notion.createPage({
      parent: {
        type: "page_id",
        page_id: root.id
      },
      title: section.title,
      children: sectionBlocks(section, sectionPages, {
        root: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
        hiring: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
        onboarding: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
        growth: "https://unsplash.com/photos/group-of-happy-business-people-and-company-staff-mP6zdBShhVI?auto=format&fit=crop&w=1600&q=80",
        culture: "https://unsplash.com/photos/three-people-sitting-in-front-of-table-laughing-together-g1Kr4Ozfoac?auto=format&fit=crop&w=1600&q=80",
        offboarding: "https://unsplash.com/photos/woman-carrying-box-of-belongings-leaving-office-u6pzdg6fWLI?auto=format&fit=crop&w=1600&q=80",
        automation: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80"
      })
    });
    sectionPages[section.key] = page;
  }

  await stylePages(notion, root, sectionPages);
  return { root, sectionPages };
}

async function stylePages(notion, root, sectionPages) {
  const covers = {
    root: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    hiring: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    onboarding: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
    growth: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1600&q=80",
    culture: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80",
    offboarding: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=1600&q=80",
    automation: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80"
  };

  const iconFor = (key) => sections.find((s) => s.key === key)?.icon || "✨";

  await notion.request(`/v1/pages/${root.id}`, {
    method: "PATCH",
    body: {
      icon: process.env.LOGO_URL ? { type: "external", external: { url: process.env.LOGO_URL } } : { type: "emoji", emoji: "💠" },
      cover: { type: "external", external: { url: covers.root } }
    }
  });

  for (const [key, page] of Object.entries(sectionPages)) {
    await notion.request(`/v1/pages/${page.id}`, {
      method: "PATCH",
      body: {
        icon: { type: "emoji", emoji: iconFor(key) },
        cover: { type: "external", external: { url: covers[key] || covers.root } }
      }
    });
  }
}

async function createViewGuidePage(notion, rootPageId) {
  return notion.createPage({
    parent: { type: "page_id", page_id: rootPageId },
    title: "Setup Views (5–10 min)",
    children: viewGuideBlocks()
  });
}

function checklistParagraph(label, url, instruction) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        linkText(label, url),
        { type: "text", text: { content: ` — ${instruction}` } }
      ]
    }
  };
}

function checklistBlocks(registry) {
  return [
    heading(2, "Quick view setup (click, add view, done)"),
    callout("Notion blocks views from API. Use these direct links and follow the short instruction per database.", "🖱️"),
    heading(3, "Hiring"),
    checklistParagraph("Candidates", registry.candidates.url, "Add Board grouped by Stage; show Stage Owner, Last Update Sent, Personalized Next Step, Sentiment; filter Last Update Sent < 2 days ago (save as “Needs update”)."),
    checklistParagraph("Offers", registry.offers.url, "Add Calendar by Response Due; Board by Offer Status; show Base Salary, Start Date Proposed, Approval Owner."),
    checklistParagraph("Interviews", registry.interviews.url, "Add Calendar by Scheduled For."),
    heading(3, "Onboarding"),
    checklistParagraph("Onboarding Journeys", registry.onboardingJourneys.url, "Add Timeline by Start Date; Board by Journey Status; show Health Status, New Hire Portal."),
    checklistParagraph("Tasks (Onboarding)", registry.tasks.url, "Add Board grouped by Status; filter Task Type = Onboarding; badge Priority."),
    checklistParagraph("Check-ins", registry.checkins.url, "Add Calendar by Scheduled Date; Board by Status; badge Mood Score."),
    heading(3, "Growth"),
    checklistParagraph("Goals", registry.goals.url, "Add Board grouped by Status; Table sorted by Due Date; show Progress %, Manager Notes."),
    checklistParagraph("Performance Reviews", registry.performanceReviews.url, "Add Board grouped by Review Status; Gallery showing Rating, Promotion Recommendation; Timeline by Review Due Date."),
    checklistParagraph("Achievements", registry.achievements.url, "Add Gallery grouped by Impact; set card preview = Page cover."),
    heading(3, "Culture"),
    checklistParagraph("Recognition", registry.recognition.url, "Add Gallery grouped by Category; show From, To, Message, Date."),
    checklistParagraph("Pulse Surveys", registry.pulseSurveys.url, "Add Board grouped by Survey Type; Table sorted by Submitted At; add formula badge Mood = avg(Energy, Clarity, Support)."),
    checklistParagraph("Mood Logs", registry.moodLogs.url, "Add Board grouped by Mood; Table sorted by Date; filter Date is today for a “Mood of Day” view."),
    heading(3, "Offboarding"),
    checklistParagraph("Offboarding Cases", registry.offboardingCases.url, "Add Board grouped by Status; show Reason Category, Last Working Day, Knowledge Transfer."),
    checklistParagraph("Knowledge Transfers", registry.knowledgeTransfers.url, "Add Table sorted by Status; show Open Risks, Successor.")
  ];
}

function agentOpsBlocks(sectionPages) {
  const hiringUrl = sectionPages.hiring.url;
  const automationUrl = sectionPages.automation.url;
  return [
    heading(2, "Agent Ops Menu"),
    paragraph("Copy one of these into your MCP client. These run best when Notion, Slack, and Calendar MCP servers are connected."),
    heading(3, "Figma comment → Task → Review meeting → Slack"),
    callout(
      "“Fetch latest Figma comments tagged Ready for Review. For each: create a Notion Task in EchoHR Tasks (type Review), set Due Date tomorrow, link the Figma URL. Create a calendar event tomorrow 10am with attendees <emails>. Post a Slack update with task link + Figma link.”",
      "🎨"
    ),
    heading(3, "Candidate no-ghosting sweep"),
    callout(
      "“In EchoHR Candidates, find active candidates whose Last Update Sent is >2 days ago. Draft candidate-safe updates, set Personalized Next Step, and notify Stage Owner in Slack. If missing Application, create one.”",
      "💬"
    ),
    heading(3, "Offer → Onboarding"),
    callout(
      "“For offers in Accepted, ensure an Onboarding Journey exists, create first 3 monthly Check-ins, and DM the manager/buddy in Slack with dates.”",
      "🚀"
    ),
    heading(3, "Growth snapshot"),
    callout(
      "“Summarize Goals, Achievements, and latest Review for each active employee; post a Slack digest; create calendar holds for any review due this week.”",
      "📈"
    ),
    paragraph("Links:"),
    bulleted(`Hiring Command Center: ${hiringUrl}`),
    bulleted(`Automation Ops: ${automationUrl}`)
  ];
}

async function createDatabases(notion, sectionPages) {
  const registry = {};

  for (const db of databases) {
    if (notion.dryRun) {
      registry[db.key] = {
        ...db,
        databaseId: `${db.key}-dry-run-db`,
        url: `https://notion.so/${db.key}-dry-run-db`,
        dataSourceId: `${db.key}-dry-run-ds`,
        propertySchema: {}
      };
      continue;
    }

    const database = await notion.createDatabase({
      parentPageId: sectionPages[db.section].id,
      title: db.title,
      description: db.description,
      properties: db.properties,
      icon: db.icon
    });

    const databaseDetails = await notion.retrieveDatabase(database.id);
    registry[db.key] = {
      ...db,
      databaseId: database.id,
      url: database.url,
      dataSourceId: databaseDetails.data_sources?.[0]?.id ?? database.id,
      propertySchema: extractPropertySchema(databaseDetails)
    };
  }

  return registry;
}

async function loadExistingInstall(notion, state) {
  const sectionPages = {};
  for (const [key, page] of Object.entries(state.sections || {})) {
    sectionPages[key] = page;
  }

  const registry = {};
  for (const [key, db] of Object.entries(state.databases || {})) {
    const databaseDetails = await notion.retrieveDatabase(db.databaseId);
    registry[key] = {
      key,
      title: db.title,
      databaseId: db.databaseId,
      dataSourceId: db.dataSourceId,
      url: db.url,
      propertySchema: extractPropertySchema(databaseDetails)
    };
  }

  return {
    root: state.root,
    sectionPages,
    registry
  };
}

async function applyRelations(notion, registry) {
  for (const patch of relationPatches) {
    const source = registry[patch.db];
    const target = registry[patch.target];

    let update;
    try {
      update = await notion.updateDataSource(source.dataSourceId, {
        [patch.property]: relationProperty(target.dataSourceId, patch.synced)
      });
    } catch (error) {
      console.warn(`updateDataSource failed for ${patch.property} on ${source.title}, falling back to updateDatabase.`, error.message);
      update = await notion.updateDatabase(source.databaseId, {
        [patch.property]: relationProperty(target.dataSourceId, patch.synced)
      });
    }

    source.propertySchema = extractPropertySchema(update);
    if (!source.propertySchema[patch.property]) {
      console.warn(`Relation ${patch.property} not present after patch on ${source.title}`);
    }

    if (!notion.dryRun) {
      const refreshedTarget = await notion.retrieveDataSource(target.dataSourceId).catch(() => null) || await notion.retrieveDatabase(target.databaseId);
      target.propertySchema = extractPropertySchema(refreshedTarget);
    }
  }
}

async function refreshPropertySchemas(notion, registry) {
  for (const entry of Object.values(registry)) {
    try {
      const ds = await notion.retrieveDataSource(entry.dataSourceId);
      entry.propertySchema = extractPropertySchema(ds);
    } catch (error) {
      console.warn(`Could not refresh schema for ${entry.title}:`, error.message);
    }
  }
}

async function applyRollups(notion, registry) {
  for (const patch of rollupPatches) {
    const source = registry[patch.db];
    const refreshedSource = await notion.retrieveDataSource(source.dataSourceId).catch(() => null) || await notion.retrieveDatabase(source.databaseId);
    source.propertySchema = extractPropertySchema(refreshedSource);
    const relationSchema = source.propertySchema[patch.relation];
    if (!relationSchema) {
      console.warn(`Skipping rollup ${patch.property}: missing relation ${patch.relation} on ${source.title}`);
      continue;
    }

    const target = registry[patch.target];
    const refreshedTarget = await notion.retrieveDataSource(target.dataSourceId).catch(() => null) || await notion.retrieveDatabase(target.databaseId);
    target.propertySchema = extractPropertySchema(refreshedTarget);
    const targetProp = target.propertySchema[patch.rollup];
    if (!targetProp) {
      console.warn(`Skipping rollup ${patch.property}: missing target property ${patch.rollup} on ${target.title}`);
      continue;
    }

    let update;
    try {
      update = await notion.updateDataSource(source.dataSourceId, {
        [patch.property]: rollupProperty(relationSchema.id, patch.relation, targetProp.id, patch.rollup, patch.fn)
      });
    } catch (error) {
      console.warn(`updateDataSource rollup failed for ${patch.property} on ${source.title}, falling back to updateDatabase.`, error.message);
      update = await notion.updateDatabase(source.databaseId, {
        [patch.property]: rollupProperty(relationSchema.id, patch.relation, targetProp.id, patch.rollup, patch.fn)
      });
    }
    source.propertySchema = extractPropertySchema(update);
  }
}

async function seedTemplates(notion, registry) {
  for (const template of seededTemplates) {
    await createOrFindSafeRow(notion, registry.templates, template.name, {
      "Template Name": pageTitleProperty(template.name),
      "Template Type": selectProperty(template.type),
      Audience: selectProperty(template.audience),
      "Trigger Event": selectProperty(template.trigger),
      Subject: richTextProperty(template.subject),
      Body: richTextProperty(template.body),
      Active: checkboxProperty(true)
    }, templateBlocks(template));
  }
}

async function seedAutomationPlaybooks(notion, automationPageId) {
  for (const playbook of automationPlaybooks) {
    await notion.createPage({
      parent: {
        type: "page_id",
        page_id: automationPageId
      },
      title: playbook.title,
      children: playbookBlocks(playbook)
    });
  }
}

async function seedDemoContent(notion, registry) {
  const founderCeo = await createOrFindDemoPerson(notion, registry, demoSeed.people.founderCeo);
  const founderCto = await createOrFindDemoPerson(notion, registry, demoSeed.people.founderCto, { managerId: founderCeo.id });
  const headPeople = await createOrFindDemoPerson(notion, registry, demoSeed.people.headPeople, { managerId: founderCeo.id });
  const engLead = await createOrFindDemoPerson(notion, registry, demoSeed.people.engLead, { managerId: founderCto.id });
  const designLead = await createOrFindDemoPerson(notion, registry, demoSeed.people.designLead, { managerId: founderCeo.id });
  const salesLead = await createOrFindDemoPerson(notion, registry, demoSeed.people.salesLead, { managerId: founderCeo.id });
  const manager = await createOrFindDemoPerson(notion, registry, demoSeed.people.manager, { managerId: founderCeo.id });
  const recruiter = await createOrFindDemoPerson(notion, registry, demoSeed.people.recruiter, { managerId: headPeople.id });
  const buddy = await createOrFindDemoPerson(notion, registry, demoSeed.people.buddy, { managerId: engLead.id });
  const employee = await createOrFindDemoPerson(notion, registry, demoSeed.people.employee, { managerId: manager.id, buddyId: buddy.id });
  const candidatePerson = await createOrFindDemoPerson(notion, registry, demoSeed.people.candidate);
  const exitingPerson = await createOrFindDemoPerson(notion, registry, demoSeed.people.exiting, { managerId: headPeople.id });

  const role = await createOrFindSafeRow(notion, registry.roles, demoSeed.role.title, {
    "Role Name": pageTitleProperty(demoSeed.role.title),
    Department: selectProperty(demoSeed.role.department),
    Level: selectProperty(demoSeed.role.level),
    "Employment Type": selectProperty(demoSeed.role.type),
    Location: multiSelectProperty(demoSeed.role.location),
    "Hiring Status": selectProperty(demoSeed.role.status),
    "Open Date": dateProperty(demoSeed.role.openDate),
    "Target Fill Date": dateProperty(demoSeed.role.targetFillDate),
    "Interview Plan": richTextProperty(demoSeed.role.interviewPlan),
    "Stage SLA Days": { number: demoSeed.role.stageSlaDays },
    "Offer Approval Required": checkboxProperty(true),
    "Hiring Manager": relationValue([manager.id]),
    Recruiter: relationValue([recruiter.id])
  });

  const candidate = await createOrFindSafeRow(notion, registry.candidates, demoSeed.candidate.name, {
    "Candidate Name": pageTitleProperty(demoSeed.candidate.name),
    Person: relationValue([candidatePerson.id]),
    "Primary Role": relationValue([role.id]),
    "Candidate Status": selectProperty("Interviewing"),
    Stage: selectProperty("Panel"),
    "Stage Owner": relationValue([recruiter.id]),
    "Applied On": dateProperty(demoSeed.candidate.appliedOn),
    "Last Update Sent": dateProperty(demoSeed.candidate.lastUpdateSent),
    "Candidate Portal Link": { url: demoSeed.candidate.portalUrl },
    Source: selectProperty("Referral"),
    Sentiment: selectProperty("Positive"),
    "Personalized Next Step": richTextProperty(demoSeed.candidate.nextStep)
  });

  const application = await createOrFindSafeRow(notion, registry.applications, "APP-001", {
    "Application ID": pageTitleProperty("APP-001"),
    Candidate: relationValue([candidate.id]),
    Role: relationValue([role.id]),
    "Application Status": selectProperty("Active"),
    "Pipeline Stage": selectProperty("Interview Loop"),
    "Applied Date": dateProperty(demoSeed.candidate.appliedOn),
    "Resume URL": { url: demoSeed.candidate.resumeUrl },
    "Portfolio URL": { url: demoSeed.candidate.portfolioUrl },
    "Scheduler Link": { url: demoSeed.candidate.schedulerUrl },
    "AI Feedback Summary": richTextProperty(demoSeed.candidate.aiSummary),
    "Decision Recommendation": selectProperty("Yes"),
    "Candidate Message Draft": richTextProperty(demoSeed.candidate.messageDraft)
  });

  await createOrFindSafeRow(notion, registry.interviews, `${demoSeed.candidate.name} - Panel Interview`, {
    "Interview Title": pageTitleProperty(`${demoSeed.candidate.name} - Panel Interview`),
    Application: relationValue([application.id]),
    Interviewer: relationValue([manager.id]),
    Coordinator: relationValue([recruiter.id]),
    "Interview Type": selectProperty("Panel"),
    "Scheduled For": dateProperty(demoSeed.candidate.interviewDate),
    "Meeting Link": { url: demoSeed.candidate.meetingUrl },
    Status: selectProperty("Scheduled"),
    Score: { number: 4 },
    Strengths: richTextProperty("Strong systems thinking, clear communication, and empathy."),
    Concerns: richTextProperty("Needs deeper examples of design ops scaling."),
    Recommendation: selectProperty("Yes"),
    "AI Summary": richTextProperty("Candidate is progressing well. Provide timeline clarity and close the loop within 48 hours.")
  });

  const offerTemplate = await createOrFindSafeRow(notion, registry.templates, "Offer Letter - Demo Attach", {
    "Template Name": pageTitleProperty("Offer Letter - Demo Attach"),
    "Template Type": selectProperty("Offer Letter"),
    Audience: selectProperty("Candidate"),
    "Trigger Event": selectProperty("Offer Sent"),
    Subject: richTextProperty("EchoHR offer letter"),
    Body: richTextProperty("Demo offer letter template linked to the seeded offer."),
    Active: checkboxProperty(true)
  });

  await createOrFindSafeRow(notion, registry.offers, "OFF-001", {
    "Offer ID": pageTitleProperty("OFF-001"),
    Candidate: relationValue([candidate.id]),
    Application: relationValue([application.id]),
    "Offer Status": selectProperty("Draft"),
    "Compensation Band": richTextProperty("Design L5"),
    "Base Salary": { number: 155000 },
    Equity: richTextProperty("0.08%"),
    Bonus: { number: 15000 },
    "Start Date Proposed": dateProperty("2026-04-06"),
    "Offer Document URL": { url: "https://example.com/offers/off-001" },
    "Response Due": dateProperty("2026-03-20"),
    "Candidate Questions": richTextProperty("Clarify learning budget and remote travel policy."),
    "Approval Owner": relationValue([manager.id]),
    "Offer Letter Template": relationValue([offerTemplate.id])
  });

  const journey = await createOrFindSafeRow(notion, registry.onboardingJourneys, `${demoSeed.people.employee.name} - Onboarding`, {
    "Journey Name": pageTitleProperty(`${demoSeed.people.employee.name} - Onboarding`),
    Employee: relationValue([employee.id]),
    "Start Date": dateProperty(demoSeed.people.employee.startDate),
    "Journey Status": selectProperty("Month 1"),
    "Personal Goals": richTextProperty("Ship first workflow improvement and meet the wider product org."),
    "Intro Message": richTextProperty("Welcome. Your portal shows your plan, buddy, and support check-ins."),
    "New Hire Portal": { url: "https://example.com/portal/lena" }
  });

  await createOrFindSafeRow(notion, registry.tasks, "Set up development environment", {
    Task: pageTitleProperty("Set up development environment"),
    "Task Type": selectProperty("Onboarding"),
    "Related Person": relationValue([employee.id]),
    Journey: relationValue([journey.id]),
    Owner: relationValue([employee.id]),
    "Due Date": dateProperty("2026-02-06"),
    Status: selectProperty("Done"),
    Priority: selectProperty("High"),
    "Auto-created": checkboxProperty(true),
    "Empathy Note": richTextProperty("If anything feels blocked, ask your buddy before it compounds.")
  });

  await createOrFindSafeRow(notion, registry.tasks, "Run 30-day onboarding check-in", {
    Task: pageTitleProperty("Run 30-day onboarding check-in"),
    "Task Type": selectProperty("Onboarding"),
    "Related Person": relationValue([employee.id]),
    Journey: relationValue([journey.id]),
    Owner: relationValue([manager.id]),
    "Due Date": dateProperty("2026-03-04"),
    Status: selectProperty("In Progress"),
    Priority: selectProperty("High"),
    "Auto-created": checkboxProperty(true),
    "Empathy Note": richTextProperty("Ask what support would make the next month easier, not just what is on track.")
  });

  const checkin = await createOrFindSafeRow(notion, registry.checkins, `${demoSeed.people.employee.name} - 30 Day`, {
    "Check-in Name": pageTitleProperty(`${demoSeed.people.employee.name} - 30 Day`),
    Employee: relationValue([employee.id]),
    Manager: relationValue([manager.id]),
    "Check-in Type": selectProperty("30-day"),
    "Scheduled Date": dateProperty("2026-03-04"),
    Status: selectProperty("Completed"),
    "Employee Wins": richTextProperty("Improved onboarding docs and shipped first retention dashboard draft."),
    "Employee Challenges": richTextProperty("Still learning internal approvals and cross-team communication paths."),
    "Support Needed": richTextProperty("More examples of effective product reviews."),
    "Mood Score": { number: 4 },
    "AI Summary": richTextProperty("Positive momentum. Main need is more context on internal process and review culture."),
    "Next Actions": richTextProperty("Buddy to share two review examples. Manager to add employee to roadmap prep.")
  });

  const goals = [];
  for (const goalSeed of demoSeed.goals) {
    const goal = await createOrFindSafeRow(notion, registry.goals, goalSeed.title, {
      "Goal Title": pageTitleProperty(goalSeed.title),
      Employee: relationValue([employee.id]),
      Manager: relationValue([manager.id]),
      "Check-in": relationValue([checkin.id]),
      Cycle: selectProperty(goalSeed.cycle),
      Category: selectProperty(goalSeed.category),
      Status: selectProperty(goalSeed.status),
      "Start Date": dateProperty(goalSeed.startDate),
      "Due Date": dateProperty(goalSeed.dueDate),
      "Success Metric": richTextProperty(goalSeed.successMetric),
      "Progress %": { number: goalSeed.progress },
      "Manager Notes": richTextProperty(goalSeed.managerNotes),
      "Employee Update": richTextProperty(goalSeed.employeeUpdate),
      "AI Coaching Note": richTextProperty(goalSeed.aiCoaching)
    });
    goals.push(goal);
  }

  const achievements = [];
  for (const [index, achievementSeed] of demoSeed.achievements.entries()) {
    const achievement = await createOrFindSafeRow(notion, registry.achievements, achievementSeed.title, {
      "Achievement Title": pageTitleProperty(achievementSeed.title),
      Employee: relationValue([employee.id]),
      Goal: relationValue([goals[Math.min(index, goals.length - 1)].id]),
      Type: selectProperty(achievementSeed.type),
      "Achievement Date": dateProperty(achievementSeed.date),
      Impact: selectProperty(achievementSeed.impact),
      Summary: richTextProperty(achievementSeed.summary),
      Evidence: richTextProperty(achievementSeed.evidence),
      "Manager Validation": selectProperty(achievementSeed.validation),
      "AI Summary": richTextProperty(achievementSeed.aiSummary),
      "Promotion Evidence": checkboxProperty(achievementSeed.promotionEvidence)
    });
    achievements.push(achievement);
  }

  const compensation = await createOrFindSafeRow(notion, registry.compensationEvents, `${demoSeed.people.employee.name} - Promotion Review`, {
    "Event Name": pageTitleProperty(`${demoSeed.people.employee.name} - Promotion Review`),
    Employee: relationValue([employee.id]),
    "Event Type": selectProperty("Promotion"),
    "Effective Date": dateProperty("2026-06-01"),
    "Current Level": richTextProperty("L3"),
    "Proposed Level": richTextProperty("L4"),
    "Current Salary": { number: 128000 },
    "Proposed Salary": { number: 142000 },
    "Business Case": richTextProperty("Employee has absorbed onboarding quickly and is already leading onboarding process improvements."),
    Goals: relationValue(goals.map((goal) => goal.id)),
    Achievements: relationValue(achievements.map((achievement) => achievement.id)),
    "Approval Status": selectProperty("Manager Approved"),
    "Notification Status": selectProperty("Pending"),
    "Approval Owner": relationValue([manager.id])
  });

  const review = await createOrFindSafeRow(notion, registry.performanceReviews, `${demoSeed.people.employee.name} - Q1 2026`, {
    "Review Name": pageTitleProperty(`${demoSeed.people.employee.name} - Q1 2026`),
    Employee: relationValue([employee.id]),
    "Review Cycle": selectProperty("Q1"),
    "Review Status": selectProperty("Shared"),
    "Review Due Date": dateProperty("2026-03-31"),
    Goals: relationValue(goals.map((goal) => goal.id)),
    Achievements: relationValue(achievements.map((achievement) => achievement.id)),
    "Self Review": richTextProperty("Built trust quickly, improved onboarding docs, and supported candidate experience visibility."),
    "Manager Review": richTextProperty("Strong first quarter. High ownership and strong cross-functional empathy."),
    "Peer Inputs": richTextProperty("Great collaborator and proactive communicator."),
    "Achievements Snapshot": richTextProperty("Two validated achievements linked: onboarding documentation refresh and retention dashboard draft."),
    "Goal Progress": { number: 0.8 },
    Rating: { number: 4 },
    "Promotion Recommendation": selectProperty("Watchlist"),
    "Compensation Event": relationValue([compensation.id]),
    "AI Summary": richTextProperty("Emerging high performer. Focus next quarter on scale and influence."),
    "Action Recommendations": richTextProperty("Give larger project ownership and formalize mentorship support."),
    "Shared With Employee At": dateProperty("2026-03-08")
  });

  await createOrFindSafeRow(notion, registry.pulseSurveys, `${demoSeed.people.employee.name} - Monthly Pulse`, {
    "Survey Response": pageTitleProperty(`${demoSeed.people.employee.name} - Monthly Pulse`),
    Employee: relationValue([employee.id]),
    "Survey Type": selectProperty("Monthly Pulse"),
    "Submitted At": dateProperty("2026-03-07"),
    "eNPS Style Score": { number: 9 },
    "Energy Score": { number: 4 },
    "Clarity Score": { number: 4 },
    "Support Score": { number: 5 },
    "Free Text": richTextProperty("I know what I am working on and I know who to ask when blocked."),
    "AI Theme Summary": richTextProperty("High clarity and support. Keep reinforcing manager access and learning paths.")
  });

  await createOrFindSafeRow(notion, registry.moodLogs, `${demoSeed.people.employee.name} - Mood Today`, {
    "Mood Entry": pageTitleProperty(`${demoSeed.people.employee.name} - Mood Today`),
    Employee: relationValue([employee.id]),
    Date: dateProperty("2026-03-10"),
    Mood: selectProperty("Good"),
    Energy: { number: 4 },
    Clarity: { number: 4 },
    Support: { number: 5 },
    Note: richTextProperty("Excited about onboarding clean-up; feeling supported.")
  });

  await createOrFindSafeRow(notion, registry.moodLogs, `${demoSeed.people.manager.name} - Mood Today`, {
    "Mood Entry": pageTitleProperty(`${demoSeed.people.manager.name} - Mood Today`),
    Employee: relationValue([manager.id]),
    Date: dateProperty("2026-03-10"),
    Mood: selectProperty("Meh"),
    Energy: { number: 3 },
    Clarity: { number: 3 },
    Support: { number: 3 },
    Note: richTextProperty("Need clearer hiring priorities; juggling interviews.")
  });

  await createOrFindSafeRow(notion, registry.moodLogs, `${demoSeed.people.buddy.name} - Mood Today`, {
    "Mood Entry": pageTitleProperty(`${demoSeed.people.buddy.name} - Mood Today`),
    Employee: relationValue([buddy.id]),
    Date: dateProperty("2026-03-10"),
    Mood: selectProperty("Great"),
    Energy: { number: 5 },
    Clarity: { number: 5 },
    Support: { number: 4 },
    Note: richTextProperty("Enjoying mentoring the new hire; bandwidth good.")
  });

  await createOrFindSafeRow(notion, registry.recognition, "Shoutout for onboarding improvements", {
    "Recognition Title": pageTitleProperty("Shoutout for onboarding improvements"),
    From: relationValue([manager.id]),
    To: relationValue([employee.id]),
    Category: selectProperty("Ownership"),
    Message: richTextProperty("Thank you for improving the onboarding docs so quickly and making new joiners feel less lost."),
    Date: dateProperty("2026-03-09"),
    "Shared in Slack": checkboxProperty(true)
  });

  await createOrFindSafeRow(notion, registry.tasks, "Review goal feedback before appraisal closes", {
    Task: pageTitleProperty("Review goal feedback before appraisal closes"),
    "Task Type": selectProperty("Review"),
    "Related Person": relationValue([employee.id]),
    Review: relationValue([review.id]),
    Owner: relationValue([manager.id]),
    "Due Date": dateProperty("2026-03-25"),
    Status: selectProperty("Not Started"),
    Priority: selectProperty("High"),
    "Auto-created": checkboxProperty(true),
    "Empathy Note": richTextProperty("Do not close the cycle until the employee has explicit feedback on each major goal.")
  });

  const knowledgeTransfer = await createOrFindSafeRow(notion, registry.knowledgeTransfers, `${demoSeed.people.exiting.name} - Knowledge Transfer`, {
    "Transfer Title": pageTitleProperty(`${demoSeed.people.exiting.name} - Knowledge Transfer`),
    Employee: relationValue([exitingPerson.id]),
    "Systems Owned": richTextProperty("Payroll reconciliations, vendor invoicing workflow, hiring ops tracker."),
    "Key Contacts": richTextProperty("Finance partner, People ops lead, ATS vendor account manager."),
    "Open Risks": richTextProperty("Payroll backup coverage still thin during AU public holidays."),
    "Documents Linked": { url: "https://example.com/docs/knowledge-transfer" },
    Successor: relationValue([employee.id]),
    Status: selectProperty("In Review"),
    "AI Summary": richTextProperty("Core operational context captured. Main risk is payroll continuity coverage.")
  });

  await createOrFindSafeRow(notion, registry.offboardingCases, `${demoSeed.people.exiting.name} - Resignation`, {
    "Case Name": pageTitleProperty(`${demoSeed.people.exiting.name} - Resignation`),
    Employee: relationValue([exitingPerson.id]),
    "Offboarding Type": selectProperty("Resignation"),
    "Notice Received": dateProperty("2026-03-01"),
    "Last Working Day": dateProperty("2026-03-28"),
    Status: selectProperty("Knowledge Capture"),
    "Reason Category": selectProperty("Growth"),
    "Knowledge Transfer": relationValue([knowledgeTransfer.id]),
    "AI Exit Summary": richTextProperty("Primary reason is career growth. Team support was strong, but scope progression felt capped."),
    "Alumni Eligible": checkboxProperty(true)
  });

  await createOrFindSafeRow(notion, registry.alumni, demoSeed.people.alumni.name, {
    "Alumni Name": pageTitleProperty(demoSeed.people.alumni.name),
    Person: relationValue([exitingPerson.id]),
    "Exit Date": dateProperty("2026-03-28"),
    "Last Role": richTextProperty("People Operations Specialist"),
    "Rehire Eligible": checkboxProperty(true),
    "Alumni Group Joined": checkboxProperty(false),
    "Last Touchpoint": dateProperty("2026-03-01"),
    Notes: richTextProperty("Invite to alumni network after last working day.")
  });

  await createOrFindSafeRow(notion, registry.automationLog, "Daily candidate update guardrail", {
    "Run Name": pageTitleProperty("Daily candidate update guardrail"),
    Workflow: selectProperty("Hiring Update"),
    "Entity Type": selectProperty("Candidate"),
    "Entity ID": richTextProperty("APP-001"),
    "Triggered At": dateProperty("2026-03-10"),
    Result: selectProperty("Success"),
    Details: richTextProperty("Owner notified and candidate-safe update draft generated.")
  });

  await createOrFindSafeRow(notion, registry.automationLog, "Monthly check-in generator", {
    "Run Name": pageTitleProperty("Monthly check-in generator"),
    Workflow: selectProperty("Check-in Generator"),
    "Entity Type": selectProperty("Employee"),
    "Entity ID": richTextProperty(employee.id),
    "Triggered At": dateProperty("2026-03-01"),
    Result: selectProperty("Success"),
    Details: richTextProperty(`Created and completed linked check-in ${checkin.id}.`)
  });

  await createOrFindSafeRow(notion, registry.automationLog, "Review evidence sync", {
    "Run Name": pageTitleProperty("Review evidence sync"),
    Workflow: selectProperty("Review Summary"),
    "Entity Type": selectProperty("Review"),
    "Entity ID": richTextProperty("Q1-REVIEW-LENA"),
    "Triggered At": dateProperty("2026-03-08"),
    Result: selectProperty("Success"),
    Details: richTextProperty("Goals and validated achievements were linked into the review and appraisal workflow.")
  });

  await seedStartupScaleDemo(notion, registry, {
    founderCeo,
    founderCto,
    headPeople,
    engLead,
    designLead,
    salesLead,
    manager,
    recruiter,
    buddy
  });
}

function summarizeInstall(root, sectionPages, registry, version) {
  return {
    generatedAt: new Date().toISOString(),
    version,
    root: {
      id: root.id,
      url: root.url,
      title: root.title || rootTitleForVersion(version, true)
    },
    sections: Object.fromEntries(
      Object.entries(sectionPages).map(([key, page]) => [
        key,
        {
          id: page.id,
          url: page.url
        }
      ])
    ),
    databases: Object.fromEntries(
      Object.entries(registry).map(([key, db]) => [
        key,
        {
          title: db.title,
          databaseId: db.databaseId,
          dataSourceId: db.dataSourceId,
          url: db.url
        }
      ])
    )
  };
}

function relationValue(pageIds) {
  return {
    relation: pageIds.map((id) => ({ id }))
  };
}

async function createDemoPerson(notion, registry, person, relationPageIds = {}) {
  const properties = {
    Name: pageTitleProperty(person.name),
    "Work Email": emailProperty(person.email),
    "Lifecycle Type": selectProperty(person.lifecycle),
    "Employment Status": selectProperty(person.status),
    "Job Title": richTextProperty(person.title || ""),
    "Org Layer": selectProperty(person.orgLayer || (person.lifecycle === "Candidate" ? "Candidate" : "IC")),
    Department: selectProperty(person.department),
    Team: selectProperty(person.team),
    Location: selectProperty(person.location),
    ...(person.startDate ? { "Start Date": dateProperty(person.startDate) } : {})
  };

  if (relationPageIds.managerId) {
    properties.Manager = relationValue([relationPageIds.managerId]);
  }

  if (relationPageIds.buddyId) {
    properties.Buddy = relationValue([relationPageIds.buddyId]);
  }

  return notion.createRow({
    dataSourceId: registry.people.dataSourceId,
    properties: filterPropertiesForDatabase(registry.people, properties)
  });
}

async function createOrFindDemoPerson(notion, registry, person, relationPageIds = {}) {
  const existing = await findRowByTitle(notion, registry.people, person.name);
  if (existing) {
    return existing;
  }

  return createDemoPerson(notion, registry, person, relationPageIds);
}

function syntheticEmployeeProfile(index) {
  const firstNames = [
    "Noah", "Emma", "Liam", "Olivia", "Ava", "Ethan", "Sophia", "Mason", "Mia", "Lucas",
    "Harper", "Amelia", "Elijah", "Charlotte", "James", "Isla", "Benjamin", "Zoe", "Henry", "Ella",
    "Jack", "Grace", "Leo", "Chloe", "Aria", "Oscar", "Ruby", "Finn", "Layla", "Aiden",
    "Nora", "Kai", "Hazel", "Theo", "Lily", "Ezra", "Sienna", "Ryan", "Evelyn", "Caleb",
    "Willow", "Julian", "Ivy", "Hudson"
  ];
  const lastNames = [
    "Nguyen", "Kim", "Walker", "Patel", "Garcia", "Wright", "Turner", "Brooks", "Diaz", "Singh",
    "Foster", "Rivera", "Price", "Hayes", "Campbell", "Reed", "Murphy", "Powell", "Cruz", "Long",
    "Scott", "Bennett", "Ward", "Cox", "Bailey", "Rogers", "Cook", "Bell", "Cooper", "Kelly",
    "Gray", "Richardson", "Watson", "Wood", "Barnes", "Sanders", "Ross", "Henderson", "Cole", "Jenkins",
    "Perry", "Russell", "Flores", "Washington"
  ];
  const departmentProfiles = [
    { department: "Eng", team: "Platform", title: "Software Engineer" },
    { department: "Eng", team: "Growth", title: "Full Stack Engineer" },
    { department: "Product", team: "Product", title: "Product Manager" },
    { department: "Design", team: "Product", title: "Product Designer" },
    { department: "Sales", team: "Revenue", title: "Account Executive" },
    { department: "Ops", team: "Operations", title: "People Ops Specialist" }
  ];

  const name = `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
  const profile = departmentProfiles[index % departmentProfiles.length];
  const month = String((index % 9) + 1).padStart(2, "0");
  const day = String((index % 20) + 1).padStart(2, "0");

  return {
    name,
    email: `${firstNames[index % firstNames.length].toLowerCase()}.${lastNames[index % lastNames.length].toLowerCase()}@echohr.demo`,
    lifecycle: index % 8 === 0 ? "Manager" : "Employee",
    status: "Active",
    orgLayer: index % 8 === 0 ? "Manager" : "IC",
    department: profile.department,
    team: profile.team,
    title: profile.title,
    location: index % 3 === 0 ? "Sydney" : "Remote APAC",
    startDate: `2025-${month}-${day}`
  };
}

async function seedStartupScaleDemo(notion, registry, anchors) {
  const founderCeo = anchors.founderCeo;
  const founderCto = anchors.founderCto;
  const headPeople = anchors.headPeople;
  const engLead = anchors.engLead;
  const designLead = anchors.designLead;
  const salesLead = anchors.salesLead;

  await createOrFindDemoPerson(notion, registry, {
    name: "Sofia Kim",
    email: "sofia@echohr.demo",
    lifecycle: "Manager",
    status: "Active",
    orgLayer: "Director",
    title: "HR Business Partner",
    department: "Ops",
    team: "Operations",
    location: "Sydney",
    startDate: "2025-03-14"
  }, { managerId: headPeople.id });

  const syntheticPeople = [];
  for (let index = 0; index < 44; index += 1) {
    const profile = syntheticEmployeeProfile(index);
    let managerId = anchors.manager.id;
    if (profile.department === "Eng") {
      managerId = engLead.id;
    } else if (profile.department === "Design") {
      managerId = designLead.id;
    } else if (profile.department === "Product") {
      managerId = anchors.manager.id;
    } else if (profile.department === "Sales") {
      managerId = salesLead.id;
    } else if (profile.department === "Ops" || profile.department === "Sales") {
      managerId = headPeople.id;
    }
    const person = await createOrFindDemoPerson(notion, registry, profile, { managerId, buddyId: anchors.buddy.id });
    syntheticPeople.push({ ...profile, id: person.id });
  }

  const extraRoles = [
    { name: "Founding Backend Engineer", department: "Eng", level: "L5" },
    { name: "Growth Product Manager", department: "Product", level: "L4" },
    { name: "Account Executive", department: "Sales", level: "L3" },
    { name: "People Operations Lead", department: "Ops", level: "L5" }
  ];

  for (const [index, role] of extraRoles.entries()) {
    await createOrFindSafeRow(notion, registry.roles, role.name, {
      "Role Name": pageTitleProperty(role.name),
      Department: selectProperty(role.department),
      Level: selectProperty(role.level),
      "Employment Type": selectProperty("Full-time"),
      Location: multiSelectProperty(["Sydney", "Remote APAC"]),
      "Hiring Status": selectProperty("Open"),
      "Open Date": dateProperty(`2026-02-${String(index + 1).padStart(2, "0")}`),
      "Target Fill Date": dateProperty(`2026-04-${String(index + 10).padStart(2, "0")}`),
      "Interview Plan": richTextProperty("Recruiter screen -> Hiring manager -> Panel -> Decision"),
      "Stage SLA Days": { number: 4 },
      "Offer Approval Required": checkboxProperty(true),
      "Hiring Manager": relationValue([anchors.manager.id]),
      Recruiter: relationValue([anchors.recruiter.id])
    });
  }

  for (let index = 0; index < 8; index += 1) {
    const candidateName = `Candidate ${index + 1} Demo`;
    const candidatePerson = await createOrFindDemoPerson(notion, registry, {
      name: candidateName,
      email: `candidate${index + 1}@example.com`,
      lifecycle: "Candidate",
      status: "Prospect",
      department: index % 2 === 0 ? "Eng" : "Product",
      team: "Product",
      location: "Sydney"
    });

    const candidate = await createOrFindSafeRow(notion, registry.candidates, candidateName, {
      "Candidate Name": pageTitleProperty(candidateName),
      Person: relationValue([candidatePerson.id]),
      "Candidate Status": selectProperty(index < 4 ? "Interviewing" : "Screening"),
      Stage: selectProperty(index < 4 ? "Manager Screen" : "Recruiter Screen"),
      "Stage Owner": relationValue([anchors.recruiter.id]),
      "Applied On": dateProperty(`2026-03-${String(index + 1).padStart(2, "0")}`),
      "Last Update Sent": dateProperty("2026-03-09"),
      Source: selectProperty(index % 2 === 0 ? "Referral" : "LinkedIn"),
      Sentiment: selectProperty("Positive"),
      "Personalized Next Step": richTextProperty("You will receive a stage update within two business days.")
    });

    await createOrFindSafeRow(notion, registry.applications, `APP-DEMO-${index + 2}`, {
      "Application ID": pageTitleProperty(`APP-DEMO-${index + 2}`),
      Candidate: relationValue([candidate.id]),
      "Application Status": selectProperty("Active"),
      "Pipeline Stage": selectProperty(index < 4 ? "Interview Loop" : "Screen"),
      "Applied Date": dateProperty(`2026-03-${String(index + 1).padStart(2, "0")}`),
      "AI Feedback Summary": richTextProperty("Demo pipeline application for startup hiring dashboard."),
      "Decision Recommendation": selectProperty("Mixed"),
      "Candidate Message Draft": richTextProperty("We are actively reviewing your progress and will update you by the promised date.")
    });
  }

  for (const person of syntheticPeople.slice(0, 12)) {
    await createOrFindSafeRow(notion, registry.performanceReviews, `${person.name} - Annual 2025`, {
      "Review Name": pageTitleProperty(`${person.name} - Annual 2025`),
      Employee: relationValue([person.id]),
      "Review Cycle": selectProperty("Annual"),
      "Review Status": selectProperty("Shared"),
      "Review Due Date": dateProperty("2025-12-15"),
      "Self Review": richTextProperty("Strong year across execution, collaboration, and ownership."),
      "Manager Review": richTextProperty("Consistent impact and healthy growth trajectory."),
      "Peer Inputs": richTextProperty("Trusted cross-functional collaborator."),
      "Goal Progress": { number: 0.76 },
      Rating: { number: 4 },
      "Promotion Recommendation": selectProperty(person.lifecycle === "Manager" ? "Yes" : "Watchlist"),
      "AI Summary": richTextProperty("Annual review demo summary for startup-scale calibration."),
      "Action Recommendations": richTextProperty("Clarify next-level expectations and assign a larger cross-functional initiative."),
      "Shared With Employee At": dateProperty("2025-12-20")
    });
  }
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  const existingInstall = !args.dryRun ? loadExistingInstallState() : null;
  const version = getNextInstallVersion(existingInstall, args.forceNew, args.dryRun);

  const token = process.env.NOTION_TOKEN || loadNotionTokenFromOAuthSession() || requireEnv("NOTION_TOKEN");
  const parentPageId = requireEnv("NOTION_PARENT_PAGE_ID");
  const notion = new NotionClient({
    token,
    version: process.env.NOTION_VERSION || "2025-09-03",
    dryRun: args.dryRun
  });

  if (!args.dryRun && args.forceNew && existingInstall?.root?.id && existingInstall?.version) {
    await notion.updatePageTitle(existingInstall.root.id, rootTitleForVersion(existingInstall.version, false));
  }

  let root;
  let sectionPages;
  let registry;
  let createdNewInstall = false;

  if (!args.dryRun && existingInstall && !args.forceNew) {
    ({ root, sectionPages, registry } = await loadExistingInstall(notion, existingInstall));
    console.log(JSON.stringify({
      reused: true,
      message: "Existing EchoHR install detected. Reusing previous install and creating only missing records.",
      version: existingInstall.version || 1,
      root: existingInstall.root
    }, null, 2));
  } else {
    ({ root, sectionPages } = await createPageHierarchy(notion, parentPageId, version));
    registry = await createDatabases(notion, sectionPages);
    createdNewInstall = true;
  }

  if (!args.dryRun) {
    await applyRelations(notion, registry);
    await refreshPropertySchemas(notion, registry);
    await applyRollups(notion, registry);
    await seedTemplates(notion, registry);
    if (createdNewInstall) {
      const viewGuide = await createViewGuidePage(notion, root.id);
      await notion.createPage({
        parent: { type: "page_id", page_id: root.id },
        title: "View Setup Checklist (click-through)",
        children: checklistBlocks(registry)
      });
      await notion.createPage({
        parent: { type: "page_id", page_id: root.id },
        title: "Agent Ops Menu",
        children: agentOpsBlocks(sectionPages)
      });
      const viewGuideTitle = viewGuide.title || "Setup Views (5–10 min)";
      for (const page of Object.values(sectionPages)) {
        await notion.appendBlockChildren(page.id, [
          callout(`UI tip: open "${viewGuideTitle}" in the root to switch this space from tables to boards/timelines/galleries.`, "🎨")
        ]);
      }
      await seedAutomationPlaybooks(notion, sectionPages.automation.id);
    }

    if (args.seedDemo) {
      await seedDemoContent(notion, registry);
    }
  }

  const output = summarizeInstall(root, sectionPages, registry, version);
  if (!args.dryRun) {
    await notion.persistInstallOutput(resolve("echohr-install-output.json"), output);
    await notion.persistInstallOutput(resolve(".echohr-install-state.json"), output);
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
