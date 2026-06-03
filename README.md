# 掼蛋计分微信 H5 小程序

这是根据 `/Users/danmuzhiyu/Downloads/guandan_score.html` 封装的本地运行版本，适合在微信内置浏览器中打开。

## 功能

- 4-16 人开局，随机 4 人上桌，其余进入候补。
- 每轮录入上桌选手得分，并校验合计必须为 0。
- 微信键盘不显示负号时，可点得分框下方的 `±` 按钮切换正负。
- 支持每轮后选择最多 2 人轮换。
- 支持中途增加选手、选手退出、撤销上一轮。
- 自动累计计分板和排名。
- 数据保存在当前浏览器本地存储中，不上传。
- 微信内导出优先使用“复制”，桌面浏览器可下载 CSV。

## 线上访问

GitHub Pages 地址：

```text
https://sherlock2040.github.io/guandan-score-wechat/
```

把这个链接发到微信、手机浏览器或群聊里，其他人即可在移动端打开使用。

## 电脑本地打开

在工作区根目录运行：

```sh
node guandan-score-wechat/serve.cjs
```

然后在电脑浏览器访问：

```text
http://127.0.0.1:8766/
```

也可以直接打开 `index.html`，但用本地网页服务更接近微信 WebView 的访问方式。

## 手机微信打开

手机和电脑需要在同一个 Wi-Fi 下。

1. 在工作区根目录运行：

```sh
node guandan-score-wechat/serve.cjs
```

2. 查看电脑局域网 IP，例如 `192.168.1.23`。
3. 在微信聊天或“文件传输助手”中发送下面这种地址并打开：

```text
http://192.168.1.23:8766/
```

如果打不开，通常是手机和电脑不在同一网络，或系统防火墙拦截了本地端口。

如果不想使用 Node，也可以在工作区根目录用 Python 启动静态服务：

```sh
python3 -m http.server 8766 --bind 0.0.0.0
```

此时访问路径是：

```text
http://127.0.0.1:8766/guandan-score-wechat/index.html
```

## 导出说明

微信内置浏览器对文件下载支持不稳定，所以页面提供“导出 → 复制”。复制后可粘贴到微信、备忘录、Excel 或 Numbers。

桌面浏览器中也可以点击“下载 CSV”。

## 验证

运行：

```sh
node guandan-score-wechat/verify.cjs
```

验证内容包括页面脚本语法、微信兼容关键点、本地保存、复制导出、零和校验和 README 打开说明。
