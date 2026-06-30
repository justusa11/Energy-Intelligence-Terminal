from app.schemas.weather import WeatherForecastResponse


def get_weather_forecast(country: str = "DK", zone: str = "DK1") -> WeatherForecastResponse:
    return WeatherForecastResponse(
        country=country,
        zone=zone,
        temperature_c=15.2,
        wind_speed_ms=6.1,
        solar_radiation_wm2=210.0,
        summary="Moderate wind and mild temperature.",
    )