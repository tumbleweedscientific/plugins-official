# 示例：Genomic SEM 因子 × S-LDSC / LDSC-SEG 热图 + gsMap 空间柱状图

## 0. 基本信息
- 面板：a = 分面热图（5 因子 × ~100 注释）；b = 分组柱状图（~29 空间区域 × 5 因子）
- 推断方法：Genomic SEM 得到 G、F1–F4；a 为 Stratified Genomic SEM / S-LDSC（baselineLD、Roadmap 染色质、Franke lab 细胞类型、GTEx 组织）；b 为 gsMap（MOSTA 小鼠胚胎空间图谱）区域 Cauchy 组合 P。

## 1. 总体说明
女性生殖/妊娠相关疾病的共同遗传因子 G 与 4 个特异因子在功能元件、细胞/组织、空间解剖区域上的遗传富集。

## 2. 面板映射表
### 面板 a：热图
| 数据维度 | 水平数/范围 | 类型 | 视觉通道 | 元素 |
|---|---|---|---|---|
| 因子 | 5 | S+I | 行位置 + 彩色字母徽章 | G/F1/F2/F3/F4 |
| 注释大类→子类 | 2→4 | S | 两级灰色分组条 | Regulatory & chromatin / Cell & tissue → 4 子类 |
| 具体注释 | ~100 | S+T | 列位置 + 旋转文字 | GERP、Uterus… |
| 指标类型 | 2 | I | 色系紫/绿 | 两套色板 |
| 富集值 | 0–20 / 0–3 | M | 颜色明度 | 格子深浅 |
| 显著性 | 二值 | D | `*` | 校正后显著 |
| 读数基准 | — | R | 两条色标 | 0–20、0–3 |

### 面板 b：分组柱状图
| 数据维度 | 水平数/范围 | 类型 | 视觉通道 | 元素 |
|---|---|---|---|---|
| 空间区域 | ~29 | S+T | x 位置 + 文字 | Lung…Bone |
| 因子 | 5 | I | 色相 + dodge | 5 色柱 |
| −log10(P_Cauchy) | 0–4.3 | M | 柱高 | 柱子 |
| 名义阈值 | P=0.05 | R | 虚线 | y≈1.3 |
| 校正后显著 | 二值 | D | `*` | 柱顶星号 |
| 因子含义 | 5 | T | 图例全称 | Organic gynecological disorders… |
隐含框架：区域大致按信号由弱到强排序。

## 3. 跨面板信息
| 设计 | 类型 | 作用 |
|---|---|---|
| 因子配色 a/b 一致 | I（冗余编码） | 串联叙事 |
| 成人组织/功能元件 → 胚胎空间解剖 | S（尺度递进） | 多分辨率互补 |
| 每格 = 位置 + 强度 + 判定 | 多层叠加 | 在哪/多强/是否可信 |

## 4. 分层结论
- S：5 因子 × 3 个生物学层级。
- I：每个因子固定颜色，全图可追踪。
- M：F1 细胞/组织整行深；F3 调控与空间普遍强；F2、F4 弱。
- D：F2 无星号；F4 仅卵巢；F3 星号最多最广。
- T：G→神经内分泌脑区；F1→生殖道与内皮/平滑肌；F3→免疫、肝、胰岛、心血管代谢；F4→卵巢。
- R：紫/绿量纲不可直接比较；过虚线无星号仅为名义显著。
- 一句话：统一框架下以强度编码、星号过滤、文字赋义，呈现不同因子对应不同组织机制。

## 5. 设计评价
| 类型 | 当前通道 | 优点 | 局限 | 可替代 |
|---|---|---|---|---|
| M（a） | 颜色明度 | 高密度 | 精度低 | 气泡大小+颜色双编码 |
| D | `*` | 简洁 | 不分级 | `*`/`**`/`***` 或非显著置灰 |
| R（a） | 双色标 | 量纲分离 | 读者易混 | 分图或统一为 −log10P |

## 6. 复现所需
- 各疾病 GWAS summary statistics；1000G EUR LD scores、HapMap3 SNP 列表
- GenomicSEM（ldsc、CFA、userGWAS / enrich）；LDSC（baselineLD v2.x、Multi_tissue_chromatin、Multi_tissue_gene_expr）；gsMap + MOSTA E16.5
- 长格式表：a `factor|group1|group2|annotation|value|metric|p|fdr|sig`；b `factor|region|p_cauchy|padj|sig`
- ggplot2：`geom_tile` + `ggh4x::facet_nested` + `ggnewscale`；`geom_col(position="dodge")` + `geom_hline` + `geom_text("*")`
