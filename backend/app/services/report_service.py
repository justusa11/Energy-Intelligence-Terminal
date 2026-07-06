"""Daily market report and weekly savings report (markdown + sections)."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.schemas.reports import ReportResponse, ReportSection
from app.services.flexibility_service import get_flexibility_schedule
from app.services.forecast_service import get_price_forecast
from app.services.market_service import get_market_overview
from app.services.risk_service import get_risk_status
from app.services.screener_service import get_screener_opportunities
from app.services.simulator_service import run_backtest


def build_daily_report(
    db: Session, *, country: str = "DK", zone: str = "DK1"
) -> ReportResponse:
    now = datetime.now(timezone.utc)
    overview = get_market_overview(db, country=country, zone=zone)
    screener = get_screener_opportunities(db, country=country, zone=zone)
    forecast = get_price_forecast(db, country=country, zone=zone)
    risk = get_risk_status(db, country=country, zone=zone)
    flex = get_flexibility_schedule(db, country=country, zone=zone)

    sections = [
        ReportSection(
            title="Market summary",
            body=(
                f"{zone} average {overview.average_price_eur_mwh:.1f} EUR/MWh, peak "
                f"{overview.peak_price_eur_mwh:.1f} EUR/MWh. Regime: "
                f"{overview.market_regime} (confidence {overview.regime_confidence:.0%})."
            ),
        ),
        ReportSection(
            title="Price windows",
            body=(
                "Cheapest hours: "
                + ", ".join(f"{h.hour} ({h.price_eur_mwh:.0f})" for h in screener.cheapest_hours)
                + ". Most expensive: "
                + ", ".join(
                    f"{h.hour} ({h.price_eur_mwh:.0f})" for h in screener.most_expensive_hours
                )
                + f". Spread {screener.price_spread_eur_mwh:.0f} EUR/MWh."
            ),
        ),
        ReportSection(
            title="Forecast",
            body=(
                f"Model {forecast.model}, backtest MAE {forecast.metrics.mae:.1f} / RMSE "
                f"{forecast.metrics.rmse:.1f} EUR/MWh over {forecast.metrics.sample_hours} hours."
            ),
        ),
        ReportSection(
            title="Recommended actions",
            body=overview.recommendation + " " + flex.summary,
        ),
        ReportSection(
            title="Risk status",
            body=f"Overall {risk.status}. "
            + "; ".join(f"{c.name}: {c.status}" for c in risk.checks),
        ),
    ]

    title = f"Daily Energy Market Report — {zone} — {now:%Y-%m-%d}"
    return ReportResponse(
        report_type="daily",
        country=country,
        zone=zone,
        generated_at_utc=now,
        title=title,
        markdown=_to_markdown(title, sections),
        sections=sections,
    )


def build_weekly_savings_report(
    db: Session, *, country: str = "DK", zone: str = "DK1"
) -> ReportResponse:
    now = datetime.now(timezone.utc)
    flex = get_flexibility_schedule(db, country=country, zone=zone)
    sim = run_backtest(db, country=country, zone=zone, days=7)

    weekly_flex_savings = flex.estimated_savings_eur * 7

    sections = [
        ReportSection(
            title="Flexibility savings",
            body=(
                f"Estimated {flex.estimated_savings_eur:.2f} EUR/day from load shifting "
                f"and storage — about {weekly_flex_savings:.2f} EUR for the week."
            ),
        ),
        ReportSection(
            title="Storage strategy backtest",
            body=(
                f"{sim.strategy} over {sim.days_simulated} days: total "
                f"{sim.total_profit_eur:.2f} EUR, average {sim.average_daily_profit_eur:.2f} "
                f"EUR/day (battery {sim.battery_capacity_kwh:.0f} kWh)."
            ),
        ),
        ReportSection(
            title="Method",
            body=(
                "Savings compare optimized schedules against flat consumption at the "
                "daily average price. Backtests use stored day-ahead prices "
                f"(data source: {sim.data_source})."
            ),
        ),
    ]

    title = f"Weekly Savings Report — {zone} — week of {now:%Y-%m-%d}"
    return ReportResponse(
        report_type="weekly_savings",
        country=country,
        zone=zone,
        generated_at_utc=now,
        title=title,
        markdown=_to_markdown(title, sections),
        sections=sections,
    )


def _to_markdown(title: str, sections: list[ReportSection]) -> str:
    lines = [f"# {title}", ""]
    for section in sections:
        lines += [f"## {section.title}", "", section.body, ""]
    return "\n".join(lines)
