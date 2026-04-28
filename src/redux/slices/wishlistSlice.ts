"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import moment from "moment";
import { ProductsType } from "@/interface/common.interface";
import { toast } from "sonner";
interface CartState {
  cartProducts: ProductsType[];
}
const initialState: CartState = {
  cartProducts: [],
};

export const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    wishlist_product: (state, { payload }: PayloadAction<ProductsType>) => {
      const productIndex = state.cartProducts.findIndex(
        (item) => item.id === payload.id
      );

      if (productIndex >= 0) {
        state.cartProducts[productIndex].totalCart! += 1;
        const toastId = toast.loading("");
        toast.info("Increase Product wishlist Quantity", {
          id: toastId,
          duration: 1000,
        });
      } else {
        const now = moment();
        const orderDate = now.format("MM/DD/YY hh:mm a"); // Format the current date as "MM/DD/YY hh:mm a"

        const tempProduct = {
          ...payload,
          totalCart: 1,
          orderDate: orderDate, // Include the formatted date as "orderDate"
        };

        state.cartProducts.push(tempProduct);
        const capitalizedCategoryName =
          payload.productTitle.charAt(0).toUpperCase() + payload.productTitle.slice(1);
        const toastId = toast.loading("");
        toast.success(`${capitalizedCategoryName} added to wishlist`, {
          id: toastId,
          duration: 1000,
        });
      }
    },
    remove_wishlist_product: (
      state,
      { payload }: PayloadAction<ProductsType>
    ) => {
      state.cartProducts = state.cartProducts.filter(
        (item) => item.id !== payload.id
      );
      const toastId = toast.loading("");
      toast.error(`Remove from your wishlist`, { id: toastId, duration: 1000 });
    },

    clear_wishlist: (state) => {
      const confirmMsg = window.confirm(
        "Are you sure deleted your all wishlist items ?"
      );
      if (confirmMsg) {
        state.cartProducts = [];
      }
    },
    decrease_quantity: (state, { payload }: PayloadAction<ProductsType>) => {
      const cartIndex = state.cartProducts.findIndex(
        (item) => item.id === payload.id
      );

      if (cartIndex >= 0) {
        const totalCart = state.cartProducts[cartIndex]?.totalCart ?? 0;

        if (totalCart > 1) {
          state.cartProducts[cartIndex].totalCart = totalCart - 1;
          const toastId = toast.loading("");
          toast.success("Quantity Decrease", { id: toastId, duration: 1000 });
        } else {
          const toastId = toast.loading("");
          toast.error(`Quantity cannot be less than 1`, {
            id: toastId,
            duration: 1000,
          });
        }
      }
    },
  },
});

export const {
  wishlist_product,
  remove_wishlist_product,
  clear_wishlist,
  decrease_quantity,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
