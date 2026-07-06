"""Country and bidding-zone registry for the multi-country design.

Zones with data_mode="live" are ingested from real APIs (pipelines/jobs).
Zones with data_mode="sample" run on seeded/synthetic data until a real
adapter is connected (see docs/multi_country_design.md).
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Zone:
    code: str
    name: str
    data_mode: str  # "live" | "sample"
    currency: str = "EUR"
    # Baseline shape parameters used by the synthetic fallback generator.
    base_price: float = 70.0
    volatility: float = 1.0


@dataclass(frozen=True)
class Country:
    code: str
    name: str
    timezone: str
    zones: list[Zone] = field(default_factory=list)


COUNTRIES: dict[str, Country] = {
    "DK": Country(
        code="DK",
        name="Denmark",
        timezone="Europe/Copenhagen",
        zones=[
            Zone(code="DK1", name="West Denmark", data_mode="live", base_price=68.0, volatility=1.2),
            Zone(code="DK2", name="East Denmark", data_mode="live", base_price=74.0, volatility=1.1),
        ],
    ),
    "DE": Country(
        code="DE",
        name="Germany",
        timezone="Europe/Berlin",
        zones=[
            Zone(code="DE-LU", name="Germany-Luxembourg", data_mode="sample", base_price=82.0, volatility=1.3),
        ],
    ),
    "US": Country(
        code="US",
        name="United States",
        timezone="America/Chicago",
        zones=[
            Zone(code="ERCOT", name="Texas (ERCOT)", data_mode="sample", currency="USD", base_price=45.0, volatility=1.8),
        ],
    ),
    "JP": Country(
        code="JP",
        name="Japan",
        timezone="Asia/Tokyo",
        zones=[
            Zone(code="JP-TK", name="Tokyo (JEPX)", data_mode="sample", currency="JPY", base_price=90.0, volatility=0.9),
        ],
    ),
}


def get_zone(country_code: str, zone_code: str) -> Zone | None:
    country = COUNTRIES.get(country_code.upper())
    if not country:
        return None
    for zone in country.zones:
        if zone.code.upper() == zone_code.upper():
            return zone
    return None
