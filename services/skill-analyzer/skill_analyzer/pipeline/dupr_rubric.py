"""DUPR 數字線上的「技能等級剖面」。

官方 DUPR 是對戰 Elo（比分相對期望），不是技術檢核表。
下列剖面把公開技能定義對到 DUPR 2.0–5.5，供影片特徵匹配：

- USA Pickleball Skill Level Definitions（2.5–5.0 技術／策略／腳步）
- IPTPA 3.5 技能測驗門檻（dink／drop／serve 成功率）
- PPA Tour 評級說明（3.0–5.0 能做什麼）
- DUPR 官方：reset + third-shot drop 是 3.5→4.0/4.5 的關鍵（Bobbi Oshiro）
- The Dink：3.0/3.5/4.0 的第三球 drop 差異（落點、選擇、旋轉／偽裝／回位）
- ThePickleBase：DUPR 半級「能做／還不能」對照 USA Pickleball
- Empower Pickleball：技能等級 vs 比賽積分的區別
"""

from __future__ import annotations

LEVELS = (2.5, 3.0, 3.5, 4.0, 4.5, 5.0)

# 影片可觀測維度 → 各等級期望值 0–1（愈高愈接近該級「該做到的事」）
DIMENSIONS = (
    "consistency",
    "kitchenPresence",
    "dinkPatience",
    "thirdShotDrop",
    "resetTransition",
    "footwork",
    "handSpeed",
    "cognition",
)

WEIGHTS = {
    "consistency": 0.20,
    "kitchenPresence": 0.10,
    "dinkPatience": 0.12,
    "thirdShotDrop": 0.18,
    "resetTransition": 0.15,
    "footwork": 0.09,
    "handSpeed": 0.07,
    "cognition": 0.09,
}

PROFILES: dict[float, dict[str, float]] = {
    2.5: {
        "consistency": 0.32,
        "kitchenPresence": 0.08,
        "dinkPatience": 0.12,
        "thirdShotDrop": 0.05,
        "resetTransition": 0.10,
        "footwork": 0.28,
        "handSpeed": 0.22,
        "cognition": 0.18,
    },
    3.0: {
        "consistency": 0.48,
        "kitchenPresence": 0.22,
        "dinkPatience": 0.32,
        "thirdShotDrop": 0.22,
        "resetTransition": 0.24,
        "footwork": 0.40,
        "handSpeed": 0.34,
        "cognition": 0.38,
    },
    3.5: {
        "consistency": 0.60,
        "kitchenPresence": 0.36,
        "dinkPatience": 0.52,
        "thirdShotDrop": 0.42,
        "resetTransition": 0.42,
        "footwork": 0.55,
        "handSpeed": 0.46,
        "cognition": 0.55,
    },
    4.0: {
        "consistency": 0.74,
        "kitchenPresence": 0.46,
        "dinkPatience": 0.66,
        "thirdShotDrop": 0.68,
        "resetTransition": 0.66,
        "footwork": 0.70,
        "handSpeed": 0.60,
        "cognition": 0.70,
    },
    4.5: {
        "consistency": 0.86,
        "kitchenPresence": 0.50,
        "dinkPatience": 0.78,
        "thirdShotDrop": 0.82,
        "resetTransition": 0.82,
        "footwork": 0.82,
        "handSpeed": 0.76,
        "cognition": 0.82,
    },
    5.0: {
        "consistency": 0.93,
        "kitchenPresence": 0.48,
        "dinkPatience": 0.86,
        "thirdShotDrop": 0.90,
        "resetTransition": 0.90,
        "footwork": 0.90,
        "handSpeed": 0.86,
        "cognition": 0.90,
    },
}

LABELS = {
    2.5: "2.5 初學",
    3.0: "3.0 進階初學",
    3.5: "3.5 中級",
    4.0: "4.0 進階中級",
    4.5: "4.5 高級",
    5.0: "5.0 專家",
}

DIMENSION_LABELS = {
    "consistency": "穩定度／非受迫性失誤",
    "kitchenPresence": "廚房區佔位（先到 NVZ）",
    "dinkPatience": "Dink 耐心與軟球交換",
    "thirdShotDrop": "第三球 Drop／選擇",
    "resetTransition": "Transition Reset（3.5→4.5 關鍵）",
    "footwork": "腳步與重心轉移",
    "handSpeed": "廚房手速／對攻",
    "cognition": "站位認知與上網決策",
}

LEVEL_COPY: dict[float, dict[str, str]] = {
    2.5: {
        "can": "能與同級維持短對打、基本計分、中等速度正手與發球；能做控制有限的短 dink。",
        "notYet": "發球回球缺深度與方向、反手弱、幾乎沒有第三球 Drop，軟球還沒成形。",
        "footwork": "移動慢、常站死；機會出現時還不會穩定衝上 NVZ。",
        "cognition": "開始理解站位，但還不會依來球選擇軟／硬，也還沒有第三球計畫。",
    },
    3.0: {
        "can": "發球回球大致進場、正手有一點方向、dink 能維持中等長度、開始往廚房移動；第三球開始嘗試 Drop 以便上網。",
        "notYet": "常繞開反手、高度／深度控制有限、壓力下容易自打失誤；Drop 還不穩，更習慣第三球平擊。",
        "footwork": "有上網意識，但過渡區停太久或回位慢；還沒能與隊友同步前壓。",
        "cognition": "懂基本站位與規則；開始感覺節奏變化，第三球仍多半是「打回去」而不是選擇。",
    },
    3.5: {
        "can": "正手有深度與控制、反手開始用、發球能變速、dink 較有耐心並開始看出可攻球；能選擇 Drop 或 Drive，reset 剛起步。",
        "notYet": "第三球 Drop／Drive 選擇不穩、面對快球容易失誤；過渡區 reset 成功率還不夠（這是 3.5→4.0 的門檻）。",
        "footwork": "機會出現會往 NVZ 移動；能與隊友一起前壓，變向進攻仍生疏。",
        "cognition": "分辨軟硬球、開始有簡單戰術與 stacking 概念，但仍常急著進攻、結束 dink 太早。",
    },
    4.0: {
        "can": "能穩定執行第三球策略、過渡區 reset 硬球、辨識並進攻可攻 dink、軟硬切換、隊友溝通與 stacking。",
        "notYet": "對 4.5 仍會失穩；偽裝、高級 reset、ATP／Erne 尚未成為武器。",
        "footwork": "前後左右移動順、重心轉移清楚、廚房很自在；開始 poach。",
        "cognition": "依對手弱點調整計畫，不再只是反應來球；非受迫性失誤明顯下降。",
    },
    4.5: {
        "can": "dink／Drop 能調動對手再攻擊、能變速與旋轉、reset 硬球、雙手都能 Drop／Drive、ATP／Erne／反擊進工具箱、極少非受迫性失誤。",
        "notYet": "對 5.0 仍有一致性缺口；守轉攻尚未每分都乾淨。",
        "footwork": "重心轉移有效、腳步經濟、能瞬間變向、poach 與反擊。",
        "cognition": "能在比賽中改戰術；把防守球轉成進攻；依對手與隊友即時改計畫。",
    },
    5.0: {
        "can": "幾乎每分都上廚房、長時間耐心 dink 後再攻擊、發球多樣、雙手各種球路都有控制、極少非受迫性失誤。",
        "notYet": "尚未達到職業巡迴的持續結果（約 6.0+／PPA、MLP）。",
        "footwork": "高效、可瞬間變向與回位，用重心轉移換速度。",
        "cognition": "完整策略，能依對手、隊友與場上位置即時改整套計畫。",
    },
}

SOURCES = [
    "USA Pickleball Skill Level Definitions",
    "IPTPA 3.5 Skill Assessment",
    "PPA Tour rating descriptions",
    "DUPR Blog（reset / third-shot drop，Bobbi Oshiro）",
    "The Dink：Third Shot Drop by Skill Level",
    "ThePickleBase DUPR skill chart",
    "Empower Pickleball：skill level vs match rating",
]
