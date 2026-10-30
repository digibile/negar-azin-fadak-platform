using TejarhStore.Domain.Common;

namespace TejarhStore.Domain.Entities;

public class Order : BaseEntity
{
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | Paid | Failed | Cancelled

    public string? Authority { get; set; }
    public string? RefId { get; set; }

    public string ShippingAddress { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem : BaseEntity
{
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string ProductTitle { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
