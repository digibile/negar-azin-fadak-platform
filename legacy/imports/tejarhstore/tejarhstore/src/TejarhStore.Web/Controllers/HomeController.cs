using TejarhStore.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TejarhStore.Web.Controllers;

public class HomeController : Controller
{
    private readonly IApplicationDbContext _context;

    public HomeController(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IActionResult> Index()
    {
        var products = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .OrderByDescending(p => p.CreatedAt)
            .Take(12)
            .ToListAsync();

        return View(products);
    }

    public async Task<IActionResult> Search(string q)
    {
        var products = await _context.Products
            .Where(p => p.Title.Contains(q ?? ""))
            .Take(24)
            .ToListAsync();

        return View("Index", products);
    }
}
