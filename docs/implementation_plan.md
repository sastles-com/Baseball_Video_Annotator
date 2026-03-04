# ビデオ注釈ツール（Video Annotation Tool） 実装計画

本計画は、野球の試合映像を1球ごとに分割し、球種や状況などのタグ付けを行って後からフィルタリング可能にするためのツールの実装について定義します。AWSへの展開や過去の運用経験を踏まえ、**React + FastAPI** をベースとしたWebアプリケーションとして構築します。

## アーキテクチャ

AWS上での運用やタグデータの履歴管理を見据え、フロントエンドとバックエンドを分離した構成とします。

- **フロントエンド:** React (Vite), TypeScript, Tailwind CSS
  - Reactは状態管理（現在の再生位置、栞、チャンク、タグなど）や複雑なUI（スライダー、コンテキストメニュー）の構築に非常に適しており、動画のシーク制御（スライダーやマスウホイール）も柔軟に実装可能です。
  - アイコン群には Lucide React を採用します。
- **バックエンド:** Python (FastAPI)
  - APIサーバーとして機能し、動画ファイルのアップロード・配信、および「過去につけたタグの履歴（サジェスト用）」や「タグ付け結果（JSON）」のデータベース（またはファイル）への保存などを担当します。

## 実装される機能（要件の網羅）

### 1. 動画再生と精密コントロール
- **ローカル/サーバー動画読み込み:** アップロードまたはサーバー上の動画ファイル（mp4等）をブラウザ上で再生します。
- **カスタムスライダー:** 任意の再生位置へのシークを実現します。
- **マウスホイール再生（スクラブ）:** 動画プレイヤー上でマウスホイールを回転させることで、動画をコマ送り・コマ戻し（または数秒スキップ）する直感的なシークを実現します。
- **ショートカットキー:** 再生/一時停止、栞の挿入、シークなどの操作をキーボードショートカットで実行可能にします。

### 2. 栞（ブックマーク）とチャンク生成
- **1球ごとの分割:** タイムライン上やショートカットキー、右クリックメニューから任意のタイミングで栞を挿入し、動画をチャンク（1球などの単位）に分割します。
- チャンクをクリックすることで、その開始位置にシークする機能を持ちます。

### 3. 多階層のタグ付け機能
野球の試合を分析するための柔軟なタグ構成を提供します。
- **動画全体のタグ（メタデータ）:** 「エネオス対日産自動車」「ピッチャー名」など、動画全体にかかわる情報。
- **特定範囲・グループのタグ:** 「3回表 日産の攻撃」など、複数のチャンクをまたぐイニング・状況タグ。
- **チャンク（1球）ごとのタグ:** 球種、コース、結果（ストライク、ボール、ヒット）などの詳細タグ。
- **右クリックメニュー:** タイムラインや動画領域で右クリックすることで、素早くタグや栞を付与できるコンテキストメニューを提供します。

### 4. タグの統一と履歴管理（誤字揺れ防止）
- **定型タグのプリセット:** 予め用意したJSONファイル（タグの雛形）を読み込み、固定のタグリストとして利用できるようにします。
- **履歴サジェスト:** 過去に入力されたタグの履歴をバックエンド（またはローカルストレージ）で管理し、タグ入力時にサジェスト（選択肢として表示）されるようにします。これにより、表記揺れを防ぎます。

### 5. データ保存
- 付与した情報をJSONで保存（ダウンロード機能、およびバックエンドAPIを通じたサーバー側への保存）。

## 開発ステップ

1. **環境構築 (React + FastAPI)**
   - フロントエンド（React/Vite）およびバックエンド（FastAPI）のプロジェクト初期化。
2. **フロントエンド：コアUIの実装**
   - 動画プレイヤー、カスタムスライダ、マウスホイールスクラブ機能の実装。
3. **フロントエンド：栞・チャンク・ショートカット・右クリックメニュー**
   - 状態管理（Zustand または React Context）の構築、およびキーボード/マウス操作フックの実装。
4. **フロントエンド・バックエンド：階層的タグ付けと履歴サジェスト**
   - UI（動画全体、イニング、1球ごと）の作成。
   - JSONファイルからの固定タグリスト読み込み機能機能の実装。
   - FastAPI 側でタグ履歴を返し、React側でオートコンプリートを実装。
5. **連携・永続化の検証**
   - 最終的なJSONの出力フォーマット確認と、全体を通した動作テスト。
## 追加機能：選択状態の持続とタグ付けの紐付け

現在の実装では、再生位置（プレイヘッド）が移動すると、その時々の位置にあるチャンクが自動的に「対象」となってしまいます。ユーザーの要望に基づき、ホイールによる微調整中も「今注目している1球（チャンク）」が切り替わらないよう、選択状態を独立させます。

### [Component Name]

#### [MODIFY] [annotationStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/annotationStore.ts)
- `selectedChunkId` を状態に追加し、現在「記憶されている」チャンクを追跡します。
- `setSelectedChunkId` アクションを追加します。

#### [MODIFY] [App.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/App.tsx)
- `jumpToBookmark` (矢印キーやFW/REVボタン) が実行された際に、移動先のチャンクを `selectedChunkId` として記憶するように変更します。
- `handleContextMenu` (右クリック) 時、もし `selectedChunkId` が設定されていれば、再生位置に関わらずそのチャンクをタグ付けの対象とするように変更します。

#### [MODIFY] [Timeline.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/Timeline.tsx)
- タイムラインの背景にあるチャンクの可視化部分で、`selectedChunkId` に一致するものを強調表示（例：明るい枠線や強い背景色）します。

#### [MODIFY] [ChunkList.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/ChunkList.tsx)
- リスト内の各チャンクに対して、選択状態に応じたハイライト表示を適用します。
- チャンクをクリックした際にも `selectedChunkId` が更新されるようにします。

## 追加修正：操作性と検知精度の改善

### [Component Name]

#### [MODIFY] [VideoPlayer.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/VideoPlayer.tsx)
- ホイールスクロールによるシーク方向を逆にします（`e.deltaY` の符号を反転）。

#### [MODIFY] [videoStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/videoStore.ts)
- `detectionThreshold` の初期値を `15.0` から `50.0` に変更します。

## 追加機能：ズームされたタイムライン表示（詳細ビュー）

動画全体を俯瞰するタイムラインに加え、現在の再生位置（プレイヘッド）周辺を拡大して表示する「詳細タイムライン」を追加します。これにより、短いチャンクの確認や調整が容易になります。

### [Component Name]

#### [MODIFY] [Timeline.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/Timeline.tsx)
- 定数 `WINDOW_SIZE` (例: 60秒) を定義し、表示範囲とします。
- 現在の再生時間 `currentTime` を中心とした表示開始時間 `windowStart` を計算します。
- 「全体ビュー」の下に「詳細ビュー」を追加します。
- 詳細ビューでは、1秒あたりのピクセル数を大きく取り、チャンクやブックマークを正確に表示します。
- プレイヘッドは常に詳細ビューの中央（または状況に応じた位置）に固定され、背景がスライドするように実装します。

## 追加機能：設定の永続化と元に戻す（Undo）機能

### [Component Name]

#### [MODIFY] [videoStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/videoStore.ts)
- `detectionThreshold` の初期値を `localStorage` から読み込むように変更します。
- `setDetectionThreshold` 時に `localStorage` に保存します。

#### [MODIFY] [annotationStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/annotationStore.ts)
- 削除されたブックマークを一時的に保持する `history` 状態を追加します（単純なスタック形式）。
- `removeBookmark` 時に、削除対象を履歴に追加します。
- `undo` アクションを追加し、履歴から最新の項目を復元します。

#### [MODIFY] [App.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/App.tsx)
- `ctrl+z` 修飾キーを監視し、`annotationStore` の `undo` を呼び出すグローバルショートカットを追加します。

## 追加機能：設定モーダルとタグプリセット管理

サイドバーをすっきりさせ、詳細な設定（感度、タグリストの編集）を「設定ボタン（歯車）」から開くモーダルに集約します。

### [Component Name]

#### [NEW] [SettingsModal.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/SettingsModal.tsx)
- 感度調整スライダーをサイドバーからこちらに移動します。
- タグリスト（ショートカット等で使用するプリセット）を表示・編集できるインターフェースを追加します。

#### [NEW] [uiStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/uiStore.ts)
- `isSettingsOpen` 状態を管理します。

#### [MODIFY] [App.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/App.tsx)
- サイドバー内の感度スライダーを削除します。
- `SettingsModal` を最上位に追加します。
- サイドバーの歯車ボタンをクリックした際に設定モーダルを開くようにします。

## 追加機能：動的タグカテゴリ管理

「球種」「結果」だけでなく、任意のカテゴリ（カウント、判定など）をユーザーが定義・編集できるようにします。

### [Component Name]

#### [MODIFY] [annotationStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/annotationStore.ts)
- `pitchTags`, `resultTags` を廃止し、`tagPresets: Record<string, { label: string, tags: string[] }>` に統合します。
- カテゴリ自体の追加・削除・名前変更を行うメソッドを追加します。

#### [MODIFY] [SettingsModal.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/SettingsModal.tsx)
- `tagPresets` をループして、カテゴリごとの設定セクションを動的にレンダリングします。
- 新しいカテゴリを作成するインターフェースを追加します。

#### [MODIFY] [ContextMenu.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/ContextMenu.tsx)
- `tagPresets` の全カテゴリをコンテキストメニューに動的に表示します。

## 追加機能：JSONタグインポート

ユーザーが `tags.json` をアップロードすることで、カテゴリとタグを一括で設定できるようにします。

### [Component Name]

#### [MODIFY] [annotationStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/annotationStore.ts)
- `importTagPresets: (presets: Record<string, { label: string, tags: string[] }>) => void` を追加します。

#### [MODIFY] [SettingsModal.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/SettingsModal.tsx)
- ファイルアップロード用の `input type="file"` とボタンを追加します。
- JSONファイルを読み込み、バリデーションした後に `importTagPresets` を呼び出します。

## 追加機能：バックエンドURL設定

フロントエンドがホストされている環境（例：Lolipop）から、異なる場所で動いているバックエンド（例：ローカルPC、別サーバー）に接続できるようにします。

### [Component Name]

#### [MODIFY] [videoStore.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/store/videoStore.ts)
- `backendUrl` 状態を追加します（デフォルトは `http://localhost:8000`）。
- `localStorage` で永続化します。

#### [MODIFY] [SettingsModal.tsx](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/components/SettingsModal.tsx)
- バックエンドURLを入力・保存できる設定項目を追加します。

#### [MODIFY] [useAnalysis.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/hooks/useAnalysis.ts)
- `fetch` のベースURLを `videoStore` の `backendUrl` を使用するように変更します。

## 追加機能：チャンク（分割）アップロード機能

ロリポップ！マネージドクラウド等の環境におけるファイルサイズ上限（413 Request Entity Too Large, 約100MB）を回避するため、フロントエンドで動画を細かく分割して送信し、バックエンドで結合する仕組みを導入します。

### [Component Name]

#### [MODIFY] [useAnalysis.ts](file:///Users/katano/work/Baseball/video_analyzer/frontend/src/hooks/useAnalysis.ts)
- `detectCuts` メソッド内で、動画ファイル（`Blob`）を一定サイズ（例: 1MB）ごとに `slice` メソッドを用いて分割します。
- **[UPDATE]** ロリポップのプロキシ制限回避のため、バイナリを **Base64** に変換し、`application/json` 形式で `POST /api/upload-chunk` へ送信します。
- ユニークな `sessionId`（UUID等）を生成し、サーバー側の結合キーとします。
- 各チャンクを順番に送信し、プログレスバーに「アップロード中...」として 0-50% の進捗を表示します。
- すべてのチャンクが送信完了したら、解析の開始（50-100%）を指示します。

#### [MODIFY] [main.py](file:///Users/katano/work/Baseball/video_analyzer/backend/main.py)
- **`POST /api/upload-chunk`**: JSON（Base64）を受け取り、デコードして `UPLOAD_DIR`（ディスク領域）の一時ファイルに追記します。
- **`POST /api/detect-cuts-chunked`**: 組み立てられたファイルを OpenCV で解析します。
- **[FIX]** サーバーの `/tmp` 容量不足（256MB）に対応するため、必ずディスクベース host の `/uploads` ディレクトリを使用するように実装を統合しました。
