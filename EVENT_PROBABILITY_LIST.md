# EVENT_PROBABILITY_LIST — JEWELRY×JEWELRY

> 現行実装基準: **v0.10.882**
> 数値は `js/app.js` の有効な定数から自動生成する。手入力で確率を書き換えない。
> 条件を満たした各判定での確率であり、「N回目に必ず発生」を意味しない。

## 共通倍率

- `MEAL_EVENT_RATE_MULTIPLIER` = **1.2倍**。
- 従来の `1/30` 系料理イベントは **4%**。
- 韓国料理の水槽解放イベントは `1/15 × 1.2` = **8%**。
- ホワイト・バニーは個別指定で **4%**。

## 料理・飲食

| イベント | 現行確率 | 目安 | 主な前提 | コード定数 |
|---|---:|---:|---|---|
| 回転寿司・店主無料イベント | **4%** | 約1/25 | 対象の回転寿司利用時 | `SUSHI_CHEF_EVENT_CHANCE` (`js/app.js:339`) |
| コンビニ・サイクロプス | **4%** | 約1/25 | 対象のコンビニ利用時 | `CYCLOPS_EVENT_CHANCE` (`js/app.js:340`) |
| ホワイト・バニー（アイス） | **4%** | 約1/25 | 対象のアイス利用時 | `WHITE_BUNNY_ICE_EVENT_CHANCE` (`js/app.js:341`) |
| テリー・カリフォルニア | **4%** | 約1/25 | 対象のハンバーガー利用時 | `TERRY_CALIFORNIA_EVENT_CHANCE` (`js/app.js:343`) |
| ガネーシャ | **4%** | 約1/25 | 対象のインド料理利用時 | `GANESHA_TUSK_EVENT_CHANCE` (`js/app.js:348`) |
| 謎の中華料理 | **4%** | 約1/25 | 対象の中華料理利用時 | `MYSTERY_CHINESE_MEAL_EVENT_CHANCE` (`js/app.js:404`) |
| エメラルド班班長 | **4%** | 約1/25 | 対象のケバブ利用時 | `EMERALD_CAPTAIN_KEBAB_EVENT_CHANCE` (`js/app.js:405`) |
| 韓国料理・水槽解放 | **8%** | 約1/12.5 | 366日目以降・水槽未解放などの条件を満たす時 | `GRAY_HOOD_AQUARIUM_EVENT_CHANCE` (`js/app.js:412`) |
| リドリー岡崎（そば） | **4%** | 約1/25 | 対象の立ち食いそば利用時 | `RIDLEY_OKAZAKI_SOBA_EVENT_CHANCE` (`js/app.js:418`) |

## 御徒町・街

| イベント | 現行確率 | 目安 | 主な前提 | コード定数 |
|---|---:|---:|---|---|
| 御徒町・通行料 | **2.5%** | 約1/40 | 御徒町の対象判定時 | `OKACHIMACHI_TOLL_EVENT_CHANCE` (`js/app.js:304`) |
| パンダ音楽 | **2%** | 約1/50 | 御徒町の新規イベント判定時 | `PANDA_MUSIC_EVENT_CHANCE` (`js/app.js:387`) |
| 映画館 | **2.5%** | 約1/40 | 映画館の対象判定時 | `CINEMA_VISIT_EVENT_CHANCE` (`js/app.js:398`) |
| 見習い職人・映画館 | **3%** | 約1/33.3 | 映画館の対象判定時 | `APPRENTICE_CINEMA_EVENT_CHANCE` (`js/app.js:401`) |
| 手首を拾った | **0.5%** | 約1/200 | 御徒町の対象判定時 | `WRIST_FOUND_EVENT_CHANCE` (`js/app.js:421`) |
| おやつ大好き | **2.86%** | 約1/35 | 水槽解放済み・18:00まで・1日1回など | `OYATSU_DAISUKI_EVENT_CHANCE` (`js/app.js:422`) |
| スピード・スター | **1%** | 約1/100 | 御徒町の対象判定時 | `SPEED_STAR_EVENT_CHANCE` (`js/app.js:425`) |
| ストーリーテラー | **5%** | 約1/20 | 18:00以降などの条件を満たす時 | `STORYTELLER_EVENT_CHANCE` (`js/app.js:426`) |
| 時計塔寄付 | **1.11%** | 約1/90 | 対象条件を満たす時 | `CLOCK_TOWER_DONATION_EVENT_CHANCE` (`js/app.js:386`) |

## 店舗・g-Lab.・工房

| イベント | 現行確率 | 目安 | 主な前提 | コード定数 |
|---|---:|---:|---|---|
| 店舗・老婆の窃盗 | **1.11%** | 約1/90 | 店舗の対象判定時 | `STORE_THEFT_EVENT_CHANCE` (`js/app.js:357`) |
| 店舗・強盗 | **1%** | 約1/100 | 日次対象判定。木刀効果中はこの確率の50% | `ROBBERY_DAILY_CHANCE` (`js/app.js:292`) |
| g-Lab.訪問動画 | **3.33%** | 約1/30 | g-Lab.の新規イベント判定時 | `GLAB_VISIT_VIDEO_EVENT_CHANCE` (`js/app.js:441`) |
| カワハラ加工知識 | **2.5%** | 約1/40 | g-Lab.の新規イベント判定時 | `KAWAHARA_KNOWLEDGE_EVENT_CHANCE` (`js/app.js:443`) |
| 河原の河童・翡翠 | **3.33%** | 約1/30 | 河原選択・1日1回など | `KAPPA_JADE_EVENT_CHANCE` (`js/app.js:447`) |
| 工房の河童・翡翠 | **3.33%** | 約1/30 | 河原の河童経験後・クールダウン等 | `WORKSHOP_KAPPA_JADE_EVENT_CHANCE` (`js/app.js:448`) |
| 弱虫ローズクォーツ | **8.33%** | 約1/12 | 工房の対象判定時 | `YOWAMUSHI_ROSE_QUARTZ_EVENT_CHANCE` (`js/app.js:449`) |
| ONE LOVE | **25%** | 約1/4 | 181日目以降・180日クールダウンなど | `ONE_LOVE_EVENT_CHANCE` (`js/app.js:450`) |

## その他

| イベント | 現行確率 | 目安 | 主な前提 | コード定数 |
|---|---:|---:|---|---|
| タトゥー女性・琥珀 | **3.33%** | 約1/30 | 対象施設の判定時 | `TATTOO_WOMAN_AMBER_EVENT_CHANCE` (`js/app.js:349`) |
| 怪異 | **0.5%** | 約1/200 | 日次対象判定 | `HAUNTING_EVENT_DAILY_CHANCE` (`js/app.js:354`) |
| 宇宙人誘拐 | **0.274%** | 約1/365 | 日次対象判定 | `ALIEN_ABDUCTION_DAILY_CHANCE` (`js/app.js:368`) |

## 回数・日数レンジで決まる代表イベント

- 御徒町4択: **20〜30回来訪**。
- ルース屋3Dメガネ: **22〜28回来訪**。
- 病院イベント初回: **401日目以降**、初回待ち **0〜45日**。
- 病院イベント2回目以降: **330〜400日**間隔。
- Blues Juke 初回: **101〜130日目**。以後 **150〜210日**間隔。

## 判定順

- 新規イベント同士が競合する主要箇所では候補順をシャッフルし、コード上の並び順による偏りを減らす。
- 進行中イベントの再開と誕生日優先は固定順を維持する。
- 個別確率や発生条件は、候補順のシャッフルとは別に判定される。

## 更新方法

```bash
python3 scripts/generate-event-probability-list.py --write
python3 scripts/generate-event-probability-list.py --check
```

`--check` は現行コードから再生成した内容とこの文書が一致しなければFAILする。
