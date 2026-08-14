MARKET_EVENTS = [
    {
        "id": "eu-gas-supply-shock-2022",
        "name": "European Gas Supply Shock",
        "event_type": "war",
        "start_date": "2022-02-24",
        "end_date": "2023-03-31",
        "severity": "severe",
        "affected_countries": ["DE", "DK", "FR", "NL", "GB"],
        "affected_zones": ["DE-LU", "DK1", "DK2", "FR", "NL", "GB"],
        "commodities": ["power", "gas", "carbon", "coal"],
        "market_impact": [
            "Gas and power forward risk premia widened sharply.",
            "German and Nordic power volatility increased during fuel-security stress.",
            "Storage value increased during evening peak and scarcity hours.",
        ],
        "playbook": [
            "Switch automated recommendations to manual approval mode.",
            "Track gas marks, interconnector constraints, and reserve margins together.",
            "Prioritize storage and demand response for evening peak exposure.",
        ],
        "watch_signals": ["gas_spike", "forward_premium", "power_volatility", "security_of_supply"],
    },
    {
        "id": "ercot-winter-storm-uri-2021",
        "name": "ERCOT Winter Storm Uri",
        "event_type": "weather",
        "start_date": "2021-02-13",
        "end_date": "2021-02-19",
        "severity": "severe",
        "affected_countries": ["US"],
        "affected_zones": ["ERCOT"],
        "commodities": ["power", "gas"],
        "market_impact": [
            "Extreme load and forced outages pushed scarcity pricing to system caps.",
            "Gas deliverability and thermal availability dominated power risk.",
            "Weather-driven outage correlation reduced forecast confidence.",
        ],
        "playbook": [
            "Escalate cold-weather operational checks before automation.",
            "Stress-test storage state of charge and backup supply assumptions.",
            "Alert on simultaneous high load, low reserves, and fuel constraints.",
        ],
        "watch_signals": ["cold_snap", "reserve_margin", "forced_outage", "gas_deliverability"],
    },
    {
        "id": "japan-fukushima-supply-shift-2011",
        "name": "Japan Nuclear Supply Shift",
        "event_type": "outage",
        "start_date": "2011-03-11",
        "end_date": "2012-12-31",
        "severity": "severe",
        "affected_countries": ["JP"],
        "affected_zones": ["JP-TK"],
        "commodities": ["power", "gas", "lng"],
        "market_impact": [
            "Nuclear availability loss increased LNG dependence.",
            "Tokyo-area thermal dispatch became more sensitive to fuel supply.",
            "Peak-demand periods carried higher reliability and cost risk.",
        ],
        "playbook": [
            "Monitor nuclear availability, LNG import constraints, and peak demand together.",
            "Favor conservative dispatch assumptions during restart uncertainty.",
            "Flag LNG-sensitive power moves for manual review.",
        ],
        "watch_signals": ["nuclear_unavailability", "lng_dependency", "peak_demand", "thermal_dispatch"],
    },
    {
        "id": "nord-stream-sabotage-2022",
        "name": "Nord Stream Pipeline Sabotage",
        "event_type": "infrastructure",
        "start_date": "2022-09-26",
        "end_date": "2022-10-31",
        "severity": "elevated",
        "affected_countries": ["DE", "DK", "SE"],
        "affected_zones": ["DE-LU", "DK2", "SE3"],
        "commodities": ["gas", "power"],
        "market_impact": [
            "Infrastructure-security risk increased gas risk premium.",
            "Baltic-area energy assets received elevated operational attention.",
            "Power markets became more reactive to gas headlines and storage levels.",
        ],
        "playbook": [
            "Increase monitoring around gas infrastructure and Baltic interconnectors.",
            "Avoid single-driver price explanations during infrastructure incidents.",
            "Require operator acknowledgement before acting on gas-led power signals.",
        ],
        "watch_signals": ["infrastructure_outage", "gas_spike", "headline_risk", "baltic_constraint"],
    },
    {
        "id": "french-nuclear-outage-2022",
        "name": "French Nuclear Outage Cluster",
        "event_type": "outage",
        "start_date": "2022-04-01",
        "end_date": "2022-12-31",
        "severity": "elevated",
        "affected_countries": ["FR", "DE", "GB", "DK"],
        "affected_zones": ["FR", "DE-LU", "GB", "DK1"],
        "commodities": ["power"],
        "market_impact": [
            "Reduced nuclear output tightened European supply margins.",
            "Cross-border price spreads widened during low-renewable periods.",
            "Forward curves embedded availability risk premium.",
        ],
        "playbook": [
            "Track nuclear availability alongside weather and interconnector constraints.",
            "Raise scarcity sensitivity for evening peaks and low-wind days.",
            "Validate hedges when forward premium moves faster than spot fundamentals.",
        ],
        "watch_signals": ["nuclear_unavailability", "forward_premium", "low_wind", "cross_border_spread"],
    },
]

EVENT_ENRICHMENT = {
    "eu-gas-supply-shock-2022": {
        "impact_metrics": {
            "peak_price_change_pct": 420,
            "volatility_change_pct": 260,
            "spread_change_eur_mwh": 180,
            "duration_days": 401,
            "recovery_days": 180,
        },
        "linked_asset_ids": ["de-lu-zone", "dk1-zone", "dk2-zone", "nl-maasvlakte", "dk1-nl-cobra"],
        "timeline": [
            {"phase": "trigger", "date": "2022-02-24", "description": "Geopolitical shock raised European fuel-security risk."},
            {"phase": "market_peak", "date": "2022-08-26", "description": "Gas-led power risk premia reached extreme levels."},
            {"phase": "stabilization", "date": "2023-03-31", "description": "Storage levels, demand response, and LNG substitution reduced stress."},
        ],
        "scenario_templates": [
            {"id": "gas_spike", "label": "Gas supply shock", "description": "Raise gas marks and power scarcity premium.", "severity": "severe"},
            {"id": "forward_premium", "label": "Forward risk premium", "description": "Widen forward curve and hedge-cost assumptions.", "severity": "elevated"},
        ],
        "confidence_labels": [
            {"claim": "Event timing and affected regions", "confidence": "confirmed", "basis": "Curated historical record."},
            {"claim": "Operator playbook", "confidence": "inferred", "basis": "Derived from observed market stress pattern."},
        ],
    },
    "ercot-winter-storm-uri-2021": {
        "impact_metrics": {
            "peak_price_change_pct": 900,
            "volatility_change_pct": 520,
            "spread_change_eur_mwh": 310,
            "duration_days": 7,
            "recovery_days": 21,
        },
        "linked_asset_ids": ["ercot-zone", "ercot-houston", "ercot-west-wind", "ercot-south-thermal"],
        "timeline": [
            {"phase": "trigger", "date": "2021-02-13", "description": "Extreme cold sharply increased load and fuel demand."},
            {"phase": "escalation", "date": "2021-02-15", "description": "Forced outages and gas constraints tightened reserve margins."},
            {"phase": "recovery", "date": "2021-02-19", "description": "Temperatures and supply conditions normalized."},
        ],
        "scenario_templates": [
            {"id": "cold_snap", "label": "Extreme cold snap", "description": "Raise load, outage, and fuel-deliverability stress.", "severity": "severe"},
            {"id": "reserve_margin", "label": "Reserve-margin collapse", "description": "Stress dispatchable availability and scarcity pricing.", "severity": "severe"},
        ],
        "confidence_labels": [
            {"claim": "Weather and outage correlation", "confidence": "confirmed", "basis": "Historical event classification."},
            {"claim": "Similarity to current stress", "confidence": "model-generated", "basis": "Scope and signal overlap scoring."},
        ],
    },
    "japan-fukushima-supply-shift-2011": {
        "impact_metrics": {
            "peak_price_change_pct": 170,
            "volatility_change_pct": 150,
            "spread_change_eur_mwh": 95,
            "duration_days": 661,
            "recovery_days": 365,
        },
        "linked_asset_ids": ["jp-tk-zone", "jp-futtsu", "jp-kawasaki", "jp-kashiwazaki-kariwa", "jp-tokyo-bay-lng"],
        "timeline": [
            {"phase": "trigger", "date": "2011-03-11", "description": "Nuclear outage shock changed Japan's supply stack."},
            {"phase": "escalation", "date": "2011-07-01", "description": "LNG and thermal generation dependence increased."},
            {"phase": "stabilization", "date": "2012-12-31", "description": "Market adjusted to revised availability and fuel assumptions."},
        ],
        "scenario_templates": [
            {"id": "nuclear_unavailability", "label": "Nuclear unavailability", "description": "Remove nuclear capacity and increase thermal dispatch.", "severity": "severe"},
            {"id": "lng_dependency", "label": "LNG dependency", "description": "Raise LNG supply and import-infrastructure sensitivity.", "severity": "elevated"},
        ],
        "confidence_labels": [
            {"claim": "Asset availability shock", "confidence": "confirmed", "basis": "Curated historical event."},
            {"claim": "Trading recommendation", "confidence": "inferred", "basis": "Fuel-switching and peak-demand exposure."},
        ],
    },
    "nord-stream-sabotage-2022": {
        "impact_metrics": {
            "peak_price_change_pct": 85,
            "volatility_change_pct": 120,
            "spread_change_eur_mwh": 60,
            "duration_days": 36,
            "recovery_days": 45,
        },
        "linked_asset_ids": ["de-lu-zone", "dk2-zone", "de-arkona", "dk-kriegers-flak"],
        "timeline": [
            {"phase": "trigger", "date": "2022-09-26", "description": "Pipeline damage raised infrastructure-security risk."},
            {"phase": "escalation", "date": "2022-09-27", "description": "Gas and Baltic-area infrastructure monitoring intensified."},
            {"phase": "stabilization", "date": "2022-10-31", "description": "Markets repriced security risk into wider fuel premia."},
        ],
        "scenario_templates": [
            {"id": "infrastructure_outage", "label": "Infrastructure outage", "description": "Raise outage and security-risk flags around linked assets.", "severity": "elevated"},
            {"id": "gas_spike", "label": "Gas headline shock", "description": "Increase gas-driven power risk premium.", "severity": "elevated"},
        ],
        "confidence_labels": [
            {"claim": "Infrastructure incident", "confidence": "confirmed", "basis": "Curated historical record."},
            {"claim": "Market impact attribution", "confidence": "inferred", "basis": "Gas risk premium and regional exposure."},
        ],
    },
    "french-nuclear-outage-2022": {
        "impact_metrics": {
            "peak_price_change_pct": 150,
            "volatility_change_pct": 110,
            "spread_change_eur_mwh": 90,
            "duration_days": 275,
            "recovery_days": 120,
        },
        "linked_asset_ids": ["fr-gravelines", "fr-paluel", "fr-cattenom", "de-lu-zone"],
        "timeline": [
            {"phase": "trigger", "date": "2022-04-01", "description": "Nuclear availability reductions tightened regional power supply."},
            {"phase": "market_peak", "date": "2022-08-01", "description": "Low availability and fuel stress widened cross-border spreads."},
            {"phase": "recovery", "date": "2022-12-31", "description": "Availability expectations began normalizing."},
        ],
        "scenario_templates": [
            {"id": "nuclear_unavailability", "label": "Nuclear availability shock", "description": "Reduce baseload supply and raise scarcity premium.", "severity": "elevated"},
            {"id": "cross_border_spread", "label": "Cross-border spread widening", "description": "Increase interconnector congestion and spread assumptions.", "severity": "watch"},
        ],
        "confidence_labels": [
            {"claim": "Availability loss", "confidence": "confirmed", "basis": "Curated historical record."},
            {"claim": "Hedge recommendation", "confidence": "inferred", "basis": "Forward premium and cross-border spread behavior."},
        ],
    },
}

for event in MARKET_EVENTS:
    event.update(EVENT_ENRICHMENT[event["id"]])
