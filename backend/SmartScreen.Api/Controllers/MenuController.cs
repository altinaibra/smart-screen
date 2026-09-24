using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartScreen.Api.Data;
using SmartScreen.Api.Dtos;
using SmartScreen.Api.Models;
using SmartScreen.Api.Services;

namespace SmartScreen.Api.Controllers;

/// <summary>Kategoritë dhe produktet (ushqimet, pijet, çmimet) që shfaqen në slide-t e menusë.</summary>
[ApiController]
[Route("api/menu")]
[Authorize]
public class MenuController(AppDbContext db) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<List<CategoryDto>> GetCategories()
    {
        var categories = await db.MenuCategories.AsNoTracking()
            .Include(c => c.Products).ThenInclude(p => p.ImageAsset)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync();
        return categories.Select(c => c.ToDto()).ToList();
    }

    [HttpPost("categories")]
    public async Task<ActionResult<CategoryDto>> CreateCategory(SaveCategoryRequest req)
    {
        var category = new MenuCategory { Name = req.Name.Trim(), SortOrder = req.SortOrder };
        db.MenuCategories.Add(category);
        await db.SaveChangesAsync();
        return category.ToDto();
    }

    [HttpPut("categories/{id:int}")]
    public async Task<ActionResult<CategoryDto>> UpdateCategory(int id, SaveCategoryRequest req)
    {
        var category = await db.MenuCategories.Include(c => c.Products).ThenInclude(p => p.ImageAsset)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (category is null) return NotFound();
        category.Name = req.Name.Trim();
        category.SortOrder = req.SortOrder;
        await db.SaveChangesAsync();
        return category.ToDto();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await db.MenuCategories.FindAsync(id);
        if (category is null) return NotFound();
        db.MenuCategories.Remove(category);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductDto>> CreateProduct(SaveProductRequest req)
    {
        var error = await ValidateAsync(req);
        if (error is not null) return BadRequest(new { message = error });

        var product = new Products();
        Apply(product, req);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return await LoadProductAsync(product.Id);
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ProductDto>> UpdateProduct(int id, SaveProductRequest req)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        var error = await ValidateAsync(req);
        if (error is not null) return BadRequest(new { message = error });

        Apply(product, req);
        await db.SaveChangesAsync();
        return await LoadProductAsync(id);
    }

    /// <summary>Shëno shpejt një produkt si "i mbaruar" / "në dispozicion".</summary>
    [HttpPatch("products/{id:int}/availability")]
    public async Task<IActionResult> SetAvailability(int id, SetAvailabilityRequest req)
    {
        var updated = await db.Products.Where(p => p.Id == id)
            .ExecuteUpdateAsync(u => u.SetProperty(p => p.IsAvailable, req.IsAvailable));
        return updated == 0 ? NotFound() : NoContent();
    }

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ValidateAsync(SaveProductRequest req)
    {
        if (!await db.MenuCategories.AnyAsync(c => c.Id == req.CategoryId))
            return "Kategoria nuk ekziston.";
        if (req.ImageAssetId is int img && !await db.MediaAssets.AnyAsync(m => m.Id == img && m.Type == MediaType.Image))
            return "Foto e zgjedhur nuk ekziston.";
        if (req.OldPrice is < 0)
            return "Çmimi i vjetër nuk mund të jetë negativ.";
        return null;
    }

    private static void Apply(Products p, SaveProductRequest req)
    {
        p.CategoryId = req.CategoryId;
        p.Name = req.Name.Trim();
        p.Description = req.Description?.Trim();
        p.Price = req.Price;
        p.OldPrice = req.OldPrice;
        p.ImageAssetId = req.ImageAssetId;
        p.IsAvailable = req.IsAvailable;
        p.IsFeatured = req.IsFeatured;
        p.SortOrder = req.SortOrder;
    }

    private async Task<ProductDto> LoadProductAsync(int id) =>
        (await db.Products.AsNoTracking().Include(p => p.ImageAsset).FirstAsync(p => p.Id == id)).ToDto();
}
