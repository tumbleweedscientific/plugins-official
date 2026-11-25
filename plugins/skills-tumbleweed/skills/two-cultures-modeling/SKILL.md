---
name: two-cultures-modeling
title: Two-Culture Modeling
description: Frame, validate, and cross-check statistical data models (inference, differential testing, dose-response, survival) and algorithmic ML models (prediction, QSAR, biomarker panels) in computational biology and chemistry. Use before fitting regressions, running hypothesis tests, or training predictive models on tabular, omics, or molecular data.
license: Apache-2.0
metadata:
  tumbleweed:
    title: Two-Culture Modeling
    domains:
      - cheminformatics
      - computational-chemistry
      - medicinal-chemistry
      - genomics
      - transcriptomics
      - single-cell
      - clinical
      - lab-data
    tags:
      - statistics
      - machine-learning
      - biostatistics
      - qsar
      - inference
      - two-cultures
    maturity: stable
    citations:
      - "Breiman, L. (2001). Statistical Modeling: The Two Cultures. Statistical Science, 16(3), 199-231. https://doi.org/10.1214/ss/1009213726"
    starterPrompts:
      - "帮我对这组单细胞多供体队列做差异表达分析，并检查是否存在伪重复或批次混杂"
      - "Build a QSAR model for IC50 from this assay table using a leak-free scaffold split and a regularized linear baseline"
      - "我有 80 例患者的转录组与临床随访数据，想找独立预后因素并做风险分层，该用统计推断模型还是机器学习？"
      - "Fit 4PL dose-response curves for these compounds, inspect asymptote convergence and censored values, and flag outliers"
    requires:
      environment: web
      gpu: false
      tools: []
      dataSources: []
      models: []
      scienceModels: []
      credentials: []
      longRunning: false
    inputs:
      - csv
      - tsv
      - json
    outputs:
      - report
---

# 双文化统计与机器学习建模 (Two-Culture Modeling)

本技能将 Leo Breiman 在 *Statistical Modeling: The Two Cultures* (2001) 中提出的范式反思转化为科研数据分析的执行规程。在编写第一行 `R` 或 `Python` 建模代码前，必须显式区分并灵活协同两种建模文化：

- **数据建模文化 (Data Modeling Culture)**：关注数据生成机制、参数估计、置信区间与假设检验，核心风险是**分布/独立性假设违背与伪因果解释**。
- **算法建模文化 (Algorithmic Modeling Culture)**：将复杂自然机制视为黑盒，直接优化样本外预测精度，核心风险是**验证泄漏、过拟合、超适用域外推与算力失配**。

---

## 按需加载领域专有护栏

在进入具体建模前，根据数据所属学科调用 `load_skill` 读取对应的领域检查卡：

- **生信与计算生物**（测序 Count 矩阵、Bulk/单细胞/空间组学差异分析、生存分析、临床队列、$p \gg n$ 组学标志物筛选、蛋白质/序列嵌入预测）：先调用 `load_skill(name="two-cultures-modeling", file="references/compbio.md")`。
- **计算化学与药物发现**（剂量-反应 4PL 曲线、$\text{IC}_{50}/\text{EC}_{50}/K_i$ 分析、酶动力学、同系物 SAR/Free-Wilson、QSAR/ADMET 预测、虚拟筛选、多精度分子模拟）：先调用 `load_skill(name="two-cultures-modeling", file="references/compchem.md")`。

---

## 第一步：前置定性与路由 (Frame & Route)

动手写代码前，先用简明明晰的几句话完成以下四维定性（若用户的真实诉求在“机制解释”与“预测打分”之间模糊且会改变技术路线，先用 `ask_user` 确认）：

| 判据维度 | 优先走「数据建模」 | 优先走「算法建模」 | 走「双文化融合」 |
| :--- | :--- | :--- | :--- |
| **1. 核心科学问题** | 回答“为什么 / 效应方向与大小 / 控制混杂后是否显著”（差异表达、队列关联、药效参数拟合） | 回答“未知样本是多少 / 如何高通量排序筛选”（化合物活性预测、细胞自动注释、预后风险打分） | 既要可靠的样本外预测，又要检验关键变量效应或给出严格预测区间 |
| **2. 样本量 $n$ 与维度 $p$** | 小样本（如 $n < 100$）、高测量噪声、有明确物理化学方程或统计分布先验 | 样本充足、存在强非线性或高阶特征交互、异构多模态输入 | $p \gg n$ 高维小样本（需强正则化参数模型 + 严格嵌套交叉验证） |
| **3. 泛化与外推需求** | 需要向训练数值范围之外做**趋势/浓度/时间外推**（必须依赖机理或参数函数形式） | 仅在训练分布覆盖的领域内做插值预测或排序 | 用机理方程约束渐近边界，用非参数/残差模型修正局部偏差 |
| **4. 数据与算力可行性** | CPU 秒级即可精确求解解析/似然估计与置信区间 | 需评估样本量是否支撑模型自由度，以及训练/调参耗时是否在沙箱预算内 | 先跑秒级参数基线定锚，再按算力阶梯决定是否升级复杂算法 |

---

## 第二步：分文化强制检查清单

### 分支 A：数据建模 (Data Modeling) 五项必查

1. **生成分布与边界形态**：响应变量是连续正态、偏态正值、离散测序计数（过度离散负二项）、二元事件，还是含上下限删失（如生存右删失、`> 100 μM` 截断活性）？严禁未经检验直接把计数或删失数据塞入普通最小二乘（OLS）或正态 $t$ 检验。
2. **独立性结构（最高频翻车点）**：观测值之间真的独立吗？检查是否存在同一患者多细胞/多时间点采样、多孔板/批次聚类、纵向重复测量或同母核分子簇。若独立性不成立，必须采用**样本级聚合（如 Pseudobulk）、混合效应模型（Mixed-Effects）或聚类稳健标准误（Cluster-robust SE）**。
3. **混杂、共线性与对撞偏差**：若需解释回归系数，明确哪些是必须控制的混杂变量（Confounders，如年龄、批次、分子量/脂水分配系数基线），避免纳入结果下游的对撞变量（Colliders），并检查方差膨胀因子（VIF）以防多重共线性导致系数符号反转。
4. **缺失机制与反 $p$-hacking**：
   - 判断缺失数据属完全随机（MCAR）、随机（MAR）还是非随机（MNAR，如低于检测限未检出），避免直接删行引发选择偏差。
   - **严禁在同一批数据上先按相关性/单变量显著性挑特征，再重跑回归汇报裸 $p$ 值**；高通量假设检验必须汇报多重检验校正结果（如 BH-FDR $q$ 值）。
5. **事后诊断与回退机制**：拟合后必须检查残差图、正态/同方差/比例风险等核心假设及高杠杆点（如 Cook's distance）。若核心假设严重违背，显式说明并回退至广义线性模型、稳健估计（Huber/Sandwich SE）、秩次非参数方法或样条/GAM。

### 分支 B：算法建模 (Algorithmic Modeling) 五项必查

1. **数据规模与算力阶梯可行性**：
   - 样本量是否足以支撑所选模型复杂度？（例如几十个样本上深度神经网络或无约束超参搜索只会拟合噪声。）
   - 按算力成本分层执行：**Tier 1（秒级，前台 Notebook）** 正则化线性模型、浅层树集成、2D 指纹/常规组学矩阵 $\rightarrow$ **Tier 2（分钟级，沙箱后台 `jobs`）** 嵌套交叉验证、大规模置换检验、3D 构象/对接 $\rightarrow$ **Tier 3（GPU / `scienceModels`）** 结构预测、蛋白质/分子基础模型推理、分子动力学。重算力步骤执行前先向用户说明预计耗时与资源需求。
2. **防泄漏验证切分（Leak-Free Split，头号防线）**：
   - **严禁默认无脑使用随机 `K-Fold`！** 必须按数据生成结构选择分组切分（`GroupKFold`：同一供体/靶点不跨集）、母核/聚类切分（`Scaffold / Cluster Split`）或时间切分（`Temporal Split`）。
   - 所有预处理（标准化、缺失插补、批次校正、差异特征初筛、降维）**必须严格封装在交叉验证的每一个训练折内部**；若同时调优超参数与评估泛化误差，在小样本高维场景下使用 **Nested CV**。
3. **评估指标对齐与概率校准**：
   - 类别不平衡时优先汇报 **PR-AUC、MCC 或固定假阳性率下的召回率**，而非单纯看 Accuracy 或虚高的 ROC-AUC。
   - 若下游依赖模型输出的“概率数值”做临床或实验决策（而非仅排序），必须检验**概率校准度（Calibration Curve / Brier Score）**，必要时做 Platt scaling 或 Isotonic 校准。
4. **罗生门效应 (Rashomon Effect) 与解释克制**：
   - 同一数据集往往存在多个结构不同但预测精度相近的模型。使用 SHAP 或 Permutation Importance 解释时，必须检查共线特征分摊效应与跨折稳定性。
   - **在文字结论中严格将特征重要性表述为“模型预测贡献”，绝不等同于生物学或化学上的因果机制。**
5. **适用域 (Applicability Domain) 与不确定性量化**：
   - 对新样本输出预测时，检查其是否落在训练分布覆盖范围内（如特征空间距离或分子指纹相似度），对域外样本给出明确警示，并优先使用交叉验证残差或**保形预测（Conformal Prediction）**提供预测区间。

---

## 第三步：双文化交叉探针 (Two-Culture Cross-Check)

不要把两种文化当成非黑即白的对立——在分析中主动用一种文化去校验另一种文化：

1. **用算法探针检验数据模型是否严重漏设 (Misspecification Probe)**
   当主任务是数据建模（例如拟合了线性/广义线性模型）且样本量允许（通常 $n \ge 50$）时，在相同防泄漏切分下顺手跑一个轻量非参数树集成（如 Random Forest 或浅层 GBDT）比较样本外预测误差：
   - 若两者样本外表现接近：说明简单参数结构已充分捕捉信号，当前参数推断稳健可信。
   - 若树模型预测力大幅领先参数模型：说明参数模型**遗漏了强非线性关系或关键交互项**（Breiman 批评的核心盲区），需引入样条项（GAM）、物理变换或显式交互项后再做机制解释。
2. **用简单参数基线约束算法复杂度 (Parsimony Baseline)**
   当主任务是算法建模时，**必须先在同一验证切分上跑一个最简单的正则化线性/逻辑回归（Ridge / Lasso / ElasticNet）作为 Baseline**：
   - 汇报复杂模型相对线性基线的真实净增益（配对折间差异或 Bootstrap 置信区间）。
   - 若复杂黑盒相比线性基线并无实质提升，优先推荐简单、可解释且不易过拟合的模型。
3. **现代融合工具选配**
   - **广义可加模型 (GAM / EBM)**：兼顾非线性拟合与单变量可视化解释。
   - **双重/去偏机器学习 (Double Machine Learning)**：当混杂变量维度高且关系非线性时，用机器学习拟合干扰项（Nuisance functions），再用正交化得分做统计推断与置信区间估计。
   - **保形预测 (Conformal Prediction)**：无需分布假设即可为任意算法模型包裹具有有限样本覆盖率保证的预测区间。

---

## 第四步：结果呈现与诚实汇报

- **先给结论与核心定量指标**：带齐单位、样本量 $n$（同时注明独立个体数与观测总行数）、效应量、置信区间/校准后 $q$ 值或样本外验证集指标（注明切分方式）。
- **可视化诊断证据**：优先使用原生展示卡片（`show_display`）或生成的诊断图（`send_file`）展示数据分布、残差/校准曲线、拟合曲线叠加原始数据点、或随机切分 vs. 严格切分的性能对比。
- **点明最关键的一条局限**：不套话铺陈，精准指出决定结论可信度边界的头号限制（如有效独立样本量不足、潜在未测混杂、批次共线或化学母核适用域受限）。
