import React, { useState } from "react";
import "./Filter.css";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import { IoIosArrowDown } from "react-icons/io";
import { BiSearch } from "react-icons/bi";
import Slider from "@mui/material/Slider";

const Filter = ({ onFilterChange }) => {
  const [value, setValue] = useState([20, 90]); // Adjusted to match StoreData price range
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Updated categories to match StoreData
  const filterCategories = [
    "All",
    "Sunglasses",
    "Blue Light Glasses",
    "Reading Glasses",
  ];

  // Sample brands mapped to StoreData (you can adjust based on actual brand data)
  const brandsData = [
    { name: "Ray-Ban", count: 5 },
    { name: "Aviator", count: 2 },
    { name: "Optics", count: 3 },
  ];

  const handleColorChange = (color) => {
    setSelectedColors((prevColors) =>
      prevColors.includes(color)
        ? prevColors.filter((c) => c !== color)
        : [...prevColors, color]
    );
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    onFilterChange({ category, price: value, brands: selectedBrands });
  };

  const handleBrandChange = (brand) => {
    const updatedBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(updatedBrands);
    onFilterChange({
      category: selectedCategory,
      price: value,
      brands: updatedBrands,
    });
  };

  const handlePriceChange = (event, newValue) => {
    setValue(newValue);
    onFilterChange({
      category: selectedCategory,
      price: newValue,
      brands: selectedBrands,
    });
  };

  const filteredBrands = brandsData.filter((brand) =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterColors = [
    "#0B2472",
    "#D6BB4F",
    "#282828",
    "#B0D6E8",
    "#9C7539",
    "#D29B47",
    "#E5AE95",
    "#D76B67",
    "#BABABA",
    "#BFDCC4",
  ];

  return (
    <div className="filterSection">
      <div className="filterCategories">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary
            expandIcon={<IoIosArrowDown size={20} />}
            aria-controls="panel1-content"
            id="panel1-header"
            sx={{ padding: 0, marginBottom: 2 }}
          >
            <h5 className="filterHeading">Product Categories</h5>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            {filterCategories.map((category, index) => (
              <p
                key={index}
                onClick={() => handleCategoryChange(category)}
                style={{
                  cursor: "pointer",
                  fontWeight: selectedCategory === category ? "bold" : "normal",
                }}
              >
                {category}
              </p>
            ))}
          </AccordionDetails>
        </Accordion>
      </div>
      <div className="filterColors">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary
            expandIcon={<IoIosArrowDown size={20} />}
            aria-controls="panel1-content"
            id="panel1-header"
            sx={{ padding: 0, marginBottom: 2 }}
          >
            <h5 className="filterHeading">Color</h5>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <div className="filterColorBtn">
              {filterColors.map((color, index) => (
                <button
                  key={index}
                  className={`colorButton ${
                    selectedColors.includes(color) ? "selected" : ""
                  }`}
                  style={{
                    backgroundColor: color,
                  }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
      <div className="filterBrands">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary
            expandIcon={<IoIosArrowDown size={20} />}
            aria-controls="panel1-content"
            id="panel1-header"
            sx={{ padding: 0, marginBottom: 2 }}
          >
            <h5 className="filterHeading">Brands</h5>
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
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand, index) => (
                  <div className="brandItem" key={index}>
                    <input
                      type="checkbox"
                      name="brand"
                      id={`brand-${index}`}
                      className="brandRadio"
                      checked={selectedBrands.includes(brand.name)}
                      onChange={() => handleBrandChange(brand.name)}
                    />
                    <label htmlFor={`brand-${index}`} className="brandLabel">
                      {brand.name}
                    </label>
                    <span className="brandCount">{brand.count}</span>
                  </div>
                ))
              ) : (
                <div className="notFoundMessage">Not found</div>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
      <div className="filterPrice">
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary
            expandIcon={<IoIosArrowDown size={20} />}
            aria-controls="panel1-content"
            id="panel1-header"
            sx={{ padding: 0, marginBottom: 2 }}
          >
            <h5 className="filterHeading">Price</h5>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <Slider
              getAriaLabel={() => "Price range"}
              value={value}
              onChange={handlePriceChange}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `$${value}`}
              min={0}
              max={100} // Adjusted to match StoreData price range
              sx={{
                color: "black",
                "& .MuiSlider-thumb": {
                  backgroundColor: "white",
                  border: "2px solid black",
                  width: 18,
                  height: 18,
                },
              }}
            />
            <div className="filterSliderPrice">
              <div className="priceRange">
                <p>
                  Min Price: <span>${value[0]}</span>
                </p>
                <p>
                  Max Price: <span>${value[1]}</span>
                </p>
              </div>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
};

export default Filter;
