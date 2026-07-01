export type HourlyPrice = {
    hour: string;
    price_eur_mwh: number;
};

export type DayAheadPrices ={
    country: string;
    zone: string;
    market: string;
    unit: string;
    prices: HourlyPrice[];
};