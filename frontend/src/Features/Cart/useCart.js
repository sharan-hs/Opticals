import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { errorMessage } from "../../Api/errors";
import { notify } from "../../Utils/notify";
import { selectAuthStatus } from "../Auth/authSlice";
import {
  useAddCartItemMutation,
  useGetCartQuery,
  useMergeCartMutation,
  usePreviewCartQuery,
  useRemoveCartItemMutation,
  useSetCartQuantityMutation,
} from "./cartApi";
import {
  guestCartCleared,
  guestItemAdded,
  guestItemRemoved,
  guestItemsKept,
  guestQuantitySet,
  MAX_QUANTITY,
  selectGuestCount,
  selectGuestItems,
} from "./cartSlice";

export const EMPTY_CART = { lines: [], item_count: 0, subtotal_paise: 0, savings_paise: 0, has_issues: false };

// Guests' quantities change locally at once; the last preview may still show
// the old ones. Re-derive the numbers so the page never lags behind a click.
// (Display only: the server prices everything again at checkout.)
export const applyGuestQuantities = (cart, items) => {
  const quantities = new Map(items.map((item) => [item.variant_id, item.quantity]));
  const lines = cart.lines
    .filter((line) => quantities.has(line.variant_id))
    .map((line) => {
      const quantity = quantities.get(line.variant_id);
      const stockIssue = line.issue === null || line.issue === "INSUFFICIENT_STOCK";
      return {
        ...line,
        quantity,
        line_total_paise: line.unit_price_paise * quantity,
        issue: stockIssue ? (quantity > line.max_quantity ? "INSUFFICIENT_STOCK" : null) : line.issue,
      };
    });
  const buyable = lines.filter((line) => line.issue === null);
  return {
    lines,
    item_count: lines.reduce((n, line) => n + line.quantity, 0),
    subtotal_paise: buyable.reduce((n, line) => n + line.line_total_paise, 0),
    savings_paise: buyable.reduce((n, line) => n + (line.mrp_paise - line.unit_price_paise) * line.quantity, 0),
    has_issues: buyable.length < lines.length,
  };
};

const useSignedIn = () => useSelector(selectAuthStatus) === "authenticated";

// One cart API for every component, whether the shopper is signed in (server
// cart) or not (guest cart in this browser, priced by the API).
//   cart: { lines, item_count, subtotal_paise, savings_paise, has_issues } | null while loading
export const useCart = ({ fresh = false } = {}) => {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const signedIn = status === "authenticated";
  const guestItems = useSelector(selectGuestItems);
  const options = { refetchOnMountOrArgChange: fresh };

  const server = useGetCartQuery(undefined, { ...options, skip: !signedIn });
  const preview = usePreviewCartQuery(guestItems, { ...options, skip: signedIn || guestItems.length === 0 });
  const [addItem] = useAddCartItemMutation();
  const [setServerQuantity] = useSetCartQuantityMutation();
  const [removeServerItem] = useRemoveCartItemMutation();

  let cart = null;
  if (signedIn) cart = server.data ?? null;
  else if (status !== "unknown") {
    if (guestItems.length === 0) cart = EMPTY_CART;
    else if (preview.data) cart = applyGuestQuantities(preview.data, guestItems);
  }
  const source = signedIn ? server : preview;

  const add = async (variantId, quantity = 1) => {
    if (!signedIn) {
      const inCart = guestItems.find((item) => item.variant_id === variantId)?.quantity ?? 0;
      const canAdd = Math.min(quantity, MAX_QUANTITY - inCart);
      if (canAdd <= 0) {
        notify.error(`You can order up to ${MAX_QUANTITY} of each item`);
        return false;
      }
      dispatch(guestItemAdded({ variant_id: variantId, quantity: canAdd }));
      notify.success(canAdd < quantity ? `Added ${canAdd} — limit is ${MAX_QUANTITY} per item` : "Added to cart");
      return true;
    }
    try {
      await addItem({ variantId, quantity }).unwrap();
      notify.success("Added to cart");
      return true;
    } catch (err) {
      notify.error(errorMessage(err));
      return false;
    }
  };

  const setQuantity = (variantId, quantity) => {
    if (!signedIn) {
      dispatch(guestQuantitySet({ variant_id: variantId, quantity }));
      return;
    }
    setServerQuantity({ variantId, quantity })
      .unwrap()
      .catch((err) => notify.error(errorMessage(err)));
  };

  const remove = (variantId) => {
    if (!signedIn) {
      dispatch(guestItemRemoved(variantId));
      return;
    }
    removeServerItem(variantId)
      .unwrap()
      .catch((err) => notify.error(errorMessage(err)));
  };

  return {
    cart,
    isLoading: cart === null && !source.error,
    error: cart === null ? source.error : null,
    refetch: source.refetch,
    add,
    setQuantity,
    remove,
  };
};

// The number on the header's cart icon.
export const useCartCount = () => {
  const signedIn = useSignedIn();
  const guestCount = useSelector(selectGuestCount);
  const { data } = useGetCartQuery(undefined, { skip: !signedIn });
  return signedIn ? data?.item_count ?? 0 : guestCount;
};

// Mounted once (App shell). After sign-in, moves the guest cart into the
// user's server cart; for guests, forgets colours the shop no longer has.
export const useCartSync = () => {
  const dispatch = useDispatch();
  const signedIn = useSignedIn();
  const guestItems = useSelector(selectGuestItems);
  const [merge] = useMergeCartMutation();
  const merging = useRef(false);
  const { currentData: preview } = usePreviewCartQuery(guestItems, {
    skip: signedIn || guestItems.length === 0,
  });

  useEffect(() => {
    if (!signedIn || guestItems.length === 0 || merging.current) return;
    merging.current = true;
    merge(guestItems)
      .unwrap()
      .then((cart) => {
        dispatch(guestCartCleared());
        if (cart.adjusted_variant_ids.length > 0) {
          notify.info("Some items in your cart were updated to match what’s in stock.");
        }
      })
      .catch(() => {
        // The guest cart stays in this browser and is merged next time.
      })
      .finally(() => {
        merging.current = false;
      });
  }, [signedIn, guestItems, merge, dispatch]);

  useEffect(() => {
    if (preview) dispatch(guestItemsKept(preview.lines.map((line) => line.variant_id)));
  }, [preview, dispatch]);
};
