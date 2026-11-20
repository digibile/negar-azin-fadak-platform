"use client";

import {useState} from "react";
import {AddToCartButton, type StoreCartProduct} from "../../cart-actions";

export default function ProductPurchaseControls({product}:{product:StoreCartProduct}){
 const [quantity,setQuantity]=useState(1);
 const maximum=product.is_preorder?Math.max(1,Number(product.preorder_limit)||10):99;
 return <div className="sk-product-purchase-controls">
  <div className="sk-product-quantity-control" aria-label={"تعداد "+product.title}>
   <button type="button" aria-label="افزایش تعداد" disabled={quantity>=maximum} onClick={()=>setQuantity(value=>Math.min(maximum,value+1))}>+</button>
   <output aria-live="polite">{quantity.toLocaleString("fa-IR")}</output>
   <button type="button" aria-label="کاهش تعداد" disabled={quantity<=1} onClick={()=>setQuantity(value=>Math.max(1,value-1))}>−</button>
  </div>
  <AddToCartButton product={product} quantity={quantity}/>
 </div>;
}
