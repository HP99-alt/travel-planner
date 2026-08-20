# 部署到线上（永久 HTTPS 网站）

本项目是纯前端（React + Vite），数据存在浏览器 localStorage，地图用免费的 OpenStreetMap，
**不需要任何后端**，可直接部署到 Vercel / Netlify 获得永久网址。

## 方式一：GitHub 关联 Vercel（最推荐，一键）

1. 在 GitHub 新建一个空仓库（不要勾 README）。
2. 把本地代码推上去：
   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```
3. 打开 https://vercel.com → 用 GitHub 登录 → New Project → 选该仓库 → 直接 Deploy。
4. 约 1 分钟后得到 `https://<项目名>.vercel.app`，这就是永久 HTTPS 网址，手机/电脑都能开。

> 配置已写好：`vercel.json`（build 命令 + dist 输出 + SPA 回退）。改完代码 push 即自动重新部署。

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

## 说明
- 分享链接用 URL hash（`#trip=...`）编码行程，部署后依然可用，对方打开即载入。
- 地图/地理编码走 OpenStreetMap 公共服务，免费、无需 Key；个人使用足够（注意 Nominatim 速率限制）。
- 数据保存在访客自己的浏览器，换设备/清缓存不会同步——如需云同步需后续加后端。
