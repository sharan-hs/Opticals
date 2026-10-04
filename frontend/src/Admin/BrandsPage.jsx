import React, { useState } from "react";

import { ConfirmDialog, PageHeader, QueryState } from "./components";
import { errorMessage } from "../Api/errors";
import {
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useListAdminBrandsQuery,
  useUpdateBrandMutation,
} from "../Features/Admin/adminApi";
import { notify } from "../Utils/notify";
import useDocumentTitle from "../Utils/useDocumentTitle";

const BrandRow = ({ brand }) => {
  const [update] = useUpdateBrandMutation();
  const [remove, removeState] = useDeleteBrandMutation();
  const [name, setName] = useState(brand.name);
  const [confirming, setConfirming] = useState(false);
  const save = (changes) =>
    update({ id: brand.id, ...changes })
      .unwrap()
      .then(() => notify.success("Saved"))
      .catch((err) => notify.error(errorMessage(err)));

  return (
    <tr>
      <td>
        <input
          className="adminInput"
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== brand.name && save({ name: name.trim() })}
        />
      </td>
      <td className="muted">{brand.slug}</td>
      <td className="num">{brand.product_count}</td>
      <td>
        <label className="adminCheck">
          <input type="checkbox" checked={brand.is_active} onChange={(e) => save({ is_active: e.target.checked })} />
          Shown
        </label>
      </td>
      <td>
        <button type="button" className="adminButton secondary small" onClick={() => setConfirming(true)}>
          Delete
        </button>
        <ConfirmDialog
          open={confirming}
          title={`Delete “${brand.name}”?`}
          confirmLabel="Delete"
          danger
          busy={removeState.isLoading}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await remove(brand.id).unwrap().catch((err) => notify.error(errorMessage(err)));
            setConfirming(false);
          }}
        >
          Only brands without products can be deleted. Untick “Shown” to hide a brand and its products.
        </ConfirmDialog>
      </td>
    </tr>
  );
};

const BrandsPage = () => {
  useDocumentTitle("Admin · Brands");
  const query = useListAdminBrandsQuery();
  const [create, createState] = useCreateBrandMutation();
  const [name, setName] = useState("");

  const add = async (event) => {
    event.preventDefault();
    try {
      await create({ name: name.trim() }).unwrap();
      setName("");
      notify.success("Brand added");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Brands" />
      <form className="adminCard adminToolbar" onSubmit={add}>
        <input aria-label="New brand name" placeholder="New brand name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="adminButton" disabled={createState.isLoading}>
          Add brand
        </button>
      </form>
      <QueryState query={query}>
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>URL name</th>
                <th className="num">Products</th>
                <th>Shop</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((brand) => (
                <BrandRow key={`${brand.id}-${brand.name}`} brand={brand} />
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </>
  );
};

export default BrandsPage;
