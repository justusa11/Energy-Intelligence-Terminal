"""Baseline day-ahead price forecasting and market-regime classification.

Model: ridge-regularized linear regression on calendar + lag features,
solved in pure Python (feature matrix is tiny, no numpy/sklearn needed).
Falls back to a seasonal-naive forecast when history is too short.
Metrics (MAE/RMSE) come from a holdout backtest on the most recent day.
"""

import math
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.schemas.forecast import (
    ForecastMetrics,
    ForecastPoint,
    ForecastResponse,
    MarketRegime,
)
from app.services.price_data import PriceSeries, load_price_series

HISTORY_HOURS = 24 * 14
MIN_TRAINING_HOURS = 72
RIDGE_LAMBDA = 1.0


def get_price_forecast(
    db: Session,
    *,
    country: str = "DK",
    zone: str = "DK1",
    horizon_hours: int = 24,
) -> ForecastResponse:
    series = load_price_series(db, country=country, zone=zone, hours=HISTORY_HOURS)
    prices = series.prices

    if len(prices) >= MIN_TRAINING_HOURS:
        model_name = "ridge_regression_v1"
        weights = _fit(prices[:-24], lam=RIDGE_LAMBDA)
        holdout_pred = _predict_window(prices[:-24], weights, 24, series.points[-24].timestamp_utc)
        metrics = _score(holdout_pred, prices[-24:])
        forecast_values = _predict_window(
            prices, weights, horizon_hours, _next_hour(series)
        )
    else:
        model_name = "seasonal_naive"
        forecast_values = _seasonal_naive(prices, horizon_hours, country, zone)
        holdout = prices[-24:] if len(prices) >= 48 else []
        metrics = (
            _score(prices[-48:-24], holdout)
            if holdout
            else ForecastMetrics(mae=0.0, rmse=0.0, sample_hours=0)
        )

    start = _next_hour(series)
    points = [
        ForecastPoint(
            target_time_utc=start + timedelta(hours=i),
            predicted_price_eur_mwh=round(v, 2),
        )
        for i, v in enumerate(forecast_values)
    ]

    regime = classify_regime(prices[-48:] if len(prices) >= 48 else prices)
    confidence, drivers, feature_summary = _forecast_confidence(
        model_name=model_name,
        series=series,
        metrics=metrics,
        history_hours=len(prices),
    )

    return ForecastResponse(
        country=country,
        zone=zone,
        model=model_name,
        data_source=series.source,
        confidence=confidence,
        drivers=drivers,
        feature_summary=feature_summary,
        generated_at_utc=datetime.now(timezone.utc),
        metrics=metrics,
        regime=regime,
        points=points,
    )


def classify_regime(prices: list[float]) -> MarketRegime:
    """Rule-based market regimes: normal / surplus / scarcity / volatile."""
    if not prices:
        return MarketRegime(
            name="unknown", confidence=0.0, drivers=["No price data available."]
        )

    mean = sum(prices) / len(prices)
    std = math.sqrt(sum((p - mean) ** 2 for p in prices) / len(prices))
    spread = max(prices) - min(prices)
    negative_hours = sum(1 for p in prices if p < 0)
    high_hours = sum(1 for p in prices if p > 150)

    drivers: list[str] = []

    if std > 45 or (mean > 0 and std / mean > 0.6):
        drivers.append(f"High price dispersion (std {std:.0f} EUR/MWh).")
        return MarketRegime(name="volatile", confidence=_conf(std, 45, 90), drivers=drivers)

    if negative_hours >= 2 or mean < 25:
        drivers.append(f"{negative_hours} negative-price hours, mean {mean:.0f} EUR/MWh.")
        drivers.append("Renewable surplus is likely depressing prices.")
        return MarketRegime(
            name="surplus", confidence=_conf(25 - min(mean, 25) + negative_hours * 10, 5, 40), drivers=drivers
        )

    if high_hours >= 3 or mean > 120:
        drivers.append(f"{high_hours} hours above 150 EUR/MWh, mean {mean:.0f} EUR/MWh.")
        drivers.append("Tight supply conditions detected.")
        return MarketRegime(
            name="scarcity", confidence=_conf(mean - 120 + high_hours * 10, 10, 80), drivers=drivers
        )

    drivers.append(f"Mean {mean:.0f} EUR/MWh, spread {spread:.0f} EUR/MWh within normal bands.")
    return MarketRegime(name="normal", confidence=0.75, drivers=drivers)


# --- internals -----------------------------------------------------------


def _conf(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0.6
    scaled = 0.6 + 0.35 * (value - low) / (high - low)
    return round(min(0.95, max(0.6, scaled)), 2)


def _next_hour(series: PriceSeries) -> datetime:
    if series.points:
        return series.points[-1].timestamp_utc + timedelta(hours=1)
    return datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)


def _features(history: list[float], step: int, hour_of_day: int) -> list[float]:
    """Feature vector for one target hour: calendar harmonics + lags.

    `history` ends at the hour immediately before the target, so a fixed
    negative index always points the same distance back. During multi-step
    prediction the caller appends each prediction to `history`, so these
    lags stay aligned to the moving target without any step offset.
    """
    lag_24 = history[-24] if len(history) >= 24 else (history[-1] if history else 0.0)
    lag_168 = history[-168] if len(history) >= 168 else lag_24
    rolling_24 = sum(history[-24:]) / min(len(history), 24) if history else 0.0

    angle = 2 * math.pi * hour_of_day / 24
    return [
        1.0,
        math.sin(angle),
        math.cos(angle),
        math.sin(2 * angle),
        math.cos(2 * angle),
        lag_24,
        lag_168,
        rolling_24,
    ]


def _fit(prices: list[float], lam: float) -> list[float]:
    """Ridge regression via normal equations + Gaussian elimination."""
    rows: list[list[float]] = []
    targets: list[float] = []

    for t in range(168, len(prices)):
        history = prices[:t]
        rows.append(_features(history, 0, t % 24))
        targets.append(prices[t])

    if not rows:  # not enough history; intercept-only model
        mean = sum(prices) / len(prices) if prices else 0.0
        return [mean, 0, 0, 0, 0, 0, 0, 0]

    n = len(rows[0])
    xtx = [[lam if i == j else 0.0 for j in range(n)] for i in range(n)]
    xty = [0.0] * n
    for row, y in zip(rows, targets):
        for i in range(n):
            xty[i] += row[i] * y
            for j in range(n):
                xtx[i][j] += row[i] * row[j]

    return _solve(xtx, xty)


def _solve(a: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]

    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot] = m[pivot], m[col]
        if abs(m[col][col]) < 1e-12:
            continue
        for r in range(n):
            if r != col:
                factor = m[r][col] / m[col][col]
                for c in range(col, n + 1):
                    m[r][c] -= factor * m[col][c]

    return [m[i][n] / m[i][i] if abs(m[i][i]) > 1e-12 else 0.0 for i in range(n)]


def _predict_window(
    history: list[float], weights: list[float], horizon: int, start_time: datetime
) -> list[float]:
    working = history[:]
    out: list[float] = []
    for step in range(horizon):
        hour = (start_time + timedelta(hours=step)).hour
        x = _features(working, step, hour)
        pred = sum(w * xi for w, xi in zip(weights, x))
        out.append(pred)
        working.append(pred)
    return out


def _seasonal_naive(
    prices: list[float], horizon: int, country: str, zone: str
) -> list[float]:
    if len(prices) >= 24:
        last_day = prices[-24:]
        return [last_day[i % 24] for i in range(horizon)]

    from app.services.price_data import generate_sample_series

    sample = generate_sample_series(country=country, zone=zone, hours=horizon)
    return sample.prices


def _score(predicted: list[float], actual: list[float]) -> ForecastMetrics:
    n = min(len(predicted), len(actual))
    if n == 0:
        return ForecastMetrics(mae=0.0, rmse=0.0, sample_hours=0)
    errors = [predicted[i] - actual[i] for i in range(n)]
    mae = sum(abs(e) for e in errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    return ForecastMetrics(mae=round(mae, 2), rmse=round(rmse, 2), sample_hours=n)


def _forecast_confidence(
    *,
    model_name: str,
    series: PriceSeries,
    metrics: ForecastMetrics,
    history_hours: int,
) -> tuple[float, list[str], dict[str, str | int | float]]:
    score = 0.5
    drivers: list[str] = []

    if series.source == "database":
        score += 0.2
        drivers.append("Stored market prices are available for this zone.")
    else:
        score -= 0.12
        drivers.append("Forecast is using deterministic sample price curves.")

    if history_hours >= HISTORY_HOURS:
        score += 0.12
        drivers.append("Two weeks of hourly history are available.")
    elif history_hours >= MIN_TRAINING_HOURS:
        score += 0.06
        drivers.append("Enough history exists for the regression baseline.")
    else:
        score -= 0.1
        drivers.append("History is short, so the model falls back to seasonal behavior.")

    if metrics.sample_hours >= 24 and metrics.mae <= 20:
        score += 0.08
        drivers.append(f"Recent backtest error is controlled at {metrics.mae:.1f} EUR/MWh MAE.")
    elif metrics.sample_hours > 0:
        drivers.append(f"Recent backtest error is {metrics.mae:.1f} EUR/MWh MAE.")
    else:
        score -= 0.08
        drivers.append("No holdout backtest sample is available yet.")

    if model_name == "ridge_regression_v1":
        score += 0.04
        drivers.append("Model uses hour-of-day and lagged price features.")

    feature_summary: dict[str, str | int | float] = {
        "price_source": series.source,
        "history_hours": history_hours,
        "model": model_name,
        "calendar_features": "hour_of_day",
        "lag_features": "24h,168h,rolling_24h",
        "backtest_mae": metrics.mae,
    }
    return round(min(0.95, max(0.2, score)), 2), drivers, feature_summary
