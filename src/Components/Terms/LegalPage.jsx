import React from "react";
import { Link } from "react-router-dom";

import "./LegalPage.css";
import { legalPages } from "../../Data/legalContent";
import { storeInfo } from "../../Config/storeInfo";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const LegalPage = ({ page }) => {
  const { title, lastUpdated, sections } = legalPages[page];
  useDocumentTitle(title);

  return (
    <article className="termsContainer">
      <header>
        <h1>{title}</h1>
        <p className="termsUpdated">Last updated: {lastUpdated}</p>
      </header>
      <div className="termsContent">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        <section>
          <h2>Contact us</h2>
          <p>
            Email <a href={`mailto:${storeInfo.email}`}>{storeInfo.email}</a>,
            call{" "}
            {storeInfo.stores.map((store, index) => (
              <React.Fragment key={store.name}>
                {index > 0 && " or "}
                <a href={store.phoneHref}>{store.phone}</a> ({store.name})
              </React.Fragment>
            ))}
            , or visit our <Link to="/contact">contact page</Link>.
          </p>
        </section>
      </div>
    </article>
  );
};

export default LegalPage;
