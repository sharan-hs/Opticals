import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, PageHeader, QueryState, StatusPill, StockBadge } from "./components";
import ImagesTab from "./ImagesTab";
import StockDialog from "./StockDialog";
import { FormError } from "../Components/Form/Form";
import { applyFieldErrors, errorMessage } from "../Api/errors";
import {
  ENUMS,
  enumLabel,
  paiseToRupees,
  rupeesToPaise,
  useCreateProductMutation,
  useCreateVariantMutation,
  useDeleteProductMutation,
  useDeleteVariantMutation,
  useGetAdminProductQuery,
  useListAdminBrandsQuery,
  useListAdminCategoriesQuery,
  useSetProductStatusMutation,
  useUpdateProductMutation,
  useUpdateVariantMutation,
} from "../Features/Admin/adminApi";
import { notify } from "../Utils/notify";
import useDocumentTitle from "../Utils/useDocumentTitle";

const DETAIL_FIELDS = [
  "name", "slug", "brand_id", "category_id", "gender", "frame_type", "frame_shape",
  "frame_material", "model_number", "description", "hsn_code", "is_featured",
];
const NULLABLE = ["slug", "frame_type", "frame_shape", "frame_material", "model_number", "description", "hsn_code"];

const toDetailPayload = (values) => {
  const payload = { ...values, brand_id: Number(values.brand_id), category_id: Number(values.category_id) };
  NULLABLE.forEach((key) => {
    if (payload[key] === "") payload[key] = null;
  });
  return payload;
};

const Field = ({ label, error, children }) => (
  <label className="adminField">
    {label}
    {children}
    {error && <span className="fieldError">{error}</span>}
  </label>
);

const EnumSelect = ({ values, optional, register, name }) => (
  <select className="adminSelect" {...register(name)}>
    {optional && <option value="">—</option>}
    {values.map((value) => (
      <option key={value} value={value}>
        {enumLabel(value)}
      </option>
    ))}
  </select>
);

// --- details ----------------------------------------------------------------

const DetailsFields = ({ register, errors, categories, brands, isNew }) => (
  <>
    <div className="adminGrid">
      <Field label="Name *" error={errors.name?.message}>
        <input className="adminInput" {...register("name", { required: "Enter a name" })} />
      </Field>
      <Field label="Model number" error={errors.model_number?.message}>
        <input className="adminInput" placeholder="e.g. RB4349" {...register("model_number")} />
      </Field>
      <Field label="Brand *" error={errors.brand_id?.message}>
        <select className="adminSelect" {...register("brand_id", { required: "Choose a brand" })}>
          <option value="">Choose…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category *" error={errors.category_id?.message}>
        <select className="adminSelect" {...register("category_id", { required: "Choose a category" })}>
          <option value="">Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent_id ? `— ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Gender">
        <EnumSelect name="gender" values={ENUMS.gender} register={register} />
      </Field>
      <Field label="Frame shape">
        <EnumSelect name="frame_shape" values={ENUMS.frameShape} optional register={register} />
      </Field>
      <Field label="Frame type">
        <EnumSelect name="frame_type" values={ENUMS.frameType} optional register={register} />
      </Field>
      <Field label="Material">
        <EnumSelect name="frame_material" values={ENUMS.frameMaterial} optional register={register} />
      </Field>
      <Field label="HSN code" error={errors.hsn_code?.message}>
        <input className="adminInput" inputMode="numeric" placeholder="9004" {...register("hsn_code")} />
      </Field>
      {!isNew && (
        <Field label="URL name" error={errors.slug?.message}>
          <input className="adminInput" {...register("slug")} />
        </Field>
      )}
    </div>
    <div style={{ marginTop: 14 }}>
      <Field label="Description (plain text)" error={errors.description?.message}>
        <textarea className="adminTextarea" {...register("description")} />
      </Field>
    </div>
    <label className="adminCheck" style={{ marginTop: 12 }}>
      <input type="checkbox" {...register("is_featured")} /> Featured on the home page
    </label>
  </>
);

// --- new product ------------------------------------------------------------

const NewProduct = ({ categories, brands }) => {
  const navigate = useNavigate();
  const [createProduct, { isLoading, error, reset }] = useCreateProductMutation();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      name: "", model_number: "", brand_id: brands[0]?.id ?? "", category_id: "", gender: "UNISEX",
      frame_shape: "", frame_type: "", frame_material: "", hsn_code: "9004", description: "",
      is_featured: false, publish: true,
      sku: "", color_name: "", color_family: "", color_hex: "#000000", mrp: "", price: "", initial_stock: "0",
    },
  });

  const onSubmit = async (values) => {
    const { publish, sku, color_name, color_family, color_hex, mrp, price, initial_stock, ...details } = values;
    try {
      const created = await createProduct({
        ...toDetailPayload(details),
        status: publish ? "ACTIVE" : "DRAFT",
        variants: [
          {
            sku: sku.trim(),
            color_name,
            color_family: color_family || null,
            color_hex: color_hex || null,
            mrp_paise: rupeesToPaise(mrp),
            price_paise: rupeesToPaise(price || mrp),
            initial_stock: Number(initial_stock) || 0,
          },
        ],
      }).unwrap();
      notify.success("Product created");
      navigate(`/admin/products/${created.id}?tab=images`, { replace: true });
    } catch (err) {
      if (applyFieldErrors(err, setError, DETAIL_FIELDS)) reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError>{error ? errorMessage(error) : null}</FormError>
      <section className="adminCard">
        <h2>Details</h2>
        <DetailsFields register={register} errors={errors} categories={categories} brands={brands} isNew />
      </section>
      <section className="adminCard">
        <h2>First colour</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Add more colours after saving.
        </p>
        <div className="adminGrid">
          <Field label="SKU *" error={errors.sku?.message}>
            <input className="adminInput" placeholder="e.g. RB4349-710" {...register("sku", { required: "Enter a SKU" })} />
          </Field>
          <Field label="Colour name *" error={errors.color_name?.message}>
            <input className="adminInput" placeholder="e.g. Havana" {...register("color_name", { required: "Enter the colour" })} />
          </Field>
          <Field label="Colour family (for filters)">
            <EnumSelect name="color_family" values={ENUMS.colorFamily} optional register={register} />
          </Field>
          <Field label="Swatch colour">
            <input type="color" className="adminInput" style={{ height: 40 }} {...register("color_hex")} />
          </Field>
          <Field label="MRP (₹) *" error={errors.mrp?.message}>
            <input className="adminInput" type="number" min="1" step="0.01" {...register("mrp", { required: "Enter the MRP" })} />
          </Field>
          <Field label="Selling price (₹)">
            <input className="adminInput" type="number" min="1" step="0.01" placeholder="Same as MRP" {...register("price")} />
          </Field>
          <Field label="Opening stock">
            <input className="adminInput" type="number" min="0" {...register("initial_stock")} />
          </Field>
        </div>
      </section>
      <label className="adminCheck">
        <input type="checkbox" {...register("publish")} /> Show in the shop straight away
      </label>
      <div className="adminFormActions">
        <button type="submit" className="adminButton" disabled={isLoading}>
          Create product
        </button>
        <Link to="/admin/products" className="adminButton secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
};

// --- existing product: tabs -------------------------------------------------

const DetailsTab = ({ product, categories, brands }) => {
  const [updateProduct, { isLoading, error, reset }] = useUpdateProductMutation();
  const defaults = Object.fromEntries(DETAIL_FIELDS.map((key) => [key, product[key] ?? ""]));
  defaults.is_featured = product.is_featured;
  const { register, handleSubmit, setError, formState: { errors, isDirty }, reset: resetForm } = useForm({
    defaultValues: defaults,
  });

  const onSubmit = async (values) => {
    try {
      await updateProduct({ id: product.id, ...toDetailPayload(values) }).unwrap();
      resetForm(values);
      notify.success("Details saved");
    } catch (err) {
      if (applyFieldErrors(err, setError, DETAIL_FIELDS)) reset();
    }
  };

  return (
    <form className="adminCard" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError>{error ? errorMessage(error) : null}</FormError>
      <DetailsFields register={register} errors={errors} categories={categories} brands={brands} />
      <div className="adminFormActions">
        <button type="submit" className="adminButton" disabled={!isDirty || isLoading}>
          Save details
        </button>
      </div>
    </form>
  );
};

const VariantRow = ({ product, variant, onStock }) => {
  const [updateVariant, { isLoading }] = useUpdateVariantMutation();
  const [deleteVariant] = useDeleteVariantMutation();
  const [confirming, setConfirming] = useState(false);
  const { register, handleSubmit, formState: { isDirty }, reset } = useForm({
    defaultValues: {
      sku: variant.sku,
      color_name: variant.color_name,
      color_family: variant.color_family ?? "",
      color_hex: variant.color_hex ?? "#cccccc",
      size_label: variant.size_label ?? "",
      mrp: paiseToRupees(variant.mrp_paise),
      price: paiseToRupees(variant.price_paise),
      is_active: variant.is_active,
    },
  });

  const save = async ({ mrp, price, color_family, size_label, ...rest }) => {
    try {
      await updateVariant({
        id: variant.id,
        ...rest,
        color_family: color_family || null,
        size_label: size_label || null,
        mrp_paise: rupeesToPaise(mrp),
        price_paise: rupeesToPaise(price),
      }).unwrap();
      reset({ mrp, price, color_family, size_label, ...rest });
      notify.success(`${rest.sku} saved`);
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <tr>
      <td><input className="adminInput" aria-label="SKU" {...register("sku")} style={{ width: 130 }} /></td>
      <td><input className="adminInput" aria-label="Colour name" {...register("color_name")} style={{ width: 110 }} /></td>
      <td>
        <select className="adminSelect" aria-label="Colour family" {...register("color_family")}>
          <option value="">—</option>
          {ENUMS.colorFamily.map((value) => <option key={value} value={value}>{enumLabel(value)}</option>)}
        </select>
      </td>
      <td><input type="color" aria-label="Swatch" {...register("color_hex")} style={{ width: 44, height: 34, padding: 0, border: "none" }} /></td>
      <td><input className="adminInput" aria-label="Size" placeholder="54-18-145" {...register("size_label")} style={{ width: 90 }} /></td>
      <td><input className="adminInput" aria-label="MRP (₹)" type="number" step="0.01" {...register("mrp")} style={{ width: 85 }} /></td>
      <td><input className="adminInput" aria-label="Price (₹)" type="number" step="0.01" {...register("price")} style={{ width: 85 }} /></td>
      <td><input type="checkbox" aria-label="Active" {...register("is_active")} /></td>
      <td>
        <button type="button" className="linkAction" onClick={() => onStock(variant)}>
          <StockBadge status={variant.availability}>{variant.available}</StockBadge>
        </button>
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button type="button" className="adminButton small" disabled={!isDirty || isLoading} onClick={handleSubmit(save)}>
          Save
        </button>{" "}
        <button type="button" className="adminButton secondary small" onClick={() => setConfirming(true)}>
          Delete
        </button>
        <ConfirmDialog
          open={confirming}
          title={`Delete colour ${variant.sku}?`}
          confirmLabel="Delete colour"
          danger
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await deleteVariant(variant.id).unwrap().catch((err) => notify.error(errorMessage(err)));
            setConfirming(false);
          }}
        >
          It disappears from the shop and from carts. Past orders keep their record.
          {product.variants.length === 1 && " This is the only colour, so the product will no longer show in the shop."}
        </ConfirmDialog>
      </td>
    </tr>
  );
};

const NewVariantForm = ({ product }) => {
  const [createVariant, { isLoading }] = useCreateVariantMutation();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { sku: "", color_name: "", color_family: "", color_hex: "#000000", mrp: "", price: "", initial_stock: "0" },
  });
  const add = async ({ mrp, price, color_family, initial_stock, ...rest }) => {
    try {
      await createVariant({
        productId: product.id,
        ...rest,
        color_family: color_family || null,
        mrp_paise: rupeesToPaise(mrp),
        price_paise: rupeesToPaise(price || mrp),
        initial_stock: Number(initial_stock) || 0,
      }).unwrap();
      reset();
      notify.success("Colour added");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };
  return (
    <form className="adminCard" onSubmit={handleSubmit(add)}>
      <h2>Add a colour</h2>
      <div className="adminGrid">
        <Field label="SKU *"><input className="adminInput" required {...register("sku")} /></Field>
        <Field label="Colour name *"><input className="adminInput" required {...register("color_name")} /></Field>
        <Field label="Colour family"><EnumSelect name="color_family" values={ENUMS.colorFamily} optional register={register} /></Field>
        <Field label="Swatch"><input type="color" className="adminInput" style={{ height: 40 }} {...register("color_hex")} /></Field>
        <Field label="MRP (₹) *"><input className="adminInput" type="number" step="0.01" min="1" required {...register("mrp")} /></Field>
        <Field label="Selling price (₹)"><input className="adminInput" type="number" step="0.01" min="1" placeholder="Same as MRP" {...register("price")} /></Field>
        <Field label="Opening stock"><input className="adminInput" type="number" min="0" {...register("initial_stock")} /></Field>
      </div>
      <div className="adminFormActions">
        <button type="submit" className="adminButton" disabled={isLoading}>Add colour</button>
      </div>
    </form>
  );
};

const VariantsTab = ({ product }) => {
  const [stockRow, setStockRow] = useState(null);
  return (
    <>
      <div className="adminTableWrap" style={{ marginBottom: 20 }}>
        <table className="adminTable">
          <thead>
            <tr>
              <th>SKU</th><th>Colour</th><th>Family</th><th>Swatch</th><th>Size</th>
              <th>MRP ₹</th><th>Price ₹</th><th>Active</th><th>Available</th><th />
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <VariantRow
                key={`${variant.id}-${variant.mrp_paise}-${variant.price_paise}-${variant.sku}`}
                product={product}
                variant={variant}
                onStock={setStockRow}
              />
            ))}
          </tbody>
        </table>
      </div>
      <NewVariantForm product={product} />
      {stockRow && (
        <StockDialog
          open
          onClose={() => setStockRow(null)}
          row={{ ...stockRow, variant_id: stockRow.id, product_name: product.name }}
        />
      )}
    </>
  );
};

const SpecsTab = ({ product }) => {
  const [rows, setRows] = useState(product.specifications.length ? product.specifications : [{ label: "", value: "" }]);
  const [updateProduct, { isLoading, error }] = useUpdateProductMutation();
  const setRow = (index, key, value) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  const save = async () => {
    const specifications = rows.filter((row) => row.label.trim() && row.value.trim());
    try {
      await updateProduct({ id: product.id, specifications }).unwrap();
      notify.success("Specifications saved");
    } catch {
      // shown below
    }
  };
  return (
    <div className="adminCard">
      <p className="muted" style={{ marginBottom: 12 }}>
        Shown in the “Product Details” table, e.g. Lens width · 54 mm, UV protection · UV400.
      </p>
      <FormError>{error ? errorMessage(error) : null}</FormError>
      {rows.map((row, index) => (
        <div key={index} className="adminToolbar">
          <input aria-label="Label" placeholder="Label" value={row.label} onChange={(e) => setRow(index, "label", e.target.value)} />
          <input aria-label="Value" placeholder="Value" value={row.value} onChange={(e) => setRow(index, "value", e.target.value)} />
          <button type="button" className="adminButton secondary small" onClick={() => setRows(rows.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <div className="adminFormActions">
        <button type="button" className="adminButton secondary" onClick={() => setRows([...rows, { label: "", value: "" }])}>
          Add row
        </button>
        <button type="button" className="adminButton" onClick={save} disabled={isLoading}>
          Save specifications
        </button>
      </div>
    </div>
  );
};

const TABS = [
  ["details", "Details"],
  ["colours", "Colours & stock"],
  ["images", "Photos"],
  ["specs", "Specifications"],
];

const ExistingProduct = ({ id, categories, brands }) => {
  const navigate = useNavigate();
  const query = useGetAdminProductQuery(id);
  const [setStatus] = useSetProductStatusMutation();
  const [deleteProduct, deleteState] = useDeleteProductMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") ?? "details");
  const product = query.data;
  useDocumentTitle(product ? `Admin · ${product.name}` : "Admin · Product");

  const changeStatus = async (status) => {
    try {
      await setStatus({ id: product.id, status }).unwrap();
      notify.success(status === "ACTIVE" ? "Published to the shop" : "Hidden from the shop");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <QueryState query={query}>
      {product && (
        <>
          <PageHeader title={product.name}>
            <StatusPill status={product.status} />
            {product.status === "ACTIVE" ? (
              <>
                <a className="adminButton secondary" href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
                  View in shop
                </a>
                <button type="button" className="adminButton secondary" onClick={() => changeStatus("INACTIVE")}>
                  Hide from shop
                </button>
              </>
            ) : (
              <button type="button" className="adminButton" onClick={() => changeStatus("ACTIVE")}>
                Publish
              </button>
            )}
            <button type="button" className="adminButton danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </PageHeader>
          <div className="adminTabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
                {label}
                {key === "colours" && ` (${product.variants.length})`}
                {key === "images" && ` (${product.images.length})`}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {tab === "details" && <DetailsTab key={product.updated_at} product={product} categories={categories} brands={brands} />}
            {tab === "colours" && <VariantsTab product={product} />}
            {tab === "images" && <ImagesTab product={product} />}
            {tab === "specs" && <SpecsTab key={product.updated_at} product={product} />}
          </div>
          <ConfirmDialog
            open={confirmDelete}
            title={`Delete ${product.name}?`}
            confirmLabel="Delete product"
            danger
            busy={deleteState.isLoading}
            onClose={() => setConfirmDelete(false)}
            onConfirm={async () => {
              await deleteProduct(product.id).unwrap();
              notify.success("Product deleted");
              navigate("/admin/products", { replace: true });
            }}
          >
            It disappears from the shop and from customers’ carts. Order history keeps its record. To hide it
            temporarily, use “Hide from shop” instead.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
};

const ProductEditor = () => {
  const { id } = useParams();
  const isNew = id === "new";
  useDocumentTitle(isNew ? "Admin · New product" : "Admin · Product");
  const categories = useListAdminCategoriesQuery();
  const brands = useListAdminBrandsQuery();

  return (
    <>
      <p style={{ marginBottom: 10 }}>
        <Link to="/admin/products">← Products</Link>
      </p>
      <QueryState query={categories}>
        <QueryState query={brands}>
          {isNew ? (
            <>
              <PageHeader title="New product" />
              <NewProduct categories={categories.data ?? []} brands={brands.data ?? []} />
            </>
          ) : (
            <ExistingProduct id={Number(id)} categories={categories.data ?? []} brands={brands.data ?? []} />
          )}
        </QueryState>
      </QueryState>
    </>
  );
};

export default ProductEditor;
