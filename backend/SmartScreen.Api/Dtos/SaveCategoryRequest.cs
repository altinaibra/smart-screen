using System.ComponentModel.DataAnnotations;

namespace SmartScreen.Api.Dtos;

public record SaveCategoryRequest([Required, MaxLength(100)] string Name, int SortOrder);
