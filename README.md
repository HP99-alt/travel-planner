# Travel Schedule Planner

双语（English / 中文）旅行行程规划器的基础结构与界面。

## 功能（当前阶段）
- 中英双语切换，语言选择本地持久化（localStorage）
- 创建旅程：名称、目的地、开始日期、天数
- 按「天」组织行程，每天可添加按时段（时间）排列的活动
- **拖拽排序**：活动可在当天内拖拽调整顺序（HTML5 Drag API，零依赖）
- **活动分类图标**：餐饮 🍽️ / 景点 📷 / 交通 🚆 / 住宿 🏨 / 其他 📌
- **地图嵌入**：Leaflet + OpenStreetMap，每个活动可填地址并一键「定位」打点，右侧地图汇总全部地点
- **住宿管理**：酒店名、入住/退房、确认号、地址、费用；汇总在右侧面板
- **票务管理**：每个活动可记录票号/预订号、票价、币种、二维码/附件备注
- **预算统计**：按币种汇总各项活动与住宿的预计开支，显示合计与日均
- **打包清单**：侧边栏可勾选的携带物品清单，支持一键添加常用物品
- **导出与分享**：导出 PDF、复制为纯文本、生成内嵌行程的分享链接（Base64 编码进 URL hash，无需后端）
- 删除旅程 / 删除活动
- 所有数据保存在浏览器 localStorage，无需后端

## 运行
```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm run build    # 生产构建
```

## 目录结构
```
src/
  i18n/
    translations.js      # 双语文案字典
    LanguageContext.jsx  # 语言 Provider + useI18n()
  components/
    TripList.jsx         # 侧边栏：旅程列表 / 新建 / 删除
    TripForm.jsx         # 新建 / 编辑旅程表单
    Itinerary.jsx        # 按天展示行程 + 添加活动
  storage.js             # localStorage 持久化
  App.jsx                # 主布局与状态
  main.jsx               # 入口
  styles.css             # 样式
```

## 后续可扩展（暂未实现）
- 跨天拖拽、活动模板、与日历同步、云端多端同步、移动端原生封装等

## 技术说明
- 地图瓦片与地理编码均使用 OpenStreetMap / Nominatim（免费、无需 API Key）；Nominatim 有速率限制，定位为尽力而为
- 分享链接使用 `window.location.hash` 中的 Base64 编码，行程较大时链接会变长；如需更短可接后端短链服务
