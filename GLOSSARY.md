# YieldLog

個人定存記錄工具。用戶把每筆香港定存（金額、利率、存期、到期日）記錄下來，
再以到期時間的視角（曆法、熱力圖、時間軸）回顧自己的資金配置。

## Language

### 定存

**Deposit**:
一筆用戶記錄的定期存款，由金額、年利率、起息日與到期日構成。
**Maturity**（到期）:
Deposit 的利息結算日。到期日之前稱為未到期，之後稱為已到期。
_Avoid_: 存款紀錄、單筆、entry

**Matured**（已到期）:
Maturity 已經在今天或更早的 Deposit。當天即算已到期。
**Matures Today**（今日到期）:
Maturity 正好是今天的 Deposit，屬於已到期。時間軸用「今日到期」而非相對天數標示它，
並且是唯一不做淡化的已到期項目。
Deposit 的「已到期」判定只有這一條規則。
_Avoid_: 未到期、not yet matured

**Bank**:
存款所在的機構。Deposit 必須屬於一間 Bank。
_Avoid_: 機構、provider

**Term**（存期）:
Deposit 從起息日到到期日的長度，以 days / weeks / months / years 表示。
**Period Unit**:
存期所用的時間單位。目前支援 日 / 週 / 個月 / 年。
_Avoid_: duration、期限

### 到期視圖

**Maturity Bucket**（期距區間）:
把一年切分成的最小單位，一個 Bucket 涵蓋一段連續日期並對應到零至多筆 Deposit。
有三種切分粒度：**按日**、**按週**、**按月**。
每個 Bucket 都有起訖日（period start / period end）。
_Avoid_: 格子、cell、bucket key（那是識別用的字串，不是區間本身）

**Maturity Calendar**（到期日曆）:
把一年依所選粒度鋪滿 Maturity Bucket 的結構。
_Avoid_: heatmap（那只是「按日」模式下的呈現方式）、grid

**Maturity Heatmap**（到期熱力圖）:
以顏色深淺呈現 Maturity Bucket 金額高低的到期視圖。
_Avoid_: calendar、圖表

**Intensity Band**（深淺級距）:
依金額把 Maturity Bucket 分成的等級，由低到高。
同一年的所有 Bucket 共用同一組級距邊界，切換年份不會改變顏色深淺。
_Avoid_: level、threshold、顏色

**Available Year**（可選年份）:
至少有一筆 Deposit 到期的年份，另外永遠包含今年。
_Avoid_: year option、年份選項
