import React, { useState } from "react";
import { useSelector } from "react-redux";

import AddressForm from "./AddressForm";
import { FormError } from "../Form/Form";
import { errorMessage } from "../../Api/errors";
import {
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useGetAddressesQuery,
  useSetDefaultAddressMutation,
  useUpdateAddressMutation,
} from "../../Features/Account/accountApi";
import { selectCurrentUser } from "../../Features/Auth/authSlice";
import { notify } from "../../Utils/notify";
import useDocumentTitle from "../../Utils/useDocumentTitle";

const MAX_ADDRESSES = 10;

const formatPhone = (phone) =>
  phone?.startsWith("+91") ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone;

const AddressCard = ({ address, onEdit }) => {
  const [remove, { isLoading: removing }] = useDeleteAddressMutation();
  const [makeDefault, { isLoading: settingDefault }] = useSetDefaultAddressMutation();

  const onDelete = async () => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await remove(address.id).unwrap();
      notify.success("Address deleted");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  return (
    <li className="addressCard">
      <div className="addressCardHeader">
        <strong>{address.label || address.full_name}</strong>
        {address.is_default && <span className="addressDefault">Default</span>}
      </div>
      <address>
        {address.full_name}
        <br />
        {address.line1}
        {address.line2 && (
          <>
            <br />
            {address.line2}
          </>
        )}
        {address.landmark && (
          <>
            <br />
            Near {address.landmark}
          </>
        )}
        <br />
        {address.city}, {address.state} {address.pincode}
        <br />
        {formatPhone(address.phone)}
      </address>
      <div className="addressActions">
        <button type="button" className="linkAction" onClick={() => onEdit(address.id)}>
          Edit
        </button>
        <button type="button" className="linkAction" onClick={onDelete} disabled={removing}>
          Delete
        </button>
        {!address.is_default && (
          <button
            type="button"
            className="linkAction"
            onClick={() => makeDefault(address.id)}
            disabled={settingDefault}
          >
            Make default
          </button>
        )}
      </div>
    </li>
  );
};

const AddressesPage = () => {
  useDocumentTitle("My Addresses");
  const user = useSelector(selectCurrentUser);
  const { data: addresses = [], isLoading, error } = useGetAddressesQuery();
  const [createAddress, createState] = useCreateAddressMutation();
  const [updateAddress, updateState] = useUpdateAddressMutation();
  // null: list view; "new": adding; a number: editing that address.
  const [editing, setEditing] = useState(null);

  const close = () => {
    setEditing(null);
    createState.reset();
    updateState.reset();
  };

  const save = async (payload) => {
    if (editing === "new") {
      await createAddress(payload).unwrap();
      notify.success("Address saved");
    } else {
      await updateAddress({ id: editing, ...payload }).unwrap();
      notify.success("Address updated");
    }
    close();
  };

  if (isLoading) return <p role="status">Loading addresses…</p>;

  if (editing !== null) {
    const current = editing === "new" ? null : addresses.find((a) => a.id === editing);
    const state = editing === "new" ? createState : updateState;
    return (
      <div className="accountPanel">
        <h3>{current ? "Edit address" : "Add a new address"}</h3>
        <AddressForm
          address={current}
          defaultName={user?.full_name}
          onSave={save}
          onCancel={close}
          saving={state.isLoading}
          error={state.error}
        />
      </div>
    );
  }

  return (
    <div className="accountPanel">
      <div className="accountPanelHeader">
        <h3>Addresses</h3>
        {addresses.length < MAX_ADDRESSES && (
          <button type="button" className="secondaryButton" onClick={() => setEditing("new")}>
            Add address
          </button>
        )}
      </div>
      <FormError>{error ? errorMessage(error) : null}</FormError>
      {addresses.length === 0 ? (
        <p className="accountEmpty">You haven’t saved an address yet.</p>
      ) : (
        <ul className="addressList">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onEdit={setEditing} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressesPage;
