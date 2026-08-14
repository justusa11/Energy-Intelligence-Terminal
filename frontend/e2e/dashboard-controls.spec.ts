import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("topbar controls and market scope update the dashboard", async ({ page }) => {
  await page.goto("/dashboard/market-cockpit");

  await expect(page.getByRole("heading", { name: "Market Cockpit" })).toBeVisible();
  await expect(page.locator("header").getByLabel("Bidding zone")).toHaveValue("DK1");
  await expect(page.locator("header").getByText("Live-capable zone")).toBeVisible();

  await page.locator("header").getByLabel("Bidding zone").selectOption("DK2");
  await expect(page.locator("header").getByLabel("Bidding zone")).toHaveValue("DK2");

  const dateButton = page.getByLabel("Cycle market date");
  await expect(dateButton).toContainText("Today");
  await dateButton.click();
  await expect(dateButton).not.toContainText("Today");

  await page.getByLabel("Notifications").click();
  await expect(page.getByText("DK2 evening price spike risk")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("flextrade-context-DK2");

  await page.locator("header").getByLabel("Country").selectOption("DE");
  await expect(page.locator("header").getByLabel("Bidding zone")).toHaveValue("DE-LU");
  await expect(page.locator("header").getByText("Sample zone")).toBeVisible();
});

test("infrastructure map controls are clickable", async ({ page }) => {
  await page.goto("/dashboard/infrastructure-map");

  await expect(page.getByRole("heading", { name: "Global Grid Cockpit" })).toBeVisible();
  await page.getByRole("button", { name: "Jump map to Europe" }).click();
  await page.getByRole("button", { name: "Jump map to Global" }).click();
  await page.getByRole("button", { name: "Use Dark basemap" }).click();
  await page.getByRole("button", { name: "Show Flows grid layer" }).click();
  await page.getByRole("button", { name: "Use 1DA timeline" }).click();
  await page.getByRole("button", { name: "Power plant" }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();

  await expect(page.getByText("Grid Inspector")).toBeVisible();
});

test("infrastructure map supports mouse wheel zoom", async ({ page }) => {
  await page.goto("/dashboard/infrastructure-map");

  const map = page.getByLabel("Global vector basemap with animated energy infrastructure assets");
  await expect(page.getByText(/zoom 6/)).toBeVisible();
  await map.hover();
  await page.mouse.wheel(0, -500);
  await expect(page.getByText(/zoom 7/)).toBeVisible();
  await page.mouse.wheel(0, 500);
  await expect(page.getByText(/zoom 6/)).toBeVisible();
});

test("infrastructure map exposes operator-grade fleet controls", async ({ page }) => {
  await page.goto("/dashboard/infrastructure-map");

  await expect(page.getByText("Fuel mix")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuclear", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wind", exact: true })).toBeVisible();
  await expect(page.getByLabel("Country filter")).toContainText("France");
  await expect(page.getByLabel("Country filter")).toContainText("Germany");
  await expect(page.getByLabel("Country filter")).toContainText("United States");
  await expect(page.getByLabel("Country filter")).toContainText("Japan");

  await page.getByRole("button", { name: "Nuclear", exact: true }).click();
  await expect(page.getByText("2,000 MW nuclear")).toBeVisible();

  await page.getByLabel("Country filter").selectOption("DK");
  await expect(page.getByRole("button", { name: "Select plant Horns Rev 3" })).toBeVisible();
  await expect(page.getByText("France Nuclear Plant")).not.toBeVisible();
});

test("market cockpit keeps core decision and risk surfaces visible", async ({ page }) => {
  await page.goto("/dashboard/market-cockpit");

  await expect(page.getByRole("heading", { name: "Decision Workflow" })).toBeVisible();
  await expect(page.getByText("1. Data status")).toBeVisible();
  await expect(page.getByText("5. Expected value")).toBeVisible();
  await expect(page.getByText("Hourly Price Forecast")).toBeVisible();
  await expect(page.getByText("AI Recommendation")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Price Signal Windows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Risk Monitor" })).toBeVisible();
});

test("weather page stays focused on weather measurements", async ({ page }) => {
  await page.goto("/dashboard/weather");

  await expect(page.getByRole("heading", { name: "Weather Intelligence" })).toBeVisible();
  await expect(page.getByText("Avg Temp")).toBeVisible();
  await expect(page.getByText("Avg Wind (100m)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hourly Weather" })).toBeVisible();
});

test("risk page exposes ingestion operations and repair commands", async ({ page }) => {
  await page.goto("/dashboard/risk");

  await expect(page.getByRole("heading", { name: "Ingestion Operations" })).toBeVisible();
  await expect(page.getByText("Energi Data Service")).toBeVisible();
  await expect(page.getByText("Open-Meteo")).toBeVisible();
  await expect(page.getByText("ENTSO-E", { exact: true })).toBeVisible();
  await expect(page.getByText("Price Ingestion")).toBeVisible();
  await expect(page.getByText("Plant Registry", { exact: true })).toBeVisible();
  await expect(page.getByText("python backend/pipelines/jobs/ingest_european_power_plants.py")).toBeVisible();
});

test("power prices explains zone prices and supports operator actions", async ({ page }) => {
  await page.goto("/dashboard/power-prices");

  await expect(page.getByRole("heading", { name: "Power Prices" })).toBeVisible();
  await expect(page.getByText("DK1 price risk is elevated between 17:00 and 20:00.")).toBeVisible();
  await expect(page.getByText("Cheap window")).toBeVisible();
  await expect(page.getByText("Expensive window")).toBeVisible();
  await expect(page.getByText("Trust gate")).toBeVisible();
  await expect(page.getByText("Data source", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Select 17:00 price/ }).click();
  await expect(page.getByText("Selected hour: 17:00")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export price CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("power-prices-DK1");

  await page.getByRole("main").getByLabel("Bidding zone").selectOption("DK2");
  await expect(page.getByText("DK2 price risk is elevated between 17:00 and 20:00.")).toBeVisible();
});

async function mockApi(page: Page) {
  await page.route(/.*market\/overview.*/, async (route) => {
    const url = new URL(route.request().url());
    const country = url.searchParams.get("country") ?? "DK";
    const zone = url.searchParams.get("zone") ?? "DK1";

    await route.fulfill({
      json: {
        country,
        zone,
        average_price_eur_mwh: zone === "DK2" ? 72.4 : 68.2,
        peak_price_eur_mwh: zone === "DK2" ? 118.6 : 111.3,
        cheapest_hour: "03:00-04:00",
        market_regime: "normal",
        regime_confidence: 0.82,
        risk_status: "SAFE",
        recommendation: `${zone} — mocked recommendation`,
      },
    });
  });

  await page.route(/.*prices\/day-ahead.*/, async (route) => {
    const url = new URL(route.request().url());
    const zone = url.searchParams.get("zone") ?? "DK1";
    await route.fulfill({
      json: {
        country: "DK",
        zone,
        market: "day_ahead",
        unit: "EUR/MWh",
        data_source: "mock",
        prices: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${String(hour).padStart(2, "0")}:00`,
          price_eur_mwh: (zone === "DK2" ? 50 : 45) + (hour >= 17 && hour <= 20 ? 65 : (hour * 7) % 35),
        })),
      },
    });
  });

  await page.route(/.*forecast\/day-ahead.*/, async (route) => {
    const url = new URL(route.request().url());
    const zone = url.searchParams.get("zone") ?? "DK1";
    await route.fulfill({
      json: {
        country: "DK",
        zone,
        model: "mock_forecast",
        data_source: "mock",
        confidence: 0.82,
        drivers: ["Mock driver: evening demand", "Mock driver: low wind"],
        feature_summary: { price_source: "mock", history_hours: 336 },
        generated_at_utc: "2026-08-14T08:00:00Z",
        metrics: { mae: 4.2, rmse: 5.1, sample_hours: 72 },
        regime: {
          name: "elevated",
          confidence: 0.81,
          drivers: ["low wind", "evening demand"],
        },
        points: Array.from({ length: 24 }, (_, hour) => ({
          target_time_utc: `2026-08-14T${String(hour).padStart(2, "0")}:00:00Z`,
          predicted_price_eur_mwh: (zone === "DK2" ? 58 : 52) + (hour >= 17 && hour <= 20 ? 62 : (hour * 5) % 28),
        })),
      },
    });
  });

  await page.route(/.*screener\/opportunities.*/, async (route) => {
    const url = new URL(route.request().url());
    const zone = url.searchParams.get("zone") ?? "DK1";
    await route.fulfill({
      json: {
        country: "DK",
        zone,
        data_source: "mock",
        cheapest_hours: [{ hour: "03:00", price_eur_mwh: zone === "DK2" ? 50 : 45 }],
        most_expensive_hours: [{ hour: "17:00", price_eur_mwh: zone === "DK2" ? 115 : 110 }],
        average_price_eur_mwh: zone === "DK2" ? 72.4 : 68.2,
        price_spread_eur_mwh: 65,
        spike_risk: "medium",
        negative_price_risk: "low",
        opportunities: [
          {
            kind: "load_shift",
            title: "Shift flexible load earlier",
            detail: `${zone} price risk is elevated between 17:00 and 20:00.`,
            severity: "opportunity",
          },
        ],
      },
    });
  });

  await page.route(/.*risk\/status.*/, async (route) => {
    await route.fulfill({
      json: {
        status: "SAFE",
        checks: [{ name: "Mock freshness", status: "OK", severity: "low" }],
      },
    });
  });

  await page.route(/.*risk\/data-quality.*/, async (route) => {
    await route.fulfill({
      json: {
        country: "DK",
        zone: "DK1",
        status: "OK",
        checks: [{ name: "Mock coverage", status: "OK", severity: "low", message: "Mock data loaded." }],
      },
    });
  });

  await page.route(/.*health\/ingestion-status.*/, async (route) => {
    await route.fulfill({
      json: {
        country: "DK",
        zone: "DK1",
        providers: {
          energi_data_service: { configured: true, purpose: "Mock prices" },
          open_meteo: { configured: true, purpose: "Mock weather" },
          entsoe: { configured: false, purpose: "Mock ENTSO-E" },
          ercot: { configured: false, purpose: "Mock ERCOT" },
          jepx: { configured: false, purpose: "Mock JEPX" },
        },
        jobs: {
          price_ingestion: {
            status: "success",
            latest_run_utc: "2026-08-12T00:00:00Z",
            rows_inserted: 24,
            message: "Mock price run",
            repair_command: null,
          },
          weather_ingestion: {
            status: "success",
            latest_run_utc: "2026-08-12T00:00:00Z",
            rows_inserted: 24,
            message: "Mock weather run",
            repair_command: null,
          },
          plant_registry: {
            status: "pending",
            latest_run_utc: null,
            rows_inserted: 0,
            message: "Mock plant registry pending",
            repair_command: "python backend/pipelines/jobs/ingest_european_power_plants.py <csv_path> --source-year 2026",
          },
        },
      },
    });
  });

  await page.route(/.*gis\/assets.*/, async (route) => {
    const url = new URL(route.request().url());
    const isGlobal = url.searchParams.get("region") === "global";
    await route.fulfill({
      json: {
        region: isGlobal ? "global" : "europe",
        data_source: isGlobal ? "mock_global_fleet" : "mock_european_fleet",
        assets: [
          {
            id: "fr-nuclear",
            name: "France Nuclear Plant",
            type: "power_plant",
            lon: 2.1,
            lat: 49.9,
            detail: "nuclear PWR, 2000 MW",
            country: "FR",
            zone: "FR",
            capacity_mw: 2000,
            fuel_type: "nuclear",
            technology: "PWR",
            operator: "EDF",
            status: "operational",
            source: "mock",
          },
          {
            id: "dk-wind",
            name: "Horns Rev 3",
            type: "power_plant",
            lon: 7.85,
            lat: 55.7,
            detail: "wind offshore wind, 407 MW",
            country: "DK",
            zone: "DK1",
            capacity_mw: 407,
            fuel_type: "wind",
            technology: "offshore wind",
            operator: "Vattenfall",
            status: "operational",
            source: "mock",
          },
          {
            id: "de-solar",
            name: "German Solar Park",
            type: "power_plant",
            lon: 13.7,
            lat: 52.6,
            detail: "solar PV, 187 MW",
            country: "DE",
            zone: "DE-LU",
            capacity_mw: 187,
            fuel_type: "solar",
            technology: "PV",
            operator: "EnBW",
            status: "operational",
            source: "mock",
          },
          ...(isGlobal
            ? [
                {
                  id: "ercot-houston",
                  name: "Houston Load and Thermal Hub",
                  type: "power_plant",
                  lon: -95.37,
                  lat: 29.76,
                  detail: "gas CCGT, 4200 MW",
                  country: "US",
                  zone: "ERCOT",
                  capacity_mw: 4200,
                  fuel_type: "gas",
                  technology: "CCGT",
                  operator: "ERCOT participants",
                  status: "operational",
                  source: "mock",
                },
                {
                  id: "jp-futtsu",
                  name: "Futtsu LNG Thermal Power Station",
                  type: "power_plant",
                  lon: 139.82,
                  lat: 35.31,
                  detail: "gas LNG CCGT, 5040 MW",
                  country: "JP",
                  zone: "JP-TK",
                  capacity_mw: 5040,
                  fuel_type: "gas",
                  technology: "LNG CCGT",
                  operator: "JERA",
                  status: "operational",
                  source: "mock",
                },
              ]
            : []),
        ],
        links: [
          {
            id: "fr-dk",
            name: "FR-DK test path",
            from_asset_id: "fr-nuclear",
            to_asset_id: "dk-wind",
            capacity_mw: 800,
            detail: "HVDC corridor",
            source: "mock",
          },
        ],
      },
    });
  });
}
