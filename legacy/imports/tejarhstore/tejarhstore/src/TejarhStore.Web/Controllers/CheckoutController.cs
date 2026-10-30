using TejarhStore.Application.Interfaces;
using TejarhStore.Domain.Entities;
using TejarhStore.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace TejarhStore.Web.Controllers;

[Authorize]
public class CheckoutController : Controller
{
    private readonly CartService _cartService;
    private readonly IApplicationDbContext _context;
    private readonly ZarinpalService _zarinpal;

    public CheckoutController(CartService cartService, IApplicationDbContext context, ZarinpalService zarinpal)
    {
        _cartService = cartService;
        _context = context;
        _zarinpal = zarinpal;
    }

    [HttpGet]
    public IActionResult Index()
    {
        var cart = _cartService.GetCart();
        if (cart.Count == 0) return RedirectToAction("Index", "Cart");

        ViewBag.Total = _cartService.GetTotal();
        return View(cart);
    }

    [HttpPost]
    public async Task<IActionResult> Pay(string address, string phone)
    {
        var cart = _cartService.GetCart();
        if (cart.Count == 0) return RedirectToAction("Index", "Cart");

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var total = _cartService.GetTotal();

        var order = new Order
        {
            UserId = userId,
            TotalAmount = total,
            Status = "Pending",
            ShippingAddress = address,
            ShippingPhone = phone,
            Items = cart.Select(c => new OrderItem
            {
                ProductId = c.ProductId,
                ProductTitle = c.Title,
                UnitPrice = c.Price,
                Quantity = c.Quantity
            }).ToList()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var (success, authority, error) = await _zarinpal.RequestPaymentAsync(total, $"سفارش شماره {order.Id}");

        if (!success)
        {
            order.Status = "Failed";
            await _context.SaveChangesAsync();
            TempData["Error"] = error;
            return RedirectToAction(nameof(Index));
        }

        order.Authority = authority;
        await _context.SaveChangesAsync();

        return Redirect(_zarinpal.GetPaymentUrl(authority));
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(string Authority, string Status)
    {
        var order = _context.Orders.FirstOrDefault(o => o.Authority == Authority);
        if (order == null) return NotFound();

        if (Status != "OK")
        {
            order.Status = "Cancelled";
            await _context.SaveChangesAsync();
            return View("Failed");
        }

        var (success, refId) = await _zarinpal.VerifyPaymentAsync(Authority, order.TotalAmount);

        if (success)
        {
            order.Status = "Paid";
            order.RefId = refId;
            await _context.SaveChangesAsync();
            _cartService.ClearCart();
            return View("Success", order);
        }

        order.Status = "Failed";
        await _context.SaveChangesAsync();
        return View("Failed");
    }
}
