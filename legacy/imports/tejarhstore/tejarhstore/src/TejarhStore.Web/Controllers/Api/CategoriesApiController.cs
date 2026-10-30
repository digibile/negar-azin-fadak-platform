using TejarhStore.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TejarhStore.Web.Controllers.Api;

[ApiController]
[Route("api/categories")]
public class CategoriesApiController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public CategoriesApiController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories
            .Where(c => c.ParentCategoryId == null)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Slug,
                c.IconUrl,
                SubCategories = c.SubCategories.Select(sc => new { sc.Id, sc.Name, sc.Slug })
            })
            .ToListAsync();

        return Ok(categories);
    }
}
