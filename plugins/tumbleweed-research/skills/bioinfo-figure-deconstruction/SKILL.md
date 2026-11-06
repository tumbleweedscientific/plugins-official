---
name: bioinfo-figure-deconstruction
description: "Deconstruct a bioinformatics / scientific figure (heatmap, bar chart, dot plot, UMAP, volcano, enrichment, LDSC/GWAS, spatial plots) into information layers — structure, identity, magnitude, inference, semantic, reference — mapping each data dimension to its visual channel and listing alternative encodings. Use when the user uploads a figure and asks what it shows, how it is built, which visual dimensions carry the message, or how to reproduce/redesign it. 生信图片拆解：框架/身份/强度/判定/语义/参照信息。"
license: Apache-2.0
metadata:
  tumbleweed:
    domains: [visualization]
    tags: [figures]
    maturity: stable
    requires:
      environment: web
      models: [vision]
    inputs: [png, jpg, pdf]
    outputs: [report]
    starterPrompts:
      - "What does this figure show, and how is it built?"
---

# 生信图片信息拆解（Figure Deconstruction）

把一张生信/科研图的每个视觉元素按其**承担的信息功能**归类，建立"数据维度 → 信息类型 → 视觉通道 → 具体元素"的映射，最后按信息层读出结论，并给出可替代的表现形式与复现所需数据表结构。

## 在本平台上
- 用户上传的图片在 `/workspace` 中，用 `read` 查看；局部细节先用 PIL 裁剪成新的 PNG 再 `read`。
- 图在 PDF 里时，用 `pdf-explore` 技能的 `pdf_crop` 按面板裁剪后查看。
- 复现时在 notebook（`python_nb` / `r_nb`）里作图，作图规范可加载 `figure-style`。

## 何时使用
- 用户上传图片，问"展示了什么 / 如何拆解 / 有哪些维度 / 怎么复现 / 怎么改进"。
- 只问单一数值读取时不必走完整流程。

## 一、信息类型体系（6 类）

| 代码 | 类型 | 回答的问题 | 数据性质 | 典型元素 |
|---|---|---|---|---|
| S | 框架信息 Structure | 比较的单元是什么、如何组织 | 分类/层级/顺序 | 面板编号、行列、坐标轴位置、分面、嵌套分组条、间隙、边框、排序、聚类树 |
| I | 身份信息 Identity | 这个元素属于哪一类 | 名义分类 | 色相、形状、线型、纹理、彩色标签徽章、图例 |
| M | 强度信息 Magnitude | 有多强/多少 | 连续数值 | 柱高、点位置、长度、面积/气泡大小、颜色明度/饱和度、透明度、数值标签 |
| D | 判定信息 Inference | 统计上是否可信 | 二值/有序 | `*`/`**`/`***`、加粗边框、实心/空心、非显著置灰、只给显著项着色 |
| T | 语义信息 Semantic | 生物学含义是什么 | 文本 | 注释名、基因/通路/细胞类型名、因子全称、轴标题、图例标题、callout、箭头 |
| R | 参照信息 Reference | 怎么读数、基准是什么 | 标尺 | 色标、刻度、网格、阈值线（如 P=0.05）、零基线、参考区间阴影 |

区分要点：
- **D vs M**：判定是从强度派生的离散决策（过阈值与否），叠加在强度之上起"过滤"作用。
- **D vs R**：阈值线是参照（名义阈值），`*` 是判定（常为校正后阈值）；二者常构成"两级显著性"。
- **I vs S**：行位置是框架；行标签的颜色是身份。一个元素可同时承担多类，需逐一记录。
- **两套色系**：通常是身份信息（区分指标/量纲不同），其明度才是强度信息。
- **排序**：常被忽略的隐含框架信息（按数值递增、按聚类、按生物学分组）。

## 二、强度通道的感知精度（Cleveland & McGill 排序）
共同基线上的位置 > 非对齐位置 > 长度 > 角度/斜率 > 面积 > 体积 > 颜色明度/饱和度 > 色相。
用于评价设计取舍：密集矩阵（列多）常用颜色明度换信息密度；条目少时用柱高/点位置换精度。

## 三、拆解流程（按顺序执行）
1. **识别图型与方法**：每个面板的图型（热图/分组柱状图/点图/气泡图/UMAP/火山图/曼哈顿图/空间图…）；根据轴标题、注释名、P 值类型推断上游方法（如 S-LDSC、LDSC-SEG、gsMap、MAGMA、scDRS、GSEA、DESeq2）。推断须标注"推断，需核对图注"。
2. **列出数据维度**：每个面板有哪些变量（分类/层级/连续/二值），各有多少水平。
3. **构建映射表**：数据维度 → 信息类型代码（可多选）→ 视觉通道 → 本图具体元素。
4. **跨面板信息**：颜色一致性（冗余编码）、尺度递进（分子→细胞→组织→空间）、共享框架。
5. **按信息层读出结论**：S → I → M → D → T → R 逐层写 1–2 句，最后一句话总结。
6. **设计评价与替代表现形式**：指出每类信息的当前通道、优缺点、可替代通道（见第四节）。
7. **复现所需**：上游数据清单 + 作图用长格式表结构 + 推荐绘图实现（ggplot2/matplotlib 组件）。

## 四、各类信息的可选表现形式
| 类型 | 可选通道/形式 |
|---|---|
| S | 坐标位置、网格、facet/嵌套 strip（`ggh4x::facet_nested`）、面板标号、留白、边框、背景色带、dendrogram、排序策略 |
| I | 色相（定性色板）、形状、线型、纹理/斜线、彩色徽章、图例；跨面板保持一致 |
| M | 位置/长度（柱、棒棒糖、点）、面积（气泡）、明度/饱和度（热图，顺序/发散色板）、透明度、线宽、数值文本 |
| D | 星号分级、边框加粗、实心/空心、非显著置灰/降透明、显著项单独着色、阈值线 |
| T | 刻度标签、轴/图例标题、面板标题、直接标注（`ggrepel`）、箭头/callout、图标 |
| R | 色标（多量纲时分开，`ggnewscale`）、刻度、网格、阈值线、零基线、参考区间 |

## 五、输出格式
使用 `template.md` 的结构输出（中文，表格为主）。至少包含：
1. 图的总体说明（1–3 句）
2. 每个面板的映射表（数据维度 | 信息类型 | 视觉通道 | 本图元素）
3. 跨面板信息表
4. 分层结论 + 一句话总结
5. 设计评价与替代表现形式
6. 复现所需数据与长格式表结构
完整示例见 `example_genomicsem_ldsc_gsmap.md`。

## 注意
- 先放大图片细节再读数（裁剪成新的 PNG 后用 `read` 查看），不要凭印象报告星号位置或数值。
- 方法、阈值（FDR/Bonferroni）、色标含义若图中未写明，一律标注为推断。
- 不要把同一元素只归一类；多功能元素要在映射表中写出全部代码（如 "S+I"）。
