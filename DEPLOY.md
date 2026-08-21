# 部署到线上（永久 HTTPS 网站）

本项目是纯前端（React + Vite），数据存在浏览器 localStorage，地图用免费的 OpenStreetMap，
**不需要任何后端**，可直接部署到 Vercel / Netlify 获得永久网址。

## 当前功能一览

- 双语行程规划（中 / 英切换，localStorage 持久化）
- 按天 / 时段组织行程，活动可拖拽排序（同天内拖拽重排、**跨天拖拽自动换日期**），移动端提供「移到第 N 天」下拉作为兜底，分类图标（餐饮/景点/交通/航班/住宿/其他）
- **Day Management**：顶部一键「＋ 增加一天」延长行程、每个 Day 卡片右上「✕」删除当天（含当天行程，删除中间天会自动重排后续日期）；修改 **Trip Start Date** 后所有 Day 的日期按 `开始日期 + 天数序号` 自动重算
- 交通细分类型：选 ✈️/🚗/🚌/🚆/🚇/🚶/🚙 等（Grab · Taxi · Bus · Train · MRT · Walking · Rental Car · Other），时间轴圆点随类型显示对应图标，Advanced Details 可填 Driver / Plate / Pickup / Drop-off / Est. Fare 并继续自由增删
- 智能文本解析：粘贴「8月20日 10:00 浅草寺，14:00 银座」自动提取时间+活动并归到对应天；支持中/英/马来月份与币种自动识别（`RM/$/¥/€/£`）
- 快捷模板：东京5日游 / 周末2日游 一键预填
- 地图（Leaflet + OpenStreetMap）：地址一键定位 + 「🧭 在地图打开」外部导航深链
- **统一 Timeline 架构**：机票 ✈️ / 住宿 🏨 / 交通 🚆 与活动同为时间轴上的条目类型，单一数据源（Single Source of Truth）；每项支持开始/结束时间 + 自动时长（如 1h 30m），按开始时间自动排序
- 无限自定义字段（Advanced Details）：自由增删的 Key–Value 行，活动图片/截图上传（预览/更换/删除/**直接 Ctrl/Cmd+V 粘贴截图到图片区即上传**）
- 分类专属预设：航班 ✈️ / 住宿 🏨 / 交通 🚗 一键填入常用字段（航班号/起降/航站楼/座位/行李/预订号 · 预订号/房型/入住退房/早餐/网址 · 司机/车牌/上车下车/预估车费），仍可自由增删
- 每个条目均可编辑 / 复制 / 删除：复制会带出标题、时间、地点、图片、预算与全部自定义字段，改差异即可
- 双重预算联动：活动级预估/实际费用 + 独立预算面板（按 Food/Accom/Transport/Flights/Shopping 分类汇总、折合 MYR），并支持不挂活动的独立开销（如 Travel Insurance）
- 多币种预算（默认 MYR，内置静态参考汇率，按币种汇总 + 折合 MYR）
- 离线紧急看板（护照/签证/保险/紧急联系人/当地报警/使馆电话，存本行程、断网可读、可复制）
- 打包清单（侧边栏勾选 + 常用物品）
- 导出 PDF / 文本 / 分享链接（Base64 编码进 URL hash）
- **Excel / CSV 一键导入**：拖拽 `.xlsx/.xls/.csv` 上传 或 直接粘贴表格，双语智能列名匹配（Date/Time/Activity/Type/Address/Price/Currency/Ticket…），可手动改列、实时预览，一键批量生成行程卡片（日期自动归天、币种自动识别）
- Apple 极简视觉：毛玻璃、大圆角、微交互、深色模式手动开关（跟随系统/浅/深三态）、iPhone SafeArea 适配
- 底部弹窗（Bottom Sheet）交互

## 方式一：GitHub 关联 Vercel（最推荐，一键）

1. 在 GitHub 新建一个空仓库（不要勾 README）。
2. 把本地代码推上去（本项目已用 SSH deploy key 配置好 `origin`）：
   ```bash
   git add -A && git commit -m "..." && git push
   ```
3. 打开 https://vercel.com → 用 GitHub 登录 → New Project → 选该仓库 → 直接 Deploy。
4. 约 1 分钟后得到 `https://<项目名>.vercel.app`，这就是永久 HTTPS 网址，手机/电脑都能开。

> 配置已写好：`vercel.json`（build 命令 + dist 输出 + SPA 回退 + 安全响应头）。改完代码 push 即自动重新部署。

## 方式二：Vercel CLI（无需点网页）

```bash
npm i -g vercel
vercel            # 首次按提示登录，选项目，等待部署
vercel --prod     # 发布到生产域名
```

## 方式三：Netlify

1. 打开 https://app.netlify.com → Add new site → Import from Git → 选 GitHub 仓库。
2. Build command 填 `npm run build`，Publish directory 填 `dist`（已写在 `netlify.toml`）。
3. Deploy 完成即得永久网址。

## 已知边界（架构说明）

- **数据保存在访客自己的浏览器**，换设备 / 清缓存不会同步——如需云同步需后续加后端。
- **汇率是静态参考值**，非实时；如需实时汇率接免费 API（如 frankfurter.app）。
- **地图导航**为深链唤起外部地图 App，非站内 turn-by-turn。
- **离线紧急看板**= 本地离线可读卡片，非云端同步。
- 地图 / 地理编码走 OpenStreetMap 公共服务，免费、无需 Key（注意 Nominatim 速率限制）。
- 分享链接用 URL hash（`#trip=...`）编码行程，部署后依然可用，对方打开即载入。
