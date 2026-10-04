import React from "react";
import "./AboutPage.css";

import Shop from "../../Assets/shop.webp";
import Shop2 from "../../Assets/shop2.webp";
import Shop3 from "../../Assets/shop3.webp";
import useDocumentTitle from "../../Utils/useDocumentTitle";

// TODO(owner): add mission/vision text and newer store photos
// (docs/TASKS.md 0.4.11).
const AboutPage = () => {
  useDocumentTitle("About Us");
  return (
    <section className="aboutSection">
      <h2>About Us</h2>
      <img
        className="aboutHeroImg"
        src={Shop}
        alt="Vijai Opticians store front"
        width={680}
        height={453}
      />

      <ul className="aboutHighlights">
        <li>
          <strong>1988</strong>
          <span>First store opened in Vijayanagar</span>
        </li>
        <li>
          <strong>2 stores</strong>
          <span>Vijayanagar and Basaveshwar Nagar</span>
        </li>
        <li>
          <strong>Multi-brand</strong>
          <span>Frames, sunglasses and lenses</span>
        </li>
      </ul>

      <div className="aboutStory">
        <div className="aboutStoryIntro">
          <h3>Our Story</h3>
          <p className="aboutLead">
            Established in 1988, we opened our first store in Vijayanagar.
            Since then, we have been dedicated to crafting a clear vision for
            our customers, ensuring that we help individuals with their optical
            needs.
          </p>
        </div>
        <div className="aboutStoryBody">
          <p>
            In 2005, we expanded our presence by opening our second store in
            Basaveshwar Nagar, which quickly gained recognition as a premier
            multi-brand showroom in the area.
          </p>
          <p>
            As one of the oldest optical retailers, we take pride in our
            experienced opticians, who continuously strive to adapt to the
            evolving requirements of a new generation. Our dedication to
            excellence in service and products ensures that we stand out in the
            optical market. We remain committed to meeting the eyewear needs of
            our customers while maintaining the highest standards in quality
            and care.
          </p>
        </div>
      </div>

      <div className="aboutGallery">
        <figure>
          <img src={Shop2} alt="Frames on display inside our store" width={680} height={453} loading="lazy" />
          <figcaption>Our showroom</figcaption>
        </figure>
        <figure>
          <img src={Shop3} alt="Eye testing equipment in our store" width={680} height={453} loading="lazy" />
          <figcaption>In-store eye testing</figcaption>
        </figure>
      </div>
    </section>
  );
};

export default AboutPage;
