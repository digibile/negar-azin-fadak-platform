using TejarhStore.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TejarhStore.Web.Controllers.Api;

[ApiController]
[Route("api/products")]
public class ProductsApiController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ProductsApiController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(int page = 1, int pageSize = 12)
    {
        var totalCount = await _context.Products.CountAsync();

        var products = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Images)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Price,
                p.DiscountPrice,
                p.StockQuantity,
                Category = p.Category.Name,
                Brand = p.Brand.Name,
                Images = p.Images.Select(i => i.Url)
            })
            .ToListAsync();

        return Ok(new
        {
            totalCount,
            page,
            pageSize,
            items = products
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Images)
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Description,
                p.Price,
                p.DiscountPrice,
                p.StockQuantity,
                Category = p.Category.Name,
                Brand = p.Brand.Name,
                Images = p.Images.Select(i => i.Url)
            })
            .FirstOrDefaultAsync();

        if (product == null) return NotFound();
        return Ok(product);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(string q)
    {
        var products = await _context.Products
            .Where(p => p.Title.Contains(q ?? ""))
            .Select(p => new { p.Id, p.Title, p.Slug, p.Price })
            .Take(20)
            .ToListAsync();

        return Ok(products);
    }
}
