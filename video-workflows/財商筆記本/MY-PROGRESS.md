# 財商筆記本 —— 我的進度筆記

這份不是原作者的檔案，是這次對話裡實際跑出來的設定紀錄，方便之後（或換一台機器）接續。

## 已完成

- `profiles/brand.md` —— 人設「財商筆記本」：不露臉、財商觀念分享、IG Reels / FB Reels、
  深黑 #0D0D0D + 螢光黃 #F4E04D、固定收尾句「翻到這一頁，你已經比昨天更懂錢一點。」
- `config.py` —— 已複製自 `config.example.py`，路徑用預設值（專案資料夾本身）
- `assets/bgm/calm/soft_pad.mp3` —— **合成測試配樂**（純音效，非真實音樂），LUFS 偏低，
  QA 會顯示 RED，這是已知限制，換真實音樂即解決
- 字級調整：`src/silent_vlog_maker/shorts_vertical.py` 的 MAIN 字幕從 124px 加大到 150px
  （長句需手動用 `\n` 拆成兩行，安全上限約 6-7 字/行）
- 兩支成品 Short（都在對應的 `videos/_INBOX/shorts/<N>/_out/`）：
  1. `1/_out/short_1_saving_vs_assets.mp4` —— 存錢不會讓你變富
  2. `2/_out/short_2_asset_vs_liability.mp4` —— 資產 vs 負債圖解（搭配 Pillow 生成的示意圖 + Ken Burns 動態）

## 素材生成方式（沒有真實素材時的做法）

- 文字卡片：`ffmpeg drawtext` + `drawbox`（螢光黃劃線高亮效果），字型用
  `/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`（WenQuanYi Zen Hei，支援繁中）
- 示意圖：Python + Pillow 手繪（見對話紀錄），存成 PNG 後用
  `ffmpeg -loop 1 -i xxx.png -t 5 -vf "scale=W*3:H*3,zoompan=z='1.0+0.08*on/150':d=1:s=1080x1920:fps=30"`
  轉成有輕微推近動態的影片片段

## 排版校正記錄

第一版素材片段裡直接燒錄了文字（drawtext），跟工具自動疊加的字幕系統（ASS caption）疊在一起，
造成同一畫面出現重複文字、甚至兩段不同話搶畫面。已修正：**素材片段只留純視覺（背景/圖形/動態），
文字 100% 交給 `caps_by_seg` 統一控制**。修改後記得同步覆蓋 `_work/` 裡的正規化副本
（`scan` 產生的），不然 `build` 還是會用舊檔——這是這次踩的坑，寫進「教訓」清單。

## 這輪新增

- `profiles/voice.md` / `algorithm.md` / `community.md` —— SETUP.md 選填區補齊（新頻道階段，
  多數欄位是「待建立/無數據」，誠實記錄現況，不是套假數字）
- 第三支片：`videos/_INBOX/shorts/3/_out/short_3_compound_interest.mp4`（複利曲線 vs 本金直線，
  用 PIL 畫真正的指數曲線圖，這次順利沒有 bug）
- `PUBLISH-PLAN.md` —— 手動發布 SOP（因為自動發文卡在 Windsor.ai 平台端限制，短期只能手動）

## 排版校正 2：字幕撞底部資訊條 + 影片拉長

第三支片在約 4 秒處，3 行字幕（150px×3）高度超過安全區，直接壓到底部常駐資訊條，
文字糊成一團。**教訓：MAIN 字幕超過 2 行就有風險，盡量把文案濃縮成 2 行以內。**
同時把三支片的主段落/收尾段落從 4.8s 拉長到 8.0s（總長 13.2s → 19.6s），BGM 也同步從
20s 拉長到 28s 避免 loop 接縫跳音。記得：改動 segs 時長後，若素材來源不夠長會直接被
trim 卡住，要連原始素材也一起拉長，不能只改 `_plan.py` 的數字。

## 節奏加密：字幕頻率 ×1.5

三支片的 caption 從各 4 條加到 6 條（每個內容段落拆成兩個小觀念），字幕出現速率從
12.2 句/分提高到 18.4 句/分（≈1.5 倍），總長維持 19.6s 不變。做法：同一個 seg 索引可以
放兩筆 `caps_by_seg` 條目，系統會自動把該 segment 的時間切給這兩條字幕，不用手算時間。

## 下一步可以做的事

1. 換真實配樂（放進 `assets/bgm/<mood>/`，任意 mp3/wav）解決 LUFS 過低的 QA 警告
2. 累積更多財商觀念，重複「想主題 → 生成/準備素材 → `scan N --platform ig_reels` → 填 `_plan.py` → `build N`」
3. 之後也可以走 `SETUP.md` 剩下的選填區（3️⃣ Voice、5️⃣ Algorithm、6️⃣ Community）讓系統更貼近你
4. 想在本機（非雲端）跑，直接把這整個資料夾複製過去，裝好 Python 3.9+ / ffmpeg 即可，
   `config.py` 路徑預設抓專案資料夾本身，不用改
