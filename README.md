# SBTI 测试

> 一个非官方的 SBTI 人格测试镜像站，在原版内容基础上重构了 UI 和前端体验。

**在线体验：** https://sbti.unun.dev

---

## ✨ 本版本改进

相比原始版本，本镜像做了以下改动：

- **全站 UI 重设计** — 首页、答题页、结果页均重新设计，采用绿色自然风格设计语言
- **结果图保存** — 基于 [html2canvas](https://html2canvas.hertzen.com/) 实现一键截图，支持 iOS 长按保存 / Android 下载
- **Hash 路由** — 支持 `#result/TYPE` 直链跳转结果页（如 `#result/CTRL`），便于分享和调试
- **新增类型图片** — 补充了 NPC、SIGMA、VOID、REELS、GAS、GHOST、RUMI、404 共 8 种类型的配图
- **Bug 修复** — 修复图片不展示、分享功能失效、回顶部按钮跳首页等多处问题

## 📁 项目结构

```
SBTI-test/
├── index.html          # 主页面（首页 / 答题 / 结果）
├── css/
│   └── style.css       # 全站样式
├── js/
│   ├── data.js         # 题目数据 & 类型库 & 图片映射
│   ├── engine.js       # 计分引擎
│   ├── ui.js           # 页面交互 & 路由
│   └── share.js        # 截图保存功能
└── image/              # 35 种人格类型配图
```

## 🚀 本地运行

纯静态项目，无需构建，直接用任意静态服务器打开即可：

```bash
# 使用 VS Code Live Server 插件
# 或者
npx serve .
# 或者
python3 -m http.server 8080
```

## 🔗 Hash 路由

可通过 URL hash 直接访问指定类型的结果页，便于调试或生成分享链接：

```
https://sbti.unun.dev/#result/CTRL
https://sbti.unun.dev/#result/SIGMA
https://sbti.unun.dev/#test
```

## 🙏 致谢

- 测试题目及人格类型内容来自 B站 UP 主 **[@蛆肉儿串儿](https://www.bilibili.com/video/BV1LpDHByET6/)**，版权归原作者所有
- 本仓库仅为技术学习与 UI 改进，不用于任何商业用途

## 📝 License

本仓库代码以 [MIT](https://opensource.org/licenses/MIT) 协议开源，**测试内容版权归原作者所有**，如原作者有异议请提 Issue 或联系删除。
