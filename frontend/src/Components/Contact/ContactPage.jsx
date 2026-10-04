import React, { useState } from "react";
import "./ContactPage.css";

import { storeInfo } from "../../Config/storeInfo";
import useDocumentTitle from "../../Utils/useDocumentTitle";

// Until the backend can receive messages (P1), the form opens the visitor's
// email app with the message pre-filled.
const ContactPage = () => {
  useDocumentTitle("Contact Us");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
    window.location.href = `mailto:${storeInfo.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section className="contactSection">
      <h2>Contact Us</h2>

      <div className="contactStores">
        {storeInfo.stores.map((store) => (
          <article className="contactStore" key={store.name}>
            <iframe
              title={`Map of our ${store.name} store`}
              src={store.mapEmbed}
              width="600"
              height="450"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <address className="address">
              <h3>{store.name}</h3>
              <p>{store.address}</p>
              <p>
                <span className="addressLabel">Phone</span>
                <a href={store.phoneHref}>{store.phone}</a>
              </p>
              <p>
                <span className="addressLabel">Email</span>
                <a href={`mailto:${storeInfo.email}`}>{storeInfo.email}</a>
              </p>
            </address>
          </article>
        ))}
      </div>

      <div className="contactForm">
        <div className="contactFormIntro">
          <h3>Get In Touch</h3>
          <p>
            Questions about frames, lenses or an order? Fill in the form and
            we’ll open your email app with the message ready to send, or call
            either store.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="contactFormRow">
            <div className="contactField">
              <label htmlFor="contact-name">Name *</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="contactField">
              <label htmlFor="contact-email">Email address *</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="contactField">
            <label htmlFor="contact-message">Your message *</label>
            <textarea
              id="contact-message"
              rows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </div>
          <button type="submit">Send Email</button>
        </form>
      </div>
    </section>
  );
};

export default ContactPage;
