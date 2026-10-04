import React from "react";
import "./RelatedProducts.css";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

import ProductCard from "../../ProductCard/ProductCard";
import { useGetRelatedProductsQuery } from "../../../Features/Catalog/catalogApi";

const RelatedProducts = ({ slug }) => {
  const { data: relatedProducts = [] } = useGetRelatedProductsQuery({ slug });
  if (!relatedProducts.length) return null;

  return (
    <section className="relatedProductSection" aria-labelledby="related-heading">
      <div className="relatedProducts">
        <h2 id="related-heading">
          RELATED <span>PRODUCTS</span>
        </h2>
      </div>
      <div className="relatedProductSlider">
        <button
          type="button"
          className="swiper-button image-swiper-button-next"
          aria-label="Next products"
        >
          <IoIosArrowForward />
        </button>
        <button
          type="button"
          className="swiper-button image-swiper-button-prev"
          aria-label="Previous products"
        >
          <IoIosArrowBack />
        </button>
        <Swiper
          slidesPerView={2}
          slidesPerGroup={2}
          spaceBetween={14}
          navigation={{
            nextEl: ".image-swiper-button-next",
            prevEl: ".image-swiper-button-prev",
          }}
          modules={[Navigation]}
          breakpoints={{
            768: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 24 },
            1024: { slidesPerView: 4, slidesPerGroup: 4, spaceBetween: 30 },
          }}
        >
          {relatedProducts.map((related) => (
            <SwiperSlide key={related.id}>
              <ProductCard product={related} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default RelatedProducts;
