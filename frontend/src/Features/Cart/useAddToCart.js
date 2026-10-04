import { useDispatch, useSelector } from "react-redux";
import { addToCart, MAX_QUANTITY, selectCartItems } from "./cartSlice";
import { notify } from "../../Utils/notify";

// Cart line snapshot for one colour of a product from the API.
export const cartLineFor = (product, variant) => ({
  sku: variant.sku,
  slug: product.slug,
  name: `${product.brand.name} ${product.name}`,
  colorName: variant.color_name,
  pricePaise: variant.price_paise,
  image: variant.image ?? null,
});

// Adds a colour to the cart, respecting the per-item limit, and tells the
// shopper what happened.
export const useAddToCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);

  return (line, quantity = 1) => {
    const inCart = cartItems.find((item) => item.sku === line.sku)?.quantity ?? 0;
    const canAdd = Math.min(quantity, MAX_QUANTITY - inCart);

    if (canAdd <= 0) {
      notify.error(`You can order up to ${MAX_QUANTITY} of this item`);
      return;
    }

    dispatch(addToCart({ ...line, quantity: canAdd }));
    notify.success(
      canAdd < quantity ? `Added ${canAdd} — limit is ${MAX_QUANTITY} per item` : "Added to cart"
    );
  };
};
