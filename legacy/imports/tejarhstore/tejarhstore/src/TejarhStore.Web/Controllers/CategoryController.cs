using TejarhStore.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TejarhStore.Web.Controllers;

public class CategoryController : Controller
{
    private readonly IApplicationDbContext _context;
    private const int PageSize = 12;

    public CategoryController(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IActionResult> Index(
        string slug,
        int page = 1,
        decimal? minPrice = null,
        decimal? maxPrice = null,
        int? brandId = null,
        string sort = "newest")
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Slug == slug);

        if (category == null) return NotFound();

        var subCategoryIds = await _context.Categories
            .Where(c => c.ParentCategoryId == category.Id)
            .Select(c => c.Id)
            .ToListAsync();
        subCategoryIds.Add(category.Id);

        var query = _context.Products
            .Include(p => p.Brand)
            .Include(p => p.Images)
            .Where(p => subCategoryIds.Contains(p.CategoryId));

        if (minPrice.HasValue)
            query = query.Where(p => p.Price >= minPrice.Value);
        if (maxPrice.HasValue)
            query = query.Where(p => p.Price <= maxPrice.Value);
        if (brandId.HasValue)
            query = query.Where(p => p.BrandId == brandId.Value);

        query = sort switch
        {
            "price_asc" => query.OrderBy(p => p.Price),
            "price_desc" => query.OrderByDescending(p => p.Price),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)PageSize);

        var products = await query
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync();

        var availableBrands = await _context.Brands
            .Where(b => b.Products.Any(p => subCategoryIds.Contains(p.CategoryId)))
            .ToListAsync();

        ViewBag.Category = category;
        ViewBag.Brands = availableBrands;
        ViewBag.CurrentPage = page;
        ViewBag.TotalPages = totalPages;
        ViewBag.Sort = sort;

        return View(products);
    }
}
