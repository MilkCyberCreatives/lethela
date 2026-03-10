import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export const BUSINESS_NAME = "Lethela";
export const BUSINESS_TAGLINE = "Siyashesha";

export type SupportFaqItem = {
  q: string;
  a: string;
  tags: string[];
};

export function getWhatsAppSupportLink() {
  return `https://wa.me/${getOrderWhatsAppPhone()}`;
}

export function businessFacts() {
  return {
    name: BUSINESS_NAME,
    tagline: BUSINESS_TAGLINE,
    supportWhatsApp: getWhatsAppSupportLink(),
    supportPhoneDisplay: "+27 72 390 8919",
    serviceArea:
      "Lethela is currently focused on Klipfontein View, Midrand, and nearby township-first delivery corridors, with gradual expansion to nearby suburbs.",
    countryContext: "South Africa",
    keyCategories: [
      "Kota",
      "Chips",
      "Burgers",
      "Groceries",
      "Alcohol (18+ only)",
      "Local favourites",
    ],
    orderMethods: ["Online checkout with Ozow", "WhatsApp order confirmation"],
    tracking:
      "Customers track orders with a reference such as LET-12345 on the Track Order page or through live order pages.",
    vendorFlow:
      "Vendors apply online, submit business details and optional compliance documents, then wait for admin approval before the store goes live.",
    vendorTools:
      "Approved vendors get a dashboard with overview, menu management, imports, orders, analytics, profile, hours, specials, automations, and support.",
    riderFlow:
      "Riders apply online, operations review applications, then approved riders receive onboarding and delivery instructions.",
    riderRequirements:
      "Riders need South African ID, a valid license where applicable, reliable transport, a smartphone with GPS/data, WhatsApp, and a bank account.",
    alcoholPolicy:
      "Alcohol listings are allowed for approved vendors, but sales are strictly 18+ and subject to local law and verification at fulfilment.",
    escalation:
      "For urgent support, refunds, order issues, vendor onboarding help, or rider follow-up, the primary escalation path is WhatsApp support.",
  };
}

export function buildBusinessSystemPrompt(relevantItems: SupportFaqItem[] = []) {
  const facts = businessFacts();
  const retrieved =
    relevantItems.length > 0
      ? [
          "",
          "Relevant knowledge for this conversation:",
          ...relevantItems.map((item) => `- Q: ${item.q}\n  A: ${item.a}`),
        ]
      : [];

  return [
    `You are ${facts.name}'s AI assistant for customers, vendors, riders, and general support.`,
    `Brand tone: concise, practical, warm, locally grounded. Tagline: ${facts.tagline}.`,
    "Answer only with information grounded in the business facts and retrieved knowledge below.",
    "If the answer is uncertain, incomplete, or operationally sensitive, direct the user to WhatsApp support instead of guessing.",
    "",
    "Core business facts:",
    `- Country context: ${facts.countryContext}`,
    `- Service area: ${facts.serviceArea}`,
    `- Key categories: ${facts.keyCategories.join(", ")}`,
    `- Ordering methods: ${facts.orderMethods.join(" and ")}`,
    `- Tracking: ${facts.tracking}`,
    `- Vendor onboarding: ${facts.vendorFlow}`,
    `- Vendor dashboard tools: ${facts.vendorTools}`,
    `- Rider onboarding: ${facts.riderFlow}`,
    `- Rider requirements: ${facts.riderRequirements}`,
    `- Alcohol policy: ${facts.alcoholPolicy}`,
    `- Escalation: ${facts.escalation}`,
    `- Support WhatsApp: ${facts.supportWhatsApp}`,
    "",
    "Operating guidance:",
    "- For order placement without online payment, explicitly mention WhatsApp ordering.",
    "- For support, refunds, payment disputes, delayed orders, or missing items, provide the WhatsApp support link.",
    "- For tracking, ask for or use the order reference format LET-12345.",
    "- For vendor questions, explain the apply -> admin review -> approval -> dashboard flow clearly.",
    "- For rider questions, explain the apply -> ops review -> onboard flow clearly.",
    "- For dashboard questions, mention the correct areas: overview, menu, orders, analytics, profile, hours, specials, automations, and support.",
    "- Keep answers action-oriented. Prefer the next best step, link, or channel over vague descriptions.",
    ...retrieved,
  ].join("\n");
}

export function supportFaq(): SupportFaqItem[] {
  const supportLink = getWhatsAppSupportLink();

  return [
    {
      q: "What is Lethela?",
      a: "Lethela is a South African AI-supported delivery platform focused on food, groceries, township favourites, and local last-mile convenience.",
      tags: ["what is lethela", "about", "platform", "business", "company"],
    },
    {
      q: "Where is Lethela available?",
      a: "Lethela is currently focused on Klipfontein View, Midrand and nearby suburbs while service expands gradually.",
      tags: ["coverage", "area", "midrand", "location", "available", "where"],
    },
    {
      q: "What can I order on Lethela?",
      a: "You can order township favourites and essentials including kota, chips, burgers, groceries, and alcohol from approved vendors.",
      tags: ["menu", "categories", "kota", "chips", "burgers", "groceries", "alcohol", "food"],
    },
    {
      q: "How do I place an order?",
      a: "You can add items to cart and check out online with Ozow, or place the order through WhatsApp for manual confirmation.",
      tags: ["order", "checkout", "how to order", "buy", "basket", "cart", "ozow"],
    },
    {
      q: "Can I order without paying online?",
      a: `Yes. You can place your basket through WhatsApp and request manual or offline confirmation here: ${supportLink}`,
      tags: ["whatsapp", "offline", "cash", "manual order", "no card", "pay later"],
    },
    {
      q: "How long does delivery take?",
      a: "Most deliveries target roughly 25 to 40 minutes, depending on vendor prep, order volume, and travel distance.",
      tags: ["eta", "delivery", "time", "how long", "minutes", "arrival"],
    },
    {
      q: "How do I track my order?",
      a: "Use your order reference such as LET-12345 on the tracking page to view live status updates.",
      tags: ["track", "tracking", "status", "where is my order", "let-12345", "reference"],
    },
    {
      q: "What does the order reference look like?",
      a: "Lethela order references follow a format like LET-12345. That reference is used for tracking and support follow-up.",
      tags: ["reference", "order id", "let", "tracking id", "format"],
    },
    {
      q: "What if my order is late, missing, or wrong?",
      a: `If your order is delayed, missing items, or incorrect, contact Lethela support on WhatsApp and include your order reference so the team can resolve it quickly: ${supportLink}`,
      tags: ["refund", "issue", "missing", "late", "cancel", "support", "wrong order", "problem"],
    },
    {
      q: "How do refunds or cancellations work?",
      a: `Refunds and order issue handling are managed through Lethela support. Message WhatsApp support with your order reference and issue details: ${supportLink}`,
      tags: ["refund", "refunds", "cancel", "cancellation", "return", "payment issue"],
    },
    {
      q: "Can I buy alcohol on Lethela?",
      a: "Yes, approved vendors can list alcohol. Alcohol sales are strictly 18+ and subject to local legal and fulfilment requirements.",
      tags: ["alcohol", "beer", "wine", "cider", "spirits", "age", "18+"],
    },
    {
      q: "What is Lethela's alcohol policy?",
      a: "Alcohol is 18+ only. Availability depends on approved vendors and compliance with local laws and checks during fulfilment.",
      tags: ["policy", "alcohol policy", "18+", "law", "legal"],
    },
    {
      q: "How do vendors join Lethela?",
      a: "Vendors apply through the Become a Vendor page, submit business details, and wait for admin approval before the store goes live.",
      tags: ["vendor", "join", "apply", "onboarding", "approval", "register"],
    },
    {
      q: "What do vendors need to apply?",
      a: "Vendors should provide business name, phone, operating address, suburb, city, province, cuisine types, delivery fee defaults, and optional compliance links such as ID or proof of address.",
      tags: ["vendor requirements", "documents", "vendor apply", "business details", "kyc"],
    },
    {
      q: "What happens after a vendor applies?",
      a: "After applying, the vendor profile stays pending until admin review is completed. Once approved, the store can go live and the vendor dashboard becomes fully usable.",
      tags: ["vendor pending", "review", "approval", "after applying", "go live"],
    },
    {
      q: "What can vendors do in the dashboard?",
      a: "Approved vendors can use the dashboard for overview, menu management, product imports, orders, analytics, profile details, hours, specials, automations, and support.",
      tags: ["dashboard", "vendor dashboard", "menu", "analytics", "orders", "specials", "automations"],
    },
    {
      q: "Where do vendors manage their menu?",
      a: "Vendors manage products, stock, and bulk item imports inside the Menu area of the dashboard.",
      tags: ["menu tab", "manage menu", "products", "imports", "stock", "catalog"],
    },
    {
      q: "Can vendors run promotions and specials?",
      a: "Yes. Vendors can create specials, schedule promotions, manage discount windows, and use automations to help with promo ideas and timing.",
      tags: ["specials", "promotions", "discounts", "promo", "vendor tools"],
    },
    {
      q: "Can vendors get AI help?",
      a: "Yes. Lethela supports AI-assisted descriptions, pricing support, automations, insights, and operational suggestions for vendors.",
      tags: ["ai", "vendor ai", "descriptions", "pricing", "automations", "insights"],
    },
    {
      q: "How do riders join Lethela?",
      a: "Riders apply through the Rider page. Operations review applications and onboard approved riders afterward.",
      tags: ["rider", "join", "apply", "delivery driver", "onboarding", "rider page"],
    },
    {
      q: "What do riders need to apply?",
      a: "Riders need a valid South African ID, deliverable license where required, reliable transport, a smartphone with GPS and data, WhatsApp, and a bank account.",
      tags: ["rider requirements", "id", "license", "bike", "car", "transport", "bank account"],
    },
    {
      q: "What happens after a rider applies?",
      a: "Operations review the rider application and onboarding summary. Approved riders then receive instructions and initial shift setup.",
      tags: ["rider review", "rider approval", "after applying", "onboard"],
    },
    {
      q: "How do I contact Lethela support?",
      a: `Message Lethela support on WhatsApp here: ${supportLink}`,
      tags: ["support", "contact", "help", "whatsapp", "phone"],
    },
    {
      q: "What does Siyashesha mean?",
      a: 'Siyashesha means "we are fast," which reflects Lethela’s promise across onboarding, support, and delivery.',
      tags: ["siyashesha", "meaning", "tagline", "brand"],
    },
    {
      q: "What kinds of customers does Lethela serve?",
      a: "Lethela is built for local South African communities looking for fast food delivery, grocery orders, township-first commerce, and lower-friction support.",
      tags: ["customers", "who uses lethela", "community", "township", "south africa"],
    },
    {
      q: "What should I do if I am not sure who to contact?",
      a: `If you are unsure, start with Lethela WhatsApp support and include the relevant details such as order reference, store name, or application status: ${supportLink}`,
      tags: ["not sure", "contact", "who to contact", "escalate", "help"],
    },
  ];
}
