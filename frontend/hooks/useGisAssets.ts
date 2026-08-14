import { useApi } from "@/hooks/useApi";
import type { AssetType, GisAsset, GisLink } from "@/lib/sampleGis";

type GisAssetsResponse = {
  region: string;
  data_source: string;
  assets: GisAsset[];
  links: GisLink[];
};

export function useGisAssets(filter: AssetType | "all") {
  const assetType = filter === "all" ? "all" : filter;
  return useApi<GisAssetsResponse>(
    `/gis/assets?region=global&asset_type=${encodeURIComponent(assetType)}`
  );
}
