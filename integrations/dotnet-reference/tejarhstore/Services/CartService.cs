using TejarhStore.Domain.Entities;
using System.Text.Json;

namespace TejarhStore.Web.Services;

public class CartService
{
    private const string SessionKey = "Cart";
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CartService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ISession Session => _httpContextAccessor.HttpContext!.Session;

    public List<CartItem> GetCart()
    {
        var json = Session.GetString(SessionKey);
        return json == null ? new List<CartItem>() : JsonSerializer.Deserialize<List<CartItem>>(json)!;
    }

    private void SaveCart(List<CartItem> cart)
    {
        Session.SetString(SessionKey, JsonSerializer.Serialize(cart));
    }

    public void AddToCart(int productId, string title, decimal price, int quantity = 1)
    {
        var cart = GetCart();
        var existing = cart.FirstOrDefault(c => c.ProductId == productId);

        if (existing != null)
            existing.Quantity += quantity;
        else
            cart.Add(new CartItem { ProductId = productId, Title = title, Price = price, Quantity = quantity });

        SaveCart(cart);
    }

    public void RemoveFromCart(int productId)
    {
        var cart = GetCart();
        cart.RemoveAll(c => c.ProductId == productId);
        SaveCart(cart);
    }

    public void UpdateQuantity(int productId, int quantity)
    {
        var cart = GetCart();
        var item = cart.FirstOrDefault(c => c.ProductId == productId);
        if (item != null)
        {
            if (quantity <= 0)
                cart.Remove(item);
            else
                item.Quantity = quantity;
        }
        SaveCart(cart);
    }

    public void ClearCart() => Session.Remove(SessionKey);

    public decimal GetTotal() => GetCart().Sum(c => c.Price * c.Quantity);
}
