import StorePage from "../store/page";

/**
 * Canonical public commerce storefront.
 * The homepage and /marketplace intentionally share this implementation.
 */
export default function MarketplacePage(){
  return <StorePage variant="marketplace-pro"/>;
}
