// Policy pages. These describe the site as it works today (catalogue +
// browser-only cart, no online orders). They MUST be reviewed by the owner and
// rewritten before accounts and online payments launch (docs/TASKS.md 1.11.4,
// 9.1 — Razorpay requires these pages).

const STORE_NAME = "Vijai Opticians";
const LAST_UPDATED = "4 October 2026";

export const legalPages = {
  terms: {
    title: "Terms & Conditions",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "About this website",
        paragraphs: [
          `This website is operated by ${STORE_NAME}, an optical retailer in Bengaluru with stores in Basaveshwar Nagar and Vijayanagar. It shows the eyewear we stock and how to reach us.`,
          "Online ordering is not available yet. Products shown here can be bought at our stores.",
        ],
      },
      {
        heading: "Products and prices",
        paragraphs: [
          "Prices are shown in Indian Rupees and include applicable taxes. Prices and availability can change without notice and may differ between our stores and this website.",
          "We try to show products accurately, but colours can look different on screens, and photos may show a product from a slightly different angle or batch.",
        ],
      },
      {
        heading: "Your cart",
        paragraphs: [
          "Items you add to the cart are saved only in your own browser. Adding an item to the cart does not reserve it or create an order.",
        ],
      },
      {
        heading: "Trademarks and content",
        paragraphs: [
          "Brand names and logos shown on this website belong to their respective owners. The 3D eyewear model on the home page is “Eyewear (Specs)” by rojencha on Sketchfab, used under the Creative Commons Attribution 4.0 licence.",
        ],
      },
      {
        heading: "Accuracy of information",
        paragraphs: [
          "We publish information in good faith and correct errors as soon as we find them. Please confirm price and availability with our store before visiting for a specific product.",
        ],
      },
      {
        // TODO(owner/legal): confirm governing law and jurisdiction.
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of India, and the courts of Bengaluru have jurisdiction over any dispute.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "This website does not have customer accounts and does not ask for your personal details.",
          "Your cart (the products and quantities you add) is stored in your browser's local storage on your device. It is not sent to us.",
          "The contact form opens your own email app with your message filled in. If you send it, we receive your name, email address and message, and use them only to reply to you.",
        ],
      },
      {
        heading: "Services we use",
        paragraphs: [
          "Product images are delivered by Cloudinary, fonts by Google Fonts, and store maps by Google Maps. When your browser loads these, the providers receive technical information such as your IP address, as described in their own privacy policies.",
          "Our hosting provider keeps standard server logs, which include IP addresses, for security and troubleshooting.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "We do not set cookies. The embedded Google Maps on the Contact page may set cookies when it loads.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "You can clear your cart and other site data at any time from your browser settings. To ask us to delete emails you have sent us, contact us using the details below.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We will update this policy before introducing customer accounts or online payments, and the date at the top will change when we do.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund & Cancellation Policy",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Online orders",
        paragraphs: [
          "Online ordering is not available yet, so there are no online orders to cancel or refund. This page will set out our cancellation and refund terms before online ordering launches.",
        ],
      },
      {
        // TODO(owner): describe the in-store exchange/refund policy (TASKS 0.4.4).
        heading: "Purchases made in our stores",
        paragraphs: [
          "Purchases made in our stores are covered by the store policy explained at the time of purchase. For help with a purchase, please contact the store where you bought it.",
        ],
      },
    ],
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: "Delivery",
        paragraphs: [
          "We do not deliver orders placed on this website yet. Products can be bought and collected at our stores. Please call ahead to check that the frame you want is in stock.",
        ],
      },
      {
        // TODO(owner): delivery areas, charges, timelines (TASKS 0.4.2).
        heading: "When online ordering launches",
        paragraphs: [
          "This page will list delivery areas, charges and expected delivery times before online ordering starts.",
        ],
      },
    ],
  },
};
