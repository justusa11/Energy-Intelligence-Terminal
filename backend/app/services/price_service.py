from app.schemas.prices import DayAheadPricesResponse, HourlyPrice


def get_day_ahead_prices(country: str = "DK", zone: str = "DK1") -> DayAheadPricesResponse:
    sample_prices = [
        42.1, 38.5, 31.2, 24.8, 29.0, 45.4,
        72.0, 118.3, 134.1, 96.5, 76.2, 62.4,
        55.1, 49.8, 58.2, 83.0, 122.4, 158.4,
        176.2, 149.7, 101.3, 75.5, 58.0, 46.2,
    ]

    return DayAheadPricesResponse(
        country=country,
        zone=zone,
        market="day_ahead",
        unit="EUR/MWh",
        prices=[
            HourlyPrice(hour=f"{hour:02d}:00", price_eur_mwh=price)
            for hour, price in enumerate(sample_prices)
        ],
    )