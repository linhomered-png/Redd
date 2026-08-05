# 財商筆記本 —— 量產 SOP

這份是這次對話裡反覆試錯後定案的完整生產流程，之後每支新片都照這個走，
不用再重新摸索一次。對應的 slash command：`/財商影片`。

## 固定規格（不用每次重新決定）

- 人設：`profiles/brand.md` + `profiles/voice.md`（單純喜歡分享、不露臉、不裝專家）
- 尺寸：1080x1920（9:16），平台 `ig_reels`
- 配色：背景 `#0D0D0D`，強調色 `#F4E04D`（螢光黃），次要色 `#888888`/`#CCCCCC`（灰）
- 字型：`/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`（WenQuanYi Zen Hei，支援繁中）
- 總長：**約 20 秒**（實測 19.6s：hook 2.0s + 內容段 8.0s×2 + loop 1.6s）
- 字幕頻率：**每支 6 條**（1.5 倍密度，18-19 句/分），每個內容段落拆成 2 個小觀念
- 字級：MAIN 150px，**單行安全上限 6-7 字，超過一律手動 `\n` 拆成 2 行，絕不超過 2 行**
  （3 行會壓到底部常駐資訊條，已踩過這個坑）
- 常駐資訊條：`財商筆記本｜每天記一個新觀念`（addr 欄位，每支片都一樣）
- BGM：`assets/bgm/calm/soft_pad.mp3`，**長度必須 > 影片總長**，不然會 loop 接縫跳音

## 素材製作鐵則

**素材片段只留純視覺（背景/圖形/動態縮放），絕對不燒錄文字進素材。**
文字 100% 交給 `caps_by_seg` 的 ASS 字幕系統控制。這是踩過的坑：素材燒字 + 系統自動疊字幕
= 同畫面兩段話打架。

### 素材類型（三選一或混用）

1. **Hook 背景**（複用 `clip_hook.mp4`）：黑底 + 螢光黃色塊從左滑入的高亮動畫，6 秒
2. **Outro 背景**（複用 `clip_outro.mp4`）：黑底 + 螢光黃直線由下往上生長，9 秒
3. **概念圖解**（每支新片才需要新畫）：用 Pillow 畫示意圖（純圖形/線條/icon，**不要**畫完整句子，
   只留 2 字以內的圖例標籤），存 PNG，再用這行指令轉成有 Ken Burns 推近效果的影片：
   ```bash
   ffmpeg -y -loop 1 -i xxx.png -t 9 \
     -vf "scale=1080*3:1920*3,zoompan=z='1.0+0.08*on/270':d=1:s=1080x1920:fps=30,format=yuv420p" \
     -c:v libx264 -pix_fmt yuv420p out.mp4
   ```
   （`on/270` 對應 9 秒 ×30fps；如果改秒數，分母要跟著改成 `秒數×30`）

## 完整流程（每支新片）

1. **想一個反常識/顛覆直覺的財商觀念**，套用 hook 句型：「A 不會 X，B 才會」或「多數人搞錯的 XX」
2. 決定要不要畫新的概念圖解（如果是對比/趨勢類觀念，畫圖比純字卡更有記憶點）
3. 建立 `videos/_INBOX/shorts/<N>/` 資料夾，把素材（hook 複用、outro 複用、新圖解）放進去
4. 跑 `python3 src/shorts_autopilot.py scan <N> --platform ig_reels` 產生 `_plan.py` 骨架
5. **手動編輯 `_plan.py`**：
   - 把 seg1／seg2 的 `dur` 改成 `8.0`（原本 auto 給的 4.8 太短）
   - `place`/`what` 只需是首條字幕的**子字串**，不用等於完整句子
   - `caps_by_seg` 寫 6 條（seg0 兩條 hook+sub，seg1 兩條，seg2 兩條），每條視需要用 `\n` 拆 2 行
6. **同步覆蓋 `_work/` 裡的正規化副本**（`cp` 新素材蓋掉 `_work/xxx.mp4`）——
   這是最容易忘記的一步，忘了就會用到舊素材
7. 跑 `python3 src/shorts_autopilot.py build <N>`
8. 檢查 `_out/_qa/CAPTION_match.jpg`：確認每格只有一則訊息、沒有文字重疊/被裁切
9. 有問題就回第 5 步調整，沒問題就完成

## 已知常態警告（不用理會）

- `LUFS ... RED` —— 合成測試配樂音量問題，換真實音樂才會消失，不影響其他部分
- `S-A 第二條 ... 與 what 不一致` —— 因為 what 只是簡短標籤不是完整句，正常現象
- `S-O 字幕中位停留/換句 ...` —— advisory 級警告，不擋出片

## 素材/圖解命名慣例

- Hook：`clip_hook<N>.mp4` 或直接複用 `clip_hook.mp4`
- Outro：`clip_outro.mp4`（固定複用）
- 概念圖解：`clip_<主題關鍵字>.mp4`（例如 `clip_diagram.mp4`、`clip_compound.mp4`）
- PNG 草稿：`<N>_<主題關鍵字>.png`，跟對應影片放在同一層 `videos/_INBOX/shorts/`
