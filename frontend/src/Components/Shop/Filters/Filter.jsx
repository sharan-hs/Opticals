import React, { useEffect, useState } from "react";
import "./Filter.css";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Slider from "@mui/material/Slider";
import { IoIosArrowDown } from "react-icons/io";

import { formatINR } from "../../../Utils/format";

const FilterGroup = ({ title, children, onClear }) => (
  <Accordion defaultExpanded disableGutters elevation={0}>
    <AccordionSummary
      expandIcon={<IoIosArrowDown size={20} />}
      sx={{ padding: 0 }}
    >
      <h5 className="filterHeading">{title}</h5>
    </AccordionSummary>
    <AccordionDetails sx={{ padding: 0 }}>
      {children}
      {onClear && (
        <button type="button" className="clearBtn" onClick={onClear}>
          Clear {title.toLowerCase()}
        </button>
      )}
    </AccordionDetails>
  </Accordion>
);

const toggle = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

// Controlled filter panel: all state lives in the parent (URL query string).
const Filter = ({ facets, filters, onChange, onClearAll }) => {
  const priceBounds = [facets.price.min, facets.price.max];
  const appliedPrice = [
    filters.minPrice ?? priceBounds[0],
    filters.maxPrice ?? priceBounds[1],
  ];
  const [price, setPrice] = useState(appliedPrice);

  // Keep the slider in sync when the URL changes (Back button, Clear all).
  const [appliedMin, appliedMax] = appliedPrice;
  useEffect(() => {
    setPrice([appliedMin, appliedMax]);
  }, [appliedMin, appliedMax]);

  const commitPrice = (_, [min, max]) =>
    onChange({
      minPrice: min > priceBounds[0] ? min : null,
      maxPrice: max < priceBounds[1] ? max : null,
    });

  const priceActive = filters.minPrice !== null || filters.maxPrice !== null;

  return (
    <div className="filterSection">
      <div className="clearAllWrapper">
        <button type="button" className="clearAllBtn" onClick={onClearAll}>
          Clear All Filters
        </button>
      </div>

      <FilterGroup
        title="Product Categories"
        onClear={filters.category && (() => onChange({ category: "" }))}
      >
        <ul className="filterOptionList">
          {[{ value: "", count: null }, ...facets.categories].map(
            ({ value, count }) => (
              <li key={value || "all"}>
                <button
                  type="button"
                  className="filterOption"
                  aria-pressed={filters.category === value}
                  onClick={() => onChange({ category: value })}
                >
                  {value || "All"}
                  {count !== null && <span className="brandCount">{count}</span>}
                </button>
              </li>
            )
          )}
        </ul>
      </FilterGroup>

      <FilterGroup
        title="Color"
        onClear={filters.colors.length > 0 && (() => onChange({ colors: [] }))}
      >
        <div className="colorPills">
          {facets.colors.map(({ value, hex }) => (
            <button
              type="button"
              key={value}
              className={`colorPill ${
                filters.colors.includes(value) ? "selected" : ""
              }`}
              aria-pressed={filters.colors.includes(value)}
              onClick={() => onChange({ colors: toggle(filters.colors, value) })}
            >
              <span
                className="colorDot"
                style={{ backgroundColor: hex || "#ccc" }}
                aria-hidden="true"
              />
              <span className="colorLabel">{value}</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Brands"
        onClear={filters.brands.length > 0 && (() => onChange({ brands: [] }))}
      >
        <div className="brandList">
          {facets.brands.map(({ value, count }) => {
            const id = `brand-${value.replace(/\W+/g, "-").toLowerCase()}`;
            return (
              <div className="brandItem" key={value}>
                <input
                  id={id}
                  type="checkbox"
                  className="brandRadio"
                  checked={filters.brands.includes(value)}
                  onChange={() =>
                    onChange({ brands: toggle(filters.brands, value) })
                  }
                />
                <label className="brandLabel" htmlFor={id}>
                  {value}
                </label>
                <span className="brandCount">{count}</span>
              </div>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup
        title="Price"
        onClear={
          priceActive && (() => onChange({ minPrice: null, maxPrice: null }))
        }
      >
        <Slider
          value={price}
          onChange={(_, value) => setPrice(value)}
          onChangeCommitted={commitPrice}
          min={priceBounds[0]}
          max={priceBounds[1]}
          step={500}
          valueLabelDisplay="auto"
          valueLabelFormat={formatINR}
          getAriaLabel={(index) => (index === 0 ? "Minimum price" : "Maximum price")}
          getAriaValueText={formatINR}
          sx={{
            color: "black",
            "& .MuiSlider-thumb": {
              backgroundColor: "white",
              border: "2px solid black",
            },
          }}
        />
        <div className="priceRange">
          <p>
            Min: <span>{formatINR(price[0])}</span>
          </p>
          <p>
            Max: <span>{formatINR(price[1])}</span>
          </p>
        </div>
      </FilterGroup>
    </div>
  );
};

export default Filter;
