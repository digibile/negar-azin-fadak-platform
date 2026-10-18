# Production marketplace API deployment

The public Digibile storefront reads its seller-owned catalog from `https://sookar.ir/api/public/marketplace?tenantCode=digibile`.

A successful HTML response from `digibile.ir` does not prove the API route is live. Before declaring the storefront functional, verify the public API response, tenant resolution, product count, and local media URLs in the production deployment workflow. A 404 from the endpoint means the API release must be deployed before catalog verification can pass.

Products must only appear as purchasable when they have an approved internal sale price and verified inventory. External reference catalog prices are not seller inventory and must not be presented as in-stock products.
