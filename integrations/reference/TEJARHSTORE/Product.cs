// Imported source candidate from digibile/tejarhstore@main
// Source SHA: c83d80bc7959d76c0e02471d88cb43cb0a8669fd
using TejarhStore.Domain.Common;

namespace TejarhStore.Domain.Entities;

public class Product : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int StockQuantity { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public int BrandId { get; set; }
    public Brand Brand { get; set; } = null!;

    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
}

public class ProductImage : BaseEntity
{
    public string Url { get; set; } = string.Empty;
    public bool IsMain { get; set; }

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
}
