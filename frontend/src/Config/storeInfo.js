// Single source for the shop's public contact details.
// TODO(owner): confirm phone numbers, email and social links (docs/TASKS.md 0.4.7).

export const storeInfo = {
  name: "Vijai Opticians",
  email: "vachanvijai@gmail.com",
  stores: [
    {
      name: "Basaveshwar Nagar",
      address:
        "476A, Siddhaiah Puranik Road, 3rd Block, Sharada Colony, West of Chord Road, 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka 560079",
      phone: "97313 07237",
      phoneHref: "tel:+919731307237",
      mapEmbed:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31103.83724193359!2d77.49987707431639!3d12.973153000000007!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3dbfcce44fe7%3A0x9f1232f74ddd3491!2sVijai%20Opticians!5e0!3m2!1sen!2sin!4v1754822205361!5m2!1sen!2sin",
    },
    {
      name: "Vijayanagar",
      address:
        "No.161/1, Dhanalaxmi Complex, 8th Main Rd, Govindaraja Nagar Ward, MC Layout, Vijayanagar, Bengaluru, Karnataka 560040",
      phone: "080 2340 7691",
      phoneHref: "tel:+918023407691",
      mapEmbed:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31103.83724193359!2d77.49987707431639!3d12.973153000000007!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3ddd7435d42f%3A0xf832aa8367c3985!2sVijai%20Opticians!5e0!3m2!1sen!2sin!4v1754844269821!5m2!1sen!2sin",
    },
  ],
  // Add profile URLs once confirmed; empty entries are not rendered.
  social: {
    instagram: "",
    facebook: "",
    youtube: "",
  },
};
