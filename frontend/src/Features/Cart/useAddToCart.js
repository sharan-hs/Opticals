import { useDispatch, useSelector } from "react-redux";
import { addToCart, MAX_QUANTITY, selectCartItems } from "./cartSlice";
import { notify } from "../../Utils/notify";

// Adds a product to the cart, respecting the per-item limit, and tells the
// shopper what happened.
export const useAddToCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);

  return (product, quantity = 1) => {
    const inCart =
      cartItems.find((item) => item.id === product.id)?.quantity ?? 0;
    const canAdd = Math.min(quantity, MAX_QUANTITY - inCart);

    if (canAdd <= 0) {
      notify.error(`You can order up to ${MAX_QUANTITY} of this item`);
      return;
    }

    dispatch(addToCart({ id: product.id, quantity: canAdd }));
    notify.success(
      canAdd < quantity
        ? `Added ${canAdd} — limit is ${MAX_QUANTITY} per item`
        : "Added to cart"
    );
  };
};
