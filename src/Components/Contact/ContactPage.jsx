import React, { useState } from "react";
import "./ContactPage.css";

const ContactPage = () => {
  const [name, setname] = useState("");
  const [email, setEmail] = useState("");
  const [message, setmessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Thank You ${name} for Contacting Us. We will Get Back to You Soon.\n\nYour Mail Id - ${email}.\nYour Message is - ${message}`
    );
    setname("");
    setEmail("");
    setmessage("");
  };

  return (
    <>
      <div className="contactSection">
        <h2>Contact Us</h2>
        <div className="contactMap">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31103.83724193359!2d77.49987707431639!3d12.973153000000007!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3dbfcce44fe7%3A0x9f1232f74ddd3491!2sVijai%20Opticians!5e0!3m2!1sen!2sin!4v1754822205361!5m2!1sen!2sin"
            width="600"
            height="450"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31103.83724193359!2d77.49987707431639!3d12.973153000000007!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3ddd7435d42f%3A0xf832aa8367c3985!2sVijai%20Opticians!5e0!3m2!1sen!2sin!4v1754844269821!5m2!1sen!2sin"
            width="600"
            height="450"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <div className="contactInfo">
          <div className="contactAddress">
            <div className="address">
              <h3>Store in Basveshwar Nagar</h3>
              <p>
                476A, Siddhaiah Puranik Rd, 3rd Block, Sharada Colony, West of
                Chord Road 3rd Stage, Basaveshwar Nagar, Bengaluru, Karnataka
                560079
              </p>
              <p>
                admin@dummymail.com
                <br />
                97313 07237
              </p>
            </div>
            <div className="address">
              <h3>Store in Vijayanagar</h3>
              <p>
                No.161/1, Dhanalaxmi Complex, 8th Main Rd, Govindaraja Nagar
                Ward, MC Layout, Vijayanagar, Bengaluru, Karnataka 560040
              </p>
              <p>
                contact@dummymail.com
                <br />
                080 2340 7691
              </p>
            </div>
          </div>
          <div className="contactForm">
            <h3>Get In Touch</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                placeholder="Name *"
                onChange={(e) => setname(e.target.value)}
                required
              />
              <input
                type="email"
                value={email}
                placeholder="Email address *"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <textarea
                rows={10}
                cols={40}
                placeholder="Your Message"
                value={message}
                onChange={(e) => setmessage(e.target.value)}
              />
              <button type="submit">Submit</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;
