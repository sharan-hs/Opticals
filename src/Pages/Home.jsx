import React from "react";
import HeroSection from "../Components/Home/Hero/HeroSection";
import CollectionBox from "../Components/Home/Collection/CollectionBox";
import Trendy from "../Components/Home/Trendy/Trendy";
import Services from "../Components/Home/Services/Services";
import useDocumentTitle from "../Utils/useDocumentTitle";

const Home = () => {
  useDocumentTitle("Eyewear & Sunglasses in Bengaluru");
  return (
    <>
      <HeroSection />
      <CollectionBox />
      <Trendy />
      <Services />
    </>
  );
};

export default Home;
