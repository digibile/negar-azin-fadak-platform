using TejarhStore.Domain.Common;

namespace TejarhStore.Domain.Entities;

public class Brand : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
