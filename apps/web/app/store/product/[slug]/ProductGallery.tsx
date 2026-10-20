"use client";

import { useState } from "react";

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [activeImage, setActiveImage] = useState(images[0] || "");
  return (
    <div className="sk-product-detail-media">
      <div className="sk-dk-gallery-main">
        {activeImage ? <img className="sk-product-main-image" src={activeImage} alt={title} /> : <div className="sk-product-detail-no-image">تصویر محصول ثبت نشده</div>}
      </div>
      {images.length > 1 && (
        <div className="sk-product-gallery-thumbs" aria-label="تصاویر محصول">
          {images.map((image, index) => (
            <button type="button" className={activeImage === image ? "is-active" : ""} onClick={() => setActiveImage(image)} key={image} aria-label={"نمایش تصویر " + (index + 1)} aria-pressed={activeImage === image}>
              <img src={image} alt={title + " - تصویر " + (index + 1)} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <span className="sk-dk-gallery-hint">برای مشاهده تصویر، تصویر کوچک را انتخاب کنید</span>
    </div>
  );
}
