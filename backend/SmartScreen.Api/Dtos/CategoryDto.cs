namespace SmartScreen.Api.Dtos;

public record CategoryDto(int Id, string Name, int SortOrder, List<ProductsDto> Products);
