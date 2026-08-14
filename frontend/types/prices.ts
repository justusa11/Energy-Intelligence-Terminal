export type HourlyPrice = {
    hour: string;
    timestamp_utc: string;
    price_eur_mwh: number;
};

export type DayAheadPrices ={
    country: string;
    zone: string;
    market: string;
    unit: string;
    data_source?: string;
    prices: HourlyPrice[];
};
