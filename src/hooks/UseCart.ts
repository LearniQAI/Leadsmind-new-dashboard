import { ProductsType } from '@/interface/common.interface';
import { useAppSelector } from '@/redux/hooks';

const useShoppingCartMetrics = () => {

    // Cart quantity
    const UseCartProductQuantity = () => {
        const cartProducts = useAppSelector((state) => state.cart.cartProducts);
        const uniqueProductId = new Set();
        cartProducts.forEach((product: ProductsType) => uniqueProductId.add(product.id));
        return uniqueProductId.size;
    };
    // Wishlist quantity
    const UseWishlstQuantity = () => {
        const cartProducts = useAppSelector((state) => state?.wishlist.cartProducts);
        const uniqueProductId = new Set();
        cartProducts?.forEach((product: ProductsType) => uniqueProductId.add(product.id));
        return uniqueProductId.size;
    }

    const UseTotalPrice = () => {
        const cartProducts = useAppSelector((state) => state.cart.cartProducts);
        const totalPrice = cartProducts.reduce((total, product) => {
            if (typeof product.price === 'number' && product.price !== 0) {
                return total + (product.price ?? 0) * (product.quantity ?? 0);
            }
            return total;
        }, 0);
        return totalPrice;
    }

    return {
        UseCartProductQuantity,
        UseWishlstQuantity,
        UseTotalPrice,
    }
};

export default useShoppingCartMetrics;