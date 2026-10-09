import test from "node:test";
import assert from "node:assert/strict";
import {normalizeDigikalaProducts} from "./digikala-catalog.js";

test("normalizes real source fields and keeps source attribution",()=>{
  const products=normalizeDigikalaProducts({
    data:{products:[{
      id:12345,
      title_fa:"گوشی آزمایشی منبع",
      url:"/product/dkp-12345/",
      images:{main:{url:["https://dkstatics-public.digikala.com/digikala-products/example.jpg"]}},
      default_variant:{price:{selling_price:125000000}},
      category:{title_fa:"موبایل و تبلت"},
      brand:{title_fa:"برند نمونه"},
      rating:{rate:4.2}
    }]}
  },"موبایل و تبلت");
  assert.equal(products.length,1);
  assert.equal(products[0].id,"digikala-12345");
  assert.equal(products[0].price,"125000000");
  assert.equal(products[0].currency,"IRR");
  assert.equal(products[0].category,"موبایل و تبلت");
  assert.equal(products[0].image_url,"https://dkstatics-public.digikala.com/digikala-products/example.jpg");
  assert.equal(products[0].source_url,"https://www.digikala.com/product/dkp-12345/");
  assert.equal(products[0].source_name,"دیجی‌کالا");
  assert.equal(products[0].rating,4.2);
});

test("keeps source availability separate from local inventory",()=>{
  const products=normalizeDigikalaProducts({data:{products:[
    {id:101,title_fa:"کالای موجود",images:{main:{url:["https://dkstatics-public.digikala.com/item.jpg"]}},default_variant:{price:{selling_price:1000},status:"marketable"}},
    {id:102,title_fa:"کالای ناموجود",images:{main:{url:["https://dkstatics-public.digikala.com/item2.jpg"]}},default_variant:{price:{selling_price:2000},is_sold_out:true}},
    {id:103,title_fa:"وضعیت نامشخص",images:{main:{url:["https://dkstatics-public.digikala.com/item3.jpg"]}},default_variant:{price:{selling_price:3000}}}
  ]}},"سایر کالاها");
  assert.deepEqual(products.map(item=>item.source_available),[true,false,null]);
  assert.equal(products.length,3);
});

test("keeps a sold-out product with no current price visible as unavailable",()=>{
  const products=normalizeDigikalaProducts({data:{products:[{id:104,title_fa:"کالای ناموجود بدون قیمت",images:{main:{url:["https://dkstatics-public.digikala.com/item4.jpg"]}},default_variant:{is_sold_out:true}}]}}, "سایر کالاها");
  assert.equal(products.length,1); assert.equal(products[0].price,null); assert.equal(products[0].source_available,false);
});

test("rejects records without a real image or valid price",()=>{
  const products=normalizeDigikalaProducts({data:{products:[
    {id:1,title_fa:"بدون تصویر",default_variant:{price:{selling_price:1000}}},
    {id:2,title_fa:"بدون قیمت",images:{main:{url:["https://cdn.example.test/p.jpg"]}}},
    {id:3,title_fa:"تصویر ناامن",images:{main:{url:["http://cdn.example.test/p.jpg"]}},default_variant:{price:{selling_price:1000}}}
  ]}},"موبایل و تبلت");
  assert.deepEqual(products,[]);
});

test("accepts nested item-list payloads and preserves the supplied category",()=>{
  const products=normalizeDigikalaProducts({data:{products:{items:[{
    id:"abc",
    title:"کالای منبع",
    image_url:"https://cdn.example.test/p.jpg",
    price:{selling_price:"250000"},
    product_url:"https://www.digikala.com/product/dkp-abc/"
  }]}}},"لوازم اداری");
  assert.equal(products.length,1);
  assert.equal(products[0].category,"لوازم اداری");
  assert.equal(products[0].source_type,"external-reference");
});

test("normalizes a single-product detail payload for admin ID lookup",()=>{
  const products=normalizeDigikalaProducts({data:{product:{
    id:987654,
    title_fa:"کالای بازیابی‌شده با شناسه",
    images:{main:{url:["https://dkstatics-public.digikala.com/digikala-products/id-lookup.jpg"]}},
    default_variant:{price:{selling_price:765000},status:"marketable"},
    category:{title_fa:"لوازم جانبی"}
  }}}, "سایر کالاها");
  assert.equal(products.length,1);
  assert.equal(products[0].id,"digikala-987654");
  assert.equal(products[0].sku,"DK-987654");
  assert.equal(products[0].price,"765000");
  assert.equal(products[0].source_available,true);
});


test("preserves product specifications and gallery images for internal review",()=>{
  const products=normalizeDigikalaProducts({data:{products:[{
    id:765432,
    title_fa:"کالای دارای مشخصات",
    images:{main:{url:["https://dkstatics-public.digikala.com/main.jpg"]},gallery:[{url:"https://dkstatics-public.digikala.com/side.jpg"},{url:"https://dkstatics-public.digikala.com/back.jpg"}]},
    default_variant:{price:{selling_price:125000}},
    specifications:[{title:"مشخصات فنی",attributes:[
      {title:"رنگ",values:["مشکی"]},
      {title:"وزن",values:["۲۰۰ گرم"]}
    ]}]
  }]}},"سایر کالاها");
  assert.equal(products.length,1);
  assert.deepEqual(products[0].specifications,[{group:"مشخصات فنی",items:[{name:"رنگ",values:["مشکی"]},{name:"وزن",values:["۲۰۰ گرم"]}]}]);
  assert.deepEqual(products[0].gallery_images,["https://dkstatics-public.digikala.com/main.jpg","https://dkstatics-public.digikala.com/side.jpg","https://dkstatics-public.digikala.com/back.jpg"]);
});
