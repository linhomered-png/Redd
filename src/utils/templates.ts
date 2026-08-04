export interface TextCardTemplate {
  text: string;
  duration: number;
  bgColor: string;
  textColor: string;
}

/**
 * Title-card beats for the "團購批發商招募短影片" 30s script
 * (see docs/group-buy-wholesaler-recruitment-script.md). Durations sum to 30s
 * to match the script's shot list; insert product/warehouse photos between
 * cards and edit the placeholder numbers to real data before exporting.
 */
export const RECRUITMENT_TEMPLATE: TextCardTemplate[] = [
  { text: "貨出得去，\n訂單接不完？", duration: 3, bgColor: "#12233f", textColor: "#ffffff" },
  { text: "上千團媽，\n同時幫你賣貨", duration: 5, bgColor: "#0f3d3e", textColor: "#ffffff" },
  { text: "免業務、\n免庫存壓力", duration: 6, bgColor: "#12233f", textColor: "#ffffff" },
  { text: "上架 7 天，\n訂單成長 3 倍", duration: 6, bgColor: "#3c1642", textColor: "#ffffff" },
  { text: "零上架費\n審核快", duration: 5, bgColor: "#0f3d3e", textColor: "#ffffff" },
  { text: "現在加入，\n搶第一波流量！", duration: 5, bgColor: "#7a1f2b", textColor: "#ffffff" },
];
