# 🎵 3D 音频可视化

**Web Audio API + Three.js** 实时音频可视化，麦克风采集，频谱柱 + 波形环 + 节拍粒子。

## 🎮 在线体验

**[👉 点此打开](https://is-cau.github.io/AudioViz/)**

## 🎤 使用方式

1. 打开页面 → **允许麦克风权限**
2. 播放音乐或对着麦克风说话
3. 如果没有麦克风，内置**节拍器自动演示**

## ✨ 可视化元素

| 元素 | 说明 |
|------|------|
| 🏗️ **64根频谱柱** | 环形排列，高度随频率能量实时变化 |
| 🌈 **颜色渐变** | 蓝紫→粉红，亮度随音量变化 |
| 🔵 **波形环** | 256点实时波形，随节拍扩张收缩 |
| ✨ **节拍粒子** | 低频能量检测，触发彩色粒子爆发 |
| 💡 **中心光球** | 随低频脉动 |
| 📷 **相机微动** | 缓慢环绕增强空间感 |

## 🔬 技术原理

- **Web Audio API**：`getUserMedia` → `AnalyserNode` → 频域 + 时域数据
- **节拍检测**：低频能量(0-8bin)与历史均值比较，超过 1.4× 阈值触发
- **Three.js 渲染**：64 个 BoxGeometry 频谱柱 + Line 波形环 + Points 粒子
- **无麦克风降级**：内置方波振荡器 + 0.5s 间隔脉冲模拟节拍

## 🛠️ 本地运行

```bash
git clone https://github.com/is-cau/AudioViz.git
cd AudioViz
npm install
npm run dev
```

## 📜 技术栈

Web Audio API · Three.js · TypeScript · Vite · GitHub Pages
