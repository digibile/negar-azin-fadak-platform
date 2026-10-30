using TejarhStore.Application.Interfaces;
using TejarhStore.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace TejarhStore.Web.Controllers;

public class CartController : Controller
{
    private readonly CartService _cartService;
    private readonly IApplicationDbContext _context;

    public CartController(CartService cartService, IApplicationDbContext context)
    {
        _cartService = cartService;
        _context = context;
    }

    public IActionResult Index()
    {
        var cart = _cartService.GetCart();
        ViewBag.Total = _cartService.GetTotal();
        return View(cart);
    }

    [HttpPost]
    public async Task<IActionResult> Add(int productId, int quantity = 1)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null) return NotFound();

        _cartService.AddToCart(product.Id, product.Title, product.DiscountPrice ?? product.Price, quantity);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    public IActionResult UpdateQuantity(int productId, int quantity)
    {
        _cartService.UpdateQuantity(productId, quantity);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    public IActionResult Remove(int productId)
    {
        _cartService.RemoveFromCart(productId);
        return RedirectToAction(nameof(Index));
    }
}
