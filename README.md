# Quiz App

TypeScript と Electron で作成したクイズアプリです。

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run electron
```

## ビルド

```bash
npm run build
```

## macOS 向けパッケージ作成

```bash
npm run package:mac
```

## 管理画面ログイン

管理画面の認証情報は環境変数で上書きできます。

```bash
QUIZ_ADMIN_USERNAME=admin QUIZ_ADMIN_PASSWORD=change-me npm run electron
```

公開リポジトリにする場合は、実運用の認証情報をコードや Git に含めないでください。