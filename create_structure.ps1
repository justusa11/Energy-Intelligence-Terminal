# create_structure.ps1

$dirs = @(
  "docs",

  "frontend/app/dashboard/market-cockpit",
  "frontend/app/dashboard/power-prices",
  "frontend/app/dashboard/gas-carbon",
  "frontend/app/dashboard/weather",
  "frontend/app/dashboard/infrastructure-map",
  "frontend/app/dashboard/screener",
  "frontend/app/dashboard/derivatives",
  "frontend/app/dashboard/flexibility",
  "frontend/app/dashboard/simulator",
  "frontend/app/dashboard/risk",
  "frontend/app/dashboard/advisor",
  "frontend/app/dashboard/reports",
  "frontend/app/login",
  "frontend/app/settings",
  "frontend/components/layout",
  "frontend/components/cards",
  "frontend/components/charts",
  "frontend/components/maps",
  "frontend/components/tables",
  "frontend/components/advisor",
  "frontend/hooks",
  "frontend/lib",
  "frontend/types",
  "frontend/styles",

  "backend/app/core",
  "backend/app/db",
  "backend/app/models",
  "backend/app/schemas",
  "backend/app/api/v1",
  "backend/app/services",
  "backend/app/repositories",
  "backend/app/workers/tasks",
  "backend/app/utils",
  "backend/alembic/versions",
  "backend/tests",

  "pipelines/sources",
  "pipelines/normalizers",
  "pipelines/jobs",
  "pipelines/quality",
  "pipelines/storage",
  "pipelines/configs/countries",
  "pipelines/configs/markets",
  "pipelines/configs/sources",

  "ml/notebooks",
  "ml/features",
  "ml/training",
  "ml/inference",
  "ml/evaluation",
  "ml/registry/models",
  "ml/tests",

  "cloud/vercel",
  "cloud/railway",
  "cloud/supabase",
  "cloud/neon",
  "cloud/cloudflare-r2",
  "cloud/github-actions",
  "cloud/prefect",

  "infrastructure/docker",
  "infrastructure/nginx",
  "infrastructure/scripts",

  "data/raw/prices",
  "data/raw/weather",
  "data/raw/gas_carbon",
  "data/raw/infrastructure",
  "data/processed/features",
  "data/processed/forecasts",
  "data/processed/simulations",
  "data/sample/denmark",
  "data/sample/germany",
  "data/sample/japan",
  "data/sample/united_states",

  "scripts"
)

$files = @(
  "README.md",
  "docker-compose.yml",
  ".env.example",
  ".gitignore",
  "Makefile",

  "docs/architecture.md",
  "docs/api.md",
  "docs/cloud_architecture.md",
  "docs/data_sources.md",
  "docs/database_schema.md",
  "docs/deployment.md",
  "docs/multi_country_design.md",
  "docs/roadmap.md",
  "docs/ui_design.md",

  "frontend/package.json",
  "frontend/tsconfig.json",
  "frontend/next.config.ts",
  "frontend/tailwind.config.ts",
  "frontend/postcss.config.js",
  "frontend/.env.local.example",
  "frontend/app/layout.tsx",
  "frontend/app/page.tsx",
  "frontend/app/dashboard/layout.tsx",
  "frontend/app/dashboard/market-cockpit/page.tsx",
  "frontend/app/dashboard/power-prices/page.tsx",
  "frontend/app/dashboard/gas-carbon/page.tsx",
  "frontend/app/dashboard/weather/page.tsx",
  "frontend/app/dashboard/infrastructure-map/page.tsx",
  "frontend/app/dashboard/screener/page.tsx",
  "frontend/app/dashboard/derivatives/page.tsx",
  "frontend/app/dashboard/flexibility/page.tsx",
  "frontend/app/dashboard/simulator/page.tsx",
  "frontend/app/dashboard/risk/page.tsx",
  "frontend/app/dashboard/advisor/page.tsx",
  "frontend/app/dashboard/reports/page.tsx",
  "frontend/app/login/page.tsx",
  "frontend/app/settings/page.tsx",

  "frontend/components/layout/Sidebar.tsx",
  "frontend/components/layout/Topbar.tsx",
  "frontend/components/layout/PageHeader.tsx",
  "frontend/components/layout/DashboardShell.tsx",

  "frontend/components/cards/MetricCard.tsx",
  "frontend/components/cards/MarketRegimeCard.tsx",
  "frontend/components/cards/RiskStatusCard.tsx",
  "frontend/components/cards/AIRecommendationCard.tsx",
  "frontend/components/cards/DataQualityCard.tsx",

  "frontend/components/charts/HourlyPriceChart.tsx",
  "frontend/components/charts/ForecastVsActualChart.tsx",
  "frontend/components/charts/PriceHeatmap.tsx",
  "frontend/components/charts/GasCarbonChart.tsx",
  "frontend/components/charts/WeatherForecastChart.tsx",
  "frontend/components/charts/FlexibilityScheduleChart.tsx",
  "frontend/components/charts/PnLChart.tsx",

  "frontend/components/maps/EnergyInfrastructureMap.tsx",
  "frontend/components/maps/MapLegend.tsx",
  "frontend/components/maps/RiskMarker.tsx",

  "frontend/components/tables/PriceTable.tsx",
  "frontend/components/tables/ScreenerTable.tsx",
  "frontend/components/tables/FlexibilityScheduleTable.tsx",
  "frontend/components/tables/RiskChecksTable.tsx",
  "frontend/components/tables/SimulationResultsTable.tsx",

  "frontend/components/advisor/ChatPanel.tsx",
  "frontend/components/advisor/MessageBubble.tsx",
  "frontend/components/advisor/SuggestedQuestions.tsx",

  "frontend/hooks/useMarketOverview.ts",
  "frontend/hooks/usePowerPrices.ts",
  "frontend/hooks/useWeather.ts",
  "frontend/hooks/useGasCarbon.ts",
  "frontend/hooks/useForecast.ts",
  "frontend/hooks/useRiskStatus.ts",
  "frontend/hooks/useRecommendations.ts",
  "frontend/hooks/useAdvisor.ts",

  "frontend/lib/api.ts",
  "frontend/lib/constants.ts",
  "frontend/lib/formatters.ts",
  "frontend/lib/utils.ts",

  "frontend/types/market.ts",
  "frontend/types/prices.ts",
  "frontend/types/weather.ts",
  "frontend/types/risk.ts",
  "frontend/types/recommendations.ts",
  "frontend/types/advisor.ts",

  "frontend/styles/globals.css",

  "backend/pyproject.toml",
  "backend/Dockerfile",
  "backend/alembic.ini",
  "backend/.env.example",
  "backend/app/main.py",

  "backend/app/core/config.py",
  "backend/app/core/security.py",
  "backend/app/core/logging.py",
  "backend/app/core/exceptions.py",
  "backend/app/core/country_registry.py",
  "backend/app/core/market_registry.py",
  "backend/app/core/source_registry.py",

  "backend/app/db/session.py",
  "backend/app/db/base.py",
  "backend/app/db/init_db.py",

  "backend/app/api/router.py",
  "backend/app/api/v1/market.py",
  "backend/app/api/v1/prices.py",
  "backend/app/api/v1/weather.py",
  "backend/app/api/v1/gas_carbon.py",
  "backend/app/api/v1/infrastructure.py",
  "backend/app/api/v1/screener.py",
  "backend/app/api/v1/derivatives.py",
  "backend/app/api/v1/flexibility.py",
  "backend/app/api/v1/simulator.py",
  "backend/app/api/v1/risk.py",
  "backend/app/api/v1/advisor.py",
  "backend/app/api/v1/reports.py",
  "backend/app/api/v1/health.py",

  "pipelines/pyproject.toml",
  "pipelines/sources/base_client.py",
  "pipelines/sources/energidataservice_client.py",
  "pipelines/sources/entsoe_client.py",
  "pipelines/sources/open_meteo_client.py",
  "pipelines/sources/dmi_client.py",
  "pipelines/sources/ercot_client.py",
  "pipelines/sources/caiso_client.py",
  "pipelines/sources/pjm_client.py",
  "pipelines/sources/nyiso_client.py",
  "pipelines/sources/jepx_client.py",

  "pipelines/configs/countries/denmark.yaml",
  "pipelines/configs/countries/germany.yaml",
  "pipelines/configs/countries/japan.yaml",
  "pipelines/configs/countries/united_states.yaml",

  "ml/pyproject.toml",
  "ml/notebooks/.gitkeep",
  "ml/features/build_price_features.py",
  "ml/training/train_price_forecast.py",
  "ml/inference/predict_prices.py",
  "ml/evaluation/metrics.py",

  "cloud/README.md",
  "cloud/vercel/deployment.md",
  "cloud/railway/deployment.md",
  "cloud/supabase/setup.md",
  "cloud/neon/setup.md",
  "cloud/cloudflare-r2/bucket_structure.md",

  "infrastructure/docker/backend.Dockerfile",
  "infrastructure/docker/frontend.Dockerfile",
  "infrastructure/docker/worker.Dockerfile",

  "data/sample/denmark/dk1_dk2_prices_sample.csv",
  "data/sample/germany/germany_prices_sample.csv",
  "data/sample/japan/jepx_prices_sample.csv",
  "data/sample/united_states/ercot_prices_sample.csv",

  "scripts/dev_start.sh",
  "scripts/dev_stop.sh",
  "scripts/run_tests.sh"
)

$cloudDirs = @(
  "cloud/vercel",
  "cloud/railway",
  "cloud/render",
  "cloud/supabase",
  "cloud/neon",
  "cloud/cloudflare-r2",
  "cloud/github-actions",
  "cloud/prefect"
)

foreach ($dir in $cloudDirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$cloudFiles = @(
  "cloud/README.md",

  "cloud/vercel/deployment.md",
  "cloud/vercel/environment_variables.md",
  "cloud/vercel/frontend_setup.md",

  "cloud/railway/deployment.md",
  "cloud/railway/environment_variables.md",
  "cloud/railway/backend_setup.md",
  "cloud/railway/cron_jobs.md",

  "cloud/render/deployment.md",
  "cloud/render/backend_setup.md",

  "cloud/supabase/setup.md",
  "cloud/supabase/database_schema.sql",
  "cloud/supabase/auth.md",
  "cloud/supabase/storage.md",

  "cloud/neon/setup.md",
  "cloud/neon/database_connection.md",

  "cloud/cloudflare-r2/bucket_structure.md",
  "cloud/cloudflare-r2/lifecycle_rules.md",
  "cloud/cloudflare-r2/environment_variables.md",

  "cloud/github-actions/ingest-prices.yml",
  "cloud/github-actions/ingest-weather.yml",
  "cloud/github-actions/run-forecasts.yml",
  "cloud/github-actions/deploy-frontend.yml",
  "cloud/github-actions/deploy-backend.yml",

  "cloud/prefect/flows.md",
  "cloud/prefect/deployment.md"
)

foreach ($file in $cloudFiles) {
  New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "Cloud folder structure created." -ForegroundColor Green

foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

foreach ($file in $files) {
  New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "Project folder structure created successfully." -ForegroundColor Green