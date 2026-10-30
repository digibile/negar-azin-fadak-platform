using TejarhStore.Domain.Entities;

namespace TejarhStore.Infrastructure.Persistence;

public static class DbInitializer
{
    public static void Seed(ApplicationDbContext context)
    {
        if (!context.Users.Any())
        {
            context.Users.Add(new AppUser
            {
                FullName = "مدیر سایت",
                Email = "admin@tejarh.ir",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
                Role = "Admin"
            });
            context.SaveChanges();
        }

        if (context.Products.Any()) return;

        var category = new Category { Name = "موبایل و تبلت", Slug = "mobile" };
        var brand = new Brand { Name = "نامشخص" };

        context.Categories.Add(category);
        context.Brands.Add(brand);
        context.SaveChanges();

        context.Products.AddRange(
            new Product { Title = "گوشی نمونه ۱", Slug = "sample-1", Description = "توضیحات محصول", Price = 15000000, StockQuantity = 10, CategoryId = category.Id, BrandId = brand.Id },
            new Product { Title = "گوشی نمونه ۲", Slug = "sample-2", Description = "توضیحات محصول", Price = 22000000, StockQuantity = 5, CategoryId = category.Id, BrandId = brand.Id },
            new Product { Title = "هدفون نمونه", Slug = "sample-3", Description = "توضیحات محصول", Price = 3500000, StockQuantity = 20, CategoryId = category.Id, BrandId = brand.Id }
        );
        context.SaveChanges();
    }
}
