namespace SmartScreen.Api.Dtos;

public record DashboardDto(int ScreensTotal, int ScreensOnline, int MediaCount, int PlaylistCount, int ProductCount, List<ScreenDto> Screens);
