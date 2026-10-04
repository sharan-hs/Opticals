import React, { useEffect, useState } from "react";
import "./Filter.css";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Slider from "@mui/material/Slider";
import { IoIosArrowDown } from "react-icons/io";

import { formatINR } from "../../../Utils/format";
import { COLOR_SWATCHES } from "../../../Features/Catalog/colors";

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

const roundDown = (value) => Math.floor(value / 500) * 500;
const roundUp = (value) => Math.ceil(value / 500) * 500;

// Checkbox list with counts, e.g. brands, gender, shape.
const CheckboxGroup = ({ name, options, selected, onToggle }) => (
  <div className="brandList">
    {options.map(({ value, label, count }) => {
      const id = `${name}-${value}`.toLowerCase().replace(/\W+/g, "-");
      return (
        <div className="brandItem" key={value}>
          <input
            id={id}
            type="checkbox"
            className="brandRadio"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
          />
          <label className="brandLabel" htmlFor={id}>
            {label}
          </label>
          <span className="brandCount">{count}</span>
        </div>
      );
    })}
  </div>
);

// Controlled filter panel: all state lives in the parent (URL query string);
// options and counts come from /products/facets.
const Filter = ({ facets, filters, onChange, onClearAll }) => {
  const bounds = facets.price
    ? [roundDown(facets.price.min), roundUp(facets.price.max)]
    : [0, 0];
  const appliedPrice = [filters.minPrice ?? bounds[0], filters.maxPrice ?? bounds[1]];
  const [price, setPrice] = useState(appliedPrice);

  // Keep the slider in sync when the URL changes (Back button, Clear all).
  const [appliedMin, appliedMax] = appliedPrice;
  useEffect(() => {
    setPrice([appliedMin, appliedMax]);
  }, [appliedMin, appliedMax]);

  const commitPrice = (_, [min, max]) =>
    onChange({
      minPrice: min > bounds[0] ? min : null,
      maxPrice: max < bounds[1] ? max : null,
    });

  const priceActive = filters.minPrice !== null || filters.maxPrice !== null;

  return (
    <div className="filterSection">
      <div className="clearAllWrapper">
        <button type="button" className="clearAllBtn" onClick={onClearAll}>
          Clear All Filters
        </button>
      </div>

      <div className="stockToggle">
        <input
          id="filter-in-stock"
          type="checkbox"
          className="brandRadio"
          checked={filters.inStock}
          onChange={() => onChange({ inStock: !filters.inStock })}
        />
        <label htmlFor="filter-in-stock">In stock only</label>
      </div>

      <FilterGroup
        title="Product Categories"
        onClear={filters.category && (() => onChange({ category: "" }))}
      >
        <ul className="filterOptionList">
          {[{ value: "", label: "All", count: null }, ...facets.categories].map(
            ({ value, label, count }) => (
              <li key={value || "all"}>
                <button
                  type="button"
                  className="filterOption"
                  aria-pressed={filters.category === value}
                  onClick={() => onChange({ category: value })}
                >
                  {label}
                  {count !== null && <span className="brandCount">{count}</span>}
                </button>
              </li>
            )
          )}
        </ul>
      </FilterGroup>

      {facets.colors.length > 0 && (
        <FilterGroup
          title="Color"
          onClear={filters.colors.length > 0 && (() => onChange({ colors: [] }))}
        >
          <div className="colorPills">
            {facets.colors.map(({ value, label, count }) => (
              <button
                type="button"
                key={value}
                className={`colorPill ${filters.colors.includes(value) ? "selected" : ""}`}
                aria-pressed={filters.colors.includes(value)}
                aria-label={`${label} (${count})`}
                onClick={() => onChange({ colors: toggle(filters.colors, value) })}
              >
                <span
                  className="colorDot"
                  style={{ background: COLOR_SWATCHES[value] ?? "#ccc" }}
                  aria-hidden="true"
                />
                <span className="colorLabel">{label}</span>
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      {facets.brands.length > 0 && (
        <FilterGroup
          title="Brands"
          onClear={filters.brands.length > 0 && (() => onChange({ brands: [] }))}
        >
          <CheckboxGroup
            name="brand"
            options={facets.brands}
            selected={filters.brands}
            onToggle={(value) => onChange({ brands: toggle(filters.brands, value) })}
          />
        </FilterGroup>
      )}

      {facets.frame_shapes.length > 0 && (
        <FilterGroup
          title="Frame Shape"
          onClear={filters.shapes.length > 0 && (() => onChange({ shapes: [] }))}
        >
          <CheckboxGroup
            name="shape"
            options={facets.frame_shapes}
            selected={filters.shapes}
            onToggle={(value) => onChange({ shapes: toggle(filters.shapes, value) })}
          />
        </FilterGroup>
      )}

      {facets.genders.length > 1 && (
        <FilterGroup
          title="Gender"
          onClear={filters.genders.length > 0 && (() => onChange({ genders: [] }))}
        >
          <CheckboxGroup
            name="gender"
            options={facets.genders}
            selected={filters.genders}
            onToggle={(value) => onChange({ genders: toggle(filters.genders, value) })}
          />
        </FilterGroup>
      )}

      {facets.price && bounds[1] > bounds[0] && (
        <FilterGroup
          title="Price"
          onClear={priceActive && (() => onChange({ minPrice: null, maxPrice: null }))}
        >
          <Slider
            value={price}
            onChange={(_, value) => setPrice(value)}
            onChangeCommitted={commitPrice}
            min={bounds[0]}
            max={bounds[1]}
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
      )}
    </div>
  );
};

export default Filter;
