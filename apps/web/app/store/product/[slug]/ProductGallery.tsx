"use client";

import { useState } from "react";

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [activeImage, setActiveImage] = useState(images[0] || "");
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const visibleImages = images.filter((image) => !failedImages.includes(image));
  const activeImageFailed = !activeImage || failedImages.includes(activeImage);

  function chooseImage(image: string) {
    setActiveImage(image);
  }

  return (
    <div className="sk-product-detail-media">
      <div className="sk-dk-gallery-main">
        {!activeImageFailed ? (
          <button type="button" className="sk-dk-gallery-zoom" onClick={() => setZoomOpen(true)} aria-label="بزرگ‌نمایی تصویر محصول">
            <img className="sk-product-main-image" src={activeImage} alt={title} onError={() => setFailedImages((current) => current.includes(activeImage) ? current : [...current, activeImage])} />
            <span aria-hidden="true">⌕</span>
          </button>
        ) : (
          <div className="sk-product-detail-no-image" role="img" aria-label={"تصویر برای " + title + " در دسترس نیست"}>
            <span aria-hidden="true">▧</span>
            <b>تصویر محصول در دسترس نیست</b>
            <small>تصویر ثبت‌شده بارگذاری نشد یا هنوز برای این کالا ثبت نشده است.</small>
          </div>
        )}
      </div>
      {visibleImages.length > 1 && (
        <div className="sk-product-gallery-thumbs" aria-label="تصاویر محصول">
          {visibleImages.map((image, index) => (
            <button type="button" className={activeImage === image ? "is-active" : ""} onClick={() => chooseImage(image)} key={image} aria-label={"نمایش تصویر " + (index + 1)} aria-pressed={activeImage === image}>
              <img src={image} alt={title + " - تصویر " + (index + 1)} loading="lazy" onError={() => setFailedImages((current) => current.includes(image) ? current : [...current, image])} />
            </button>
          ))}
        </div>
      )}
      <span className="sk-dk-gallery-hint">{visibleImages.length > 1 ? "برای تغییر تصویر، یکی از تصاویر کوچک را انتخاب کنید" : "برای بزرگ‌نمایی، تصویر اصلی را انتخاب کنید"}</span>
      {zoomOpen && !activeImageFailed && (
        <div className="sk-dk-gallery-lightbox" role="dialog" aria-modal="true" aria-label={"نمایش بزرگ تصویر " + title} onClick={() => setZoomOpen(false)}>
          <button type="button" className="sk-dk-gallery-lightbox-close" onClick={() => setZoomOpen(false)} aria-label="بستن تصویر بزرگ">×</button>
          <img src={activeImage} alt={title} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
