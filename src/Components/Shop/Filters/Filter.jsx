import React, { useState } from "react";
import "./Filter.css";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { IoIosArrowDown } from "react-icons/io";
import { BiSearch } from "react-icons/bi";
import Slider from "@mui/material/Slider";
import { productMeta } from "../../../Utils/metadata";


const Filter = ({ onFilterChange, products = [] }) => {
  const [value, setValue] = useState([0, 20000]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filterCategories = [
    "All",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];


  const uniqueColors = [
    ...new Set(Object.values(productMeta).map(p => p.color).filter(Boolean))
  ];
  const colorMap = {
    black: "#000000",
    opal: "#B0D6E8",
    brown: "#9C7539",
    green: "#BFDCC4",
    havana: "#7B3F00",
    fucsia: "#D76B67",
    blue: "#0B2472",
    gold: "#D6BB4F",
    rose: "#E5AE95",
  };

  const brandsData = [
    ...new Set(products.map((p) => p.brand)),
  ].map((brand) => ({
    name: brand,
    count: products.filter((p) => p.brand === brand).length,
  }));

  const handleFilterUpdate = (
    category = selectedCategory,
    price = value,
    brands = selectedBrands,
    colors = selectedColors
  ) => {
    onFilterChange({ category, price, brands, colors });
  };

  const handleColorChange = (color) => {
    const updated = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];

    setSelectedColors(updated);
    handleFilterUpdate(selectedCategory, value, selectedBrands, updated);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    handleFilterUpdate(category);
  };

  const handleBrandChange = (brand) => {
    const updated = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];

    setSelectedBrands(updated);
    handleFilterUpdate(selectedCategory, value, updated);
  };

  const handlePriceChange = (event, newValue) => {
    setValue(newValue);
    handleFilterUpdate(selectedCategory, newValue);
  };

  // ✅ CLEAR FUNCTIONS
  const clearAllFilters = () => {
    setSelectedCategory("All");
    setSelectedBrands([]);
    setSelectedColors([]);
    setValue([0, 20000]);

    onFilterChange({
      category: "All",
      price: [0, 20000],
      brands: [],
      colors: [],
    });
  };

  const clearColors = () => {
    setSelectedColors([]);
    handleFilterUpdate(selectedCategory, value, selectedBrands, []);
  };

  const clearBrands = () => {
    setSelectedBrands([]);
    handleFilterUpdate(selectedCategory, value, [], selectedColors);
  };

  const clearCategory = () => {
    setSelectedCategory("All");
    handleFilterUpdate("All");
  };

  const clearPrice = () => {
    setValue([0, 20000]);
    handleFilterUpdate(selectedCategory, [0, 20000]);
  };

  const filteredBrands = brandsData.filter((brand) =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="filterSection">

      {/* ✅ CLEAR ALL */}
      <div className="clearAllWrapper">
        <button className="clearAllBtn" onClick={clearAllFilters}>
          Clear All Filters
        </button>
      </div>

      {/* CATEGORY */}
      <div className="filterCategories">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary expandIcon={<IoIosArrowDown size={20} />} sx={{ padding: 0 }}>
            <div className="filterHeaderRow">
              <h5 className="filterHeading">Product Categories</h5>
              {selectedCategory !== "All" && (
                <span className="clearBtn" onClick={clearCategory}>Clear</span>
              )}
            </div>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            {filterCategories.map((category, index) => (
              <p
                key={index}
                onClick={() => handleCategoryChange(category)}
                style={{
                  fontWeight: selectedCategory === category ? "bold" : "normal",
                }}
              >
                {category}
              </p>
            ))}
          </AccordionDetails>
        </Accordion>
      </div>

      {/* COLORS */}
      <div className="filterColors">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary expandIcon={<IoIosArrowDown size={20} />} sx={{ padding: 0 }}>
            <div className="filterHeaderRow">
              <h5 className="filterHeading">Color</h5>
              {selectedColors.length > 0 && (
                <span className="clearBtn" onClick={clearColors}>Clear</span>
              )}
            </div>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <div className="colorPills">
              {uniqueColors.map((color, index) => (
                <div
                  key={index}
                  className={`colorPill ${selectedColors.includes(color) ? "selected" : ""}`}
                  onClick={() => handleColorChange(color)}
                >
                  <span
                    className="colorDot"
                    style={{ backgroundColor: colorMap[color] || "#ccc" }}
                  />
                  <span className="colorLabel">{color}</span>
                </div>
              ))}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>

      {/* BRANDS */}
      <div className="filterBrands">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary expandIcon={<IoIosArrowDown size={20} />} sx={{ padding: 0 }}>
            <div className="filterHeaderRow">
              <h5 className="filterHeading">Brands</h5>
              {selectedBrands.length > 0 && (
                <span className="clearBtn" onClick={clearBrands}>Clear</span>
              )}
            </div>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <div className="searchBar">
              <BiSearch className="searchIcon" size={20} color={"#767676"} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="brandList">
              {filteredBrands.map((brand, index) => (
                <div className="brandItem" key={index}>
                  <input
                    type="checkbox"
                    className="brandRadio"
                    checked={selectedBrands.includes(brand.name)}
                    onChange={() => handleBrandChange(brand.name)}
                  />
                  <label className="brandLabel">{brand.name}</label>
                  <span className="brandCount">{brand.count}</span>
                </div>
              ))}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>

      {/* PRICE */}
      <div className="filterPrice">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary expandIcon={<IoIosArrowDown size={20} />} sx={{ padding: 0 }}>
            <div className="filterHeaderRow">
              <h5 className="filterHeading">Price</h5>
              {(value[0] !== 0 || value[1] !== 20000) && (
                <span className="clearBtn" onClick={clearPrice}>Clear</span>
              )}
            </div>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <Slider
              value={value}
              onChange={handlePriceChange}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `₹${v}`}
              min={0}
              max={20000}
              sx={{
                color: "black",
                "& .MuiSlider-thumb": {
                  backgroundColor: "white",
                  border: "2px solid black",
                },
              }}
            />

            <div className="priceRange">
              <p>Min Price: <span>₹{value[0]}</span></p>
              <p>Max Price: <span>₹{value[1]}</span></p>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
};

export default Filter;