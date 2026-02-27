# HTML構造化とポータルサイト運用ルール

**作成日**: 2025-12-25  
**適用範囲**: プロジェクト内の全HTMLドキュメント、ポータルページ、可視化結果

---

## 1. ディレクトリ構造とURL設計

Web公開環境（Lolipop FTP）との整合性を保つため、以下の構造を厳守する。

```
aco02/
├── index.html                  # トップポータル (http://tajmahal.mond.jp/aco02/)
├── docs/                       # ドキュメント群
│   └── theory/                 # 理論資料 (.html)
├── results/                    # 実験結果
│   ├── index.html              # 結果サマリーポータル (../aco02/results/index.html)
│   ├── phase0/                 # 各フェーズの結果
│   ├── phase1/
│   └── phase_theory_aco/       # 理論検証グラフ
└── upload_with_curl.sh         # アップロードスクリプト
```

### 必須リンク構造
- **トップポータル (`index.html`)**: プロジェクト全体への入口。「Docs」と「Results」への主要な導線を持つこと。
- **Resultsポータル (`results/index.html`)**: 全ての実験結果へのインデックス。**必ずページ上部に `../index.html` への「戻るリンク」を配置すること。**

---

## 2. HTMLテンプレートとスタイル

視認性と統一感を保つため、以下のCSSスタイルを原則として使用する。

### 基本スタイル
```css
body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px; color: #333; }
h1 { border-bottom: 3px solid #0056b3; padding-bottom: 10px; color: #0056b3; }
h2 { border-left: 5px solid #0056b3; padding-left: 15px; margin-top: 40px; color: #444; }
a { text-decoration: none; color: #007bff; font-weight: bold; }
a:hover { text-decoration: underline; }
```

### カードデザイン (ドキュメント/結果リスト用)
```css
.card { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.tag { display: inline-block; background: #e7f3ff; color: #007bff; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; }
.meta { font-size: 0.85em; color: #666; margin-top: 4px; }
```

### ナビゲーション (Resultsポータル用)
```html
<p><a href="../index.html">← ACO02 ホームへ戻る</a></p>
```

---

## 3. アップロード運用ルール

### `upload_with_curl.sh` の管理
新しいディレクトリ（例: `results/phase3`）やルート直下の新しいHTMLファイルを作成した場合は、必ずスクリプト内の以下のセクションを更新すること。

1.  **Docs**: 自動的に再帰探索されるため修正不要（`docs/` 以下であれば）。
2.  **Results**: `for phase in ...` のループに対象ディレクトリを追加する。
3.  **Root Files**: `index.html` 等、個別に追加する。

### リモートパスの強制
スクリプト内では、ローカルのファイルパスに関わらず、アップロード先（リモートパス）には必ずプレフィックス `aco02/` を付与すること。

```bash
# 正しい例
curl -T "$local_file" "ftp://${FTP_HOST}/aco02/${remote_path}" ...
```

---

## 4. 可視化結果 (Plotly) のルール

- **保存形式**: スタンドアローンHTML (`fig.write_html()`)。
- **メタデータ**: `src.utils.visualization.add_analysis_to_html` を使用し、必ず以下の3点を埋め込むこと。
    1.  **Purpose (目的)**: 何を検証するためのグラフか。
    2.  **Expectation (期待)**: 理論上どうなるはずか。
    3.  **Evaluation (評価)**: 結果はどうだったか、理論と一致したか。

---
**最終更新**: 2025-12-25
