import React, { useState } from "react";

import { ConfirmDialog, PageHeader, QueryState } from "./components";
import { errorMessage } from "../Api/errors";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListAdminCategoriesQuery,
  useUpdateCategoryMutation,
} from "../Features/Admin/adminApi";
import { notify } from "../Utils/notify";
import useDocumentTitle from "../Utils/useDocumentTitle";

const CategoryRow = ({ category, parents }) => {
  const [update] = useUpdateCategoryMutation();
  const [remove, removeState] = useDeleteCategoryMutation();
  const [name, setName] = useState(category.name);
  const [confirming, setConfirming] = useState(false);
  const save = (changes) =>
    update({ id: category.id, ...changes })
      .unwrap()
      .then(() => notify.success("Saved"))
      .catch((err) => notify.error(errorMessage(err)));

  return (
    <tr>
      <td style={{ paddingLeft: category.parent_id ? 36 : 12 }}>
        <input
          className="adminInput"
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== category.name && save({ name: name.trim() })}
        />
      </td>
      <td className="muted">{category.slug}</td>
      <td>
        <select
          className="adminSelect"
          aria-label="Parent"
          value={category.parent_id ?? ""}
          onChange={(e) => save({ parent_id: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Top level</option>
          {parents
            .filter((p) => p.id !== category.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </td>
      <td className="num">{category.product_count}</td>
      <td>
        <label className="adminCheck">
          <input type="checkbox" checked={category.is_active} onChange={(e) => save({ is_active: e.target.checked })} />
          Shown
        </label>
      </td>
      <td>
        <button type="button" className="adminButton secondary small" onClick={() => setConfirming(true)}>
          Delete
        </button>
        <ConfirmDialog
          open={confirming}
          title={`Delete “${category.name}”?`}
          confirmLabel="Delete"
          danger
          busy={removeState.isLoading}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await remove(category.id).unwrap().catch((err) => notify.error(errorMessage(err)));
            setConfirming(false);
          }}
        >
          Only empty categories can be deleted. To hide one that has products, untick “Shown”.
        </ConfirmDialog>
      </td>
    </tr>
  );
};

const CategoriesPage = () => {
  useDocumentTitle("Admin · Categories");
  const query = useListAdminCategoriesQuery();
  const [create, createState] = useCreateCategoryMutation();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const categories = query.data ?? [];
  const parents = categories.filter((c) => !c.parent_id);
  // Parents followed by their subcategories.
  const ordered = parents.flatMap((p) => [p, ...categories.filter((c) => c.parent_id === p.id)]);

  const add = async (event) => {
    event.preventDefault();
    try {
      await create({ name: name.trim(), parent_id: parentId ? Number(parentId) : null }).unwrap();
      setName("");
      notify.success("Category added");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Categories" />
      <form className="adminCard adminToolbar" onSubmit={add}>
        <input aria-label="New category name" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select aria-label="Parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Top level</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              Inside {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="adminButton" disabled={createState.isLoading}>
          Add category
        </button>
      </form>
      <QueryState query={query}>
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>URL name</th>
                <th>Parent</th>
                <th className="num">Products</th>
                <th>Shop</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordered.map((category) => (
                <CategoryRow key={`${category.id}-${category.name}`} category={category} parents={parents} />
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </>
  );
};

export default CategoriesPage;
