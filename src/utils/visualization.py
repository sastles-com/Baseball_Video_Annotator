"""
可視化ユーティリティ (Plotly + HTML出力)

SSH環境での開発を想定し、全ての可視化結果をHTMLファイルとして出力します。
"""
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from pathlib import Path


def add_analysis_to_html(html_path, purpose, expectation, evaluation, highlights=None, summary_title=None):
    """
    既存のPlotly HTMLファイルに、分析メタデータ（タイトル、目的、期待、評価、ハイライト）を追記する。
    """
    if not Path(html_path).exists():
        print(f"Warning: HTML file not found: {html_path}")
        return

    # HTML読み込み
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # タイトル部分
    title_html = ""
    if summary_title:
        title_html = f"""
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #007bff;">
            <h2 style="margin: 0; color: #333;">🏷️ {summary_title}</h2>
        </div>
        """

    # ハイライト部分のHTML生成
    highlights_html = ""
    if highlights and isinstance(highlights, list) and len(highlights) > 0:
        items = "".join([f"<li style='margin-bottom: 5px;'>{item}</li>" for item in highlights])
        highlights_html = f"""
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc;">
            <strong>✨ 結果のハイライト (Highlights):</strong>
            <ul style="margin: 5px 0 0 20px; color: #333; padding-left: 20px;">
                {items}
            </ul>
        </div>
        """

    # 追記するHTMLブロックを作成
    analysis_html = f"""
    <div style="margin: 20px; padding: 20px; background-color: #f8f9fa; border-left: 5px solid #007bff; border-radius: 4px; font-family: sans-serif;">
        {title_html}
        <h3 style="margin-top: 0; color: #007bff;">📊 分析レポート</h3>
        <div style="margin-bottom: 15px;">
            <strong>🎯 目的 (Purpose):</strong>
            <p style="margin: 5px 0 0 10px; color: #333;">{purpose}</p>
        </div>
        <div style="margin-bottom: 15px;">
            <strong>🔭 期待 (Expectation):</strong>
            <p style="margin: 5px 0 0 10px; color: #333;">{expectation}</p>
        </div>
        <div>
            <strong>🧐 評価基準 (Evaluation Criteria):</strong>
            <p style="margin: 5px 0 0 10px; color: #333;">{evaluation}</p>
        </div>
        {highlights_html}
        <div style="margin-top: 15px; font-size: 0.8em; color: #888;">
            ※ 不明な点はオーナーに確認すること
        </div>
    </div>
    """

    # <body>の直後に挿入（グラフの上に表示）
    if "<body>" in content:
        new_content = content.replace("<body>", "<body>" + analysis_html, 1)
    else:
        new_content = analysis_html + content

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"  + Analysis metadata added to {html_path}")


def plot_velocity_field(vx, vy, title="速度場", output_path=None, analysis=None):
    """
    流線と大きさで速度場を可視化

    Parameters:
    -----------
    analysis : dict, optional
        {"purpose": str, "expectation": str, "evaluation": str}
        指定された場合、HTMLにメタデータを追記する。
    """
    # ... (前略) ...
    # 大きさを計算
    magnitude = np.sqrt(vx**2 + vy**2)

    # グリッド座標を作成
    x = np.arange(vx.shape[1])
    y = np.arange(vx.shape[0])
    X, Y = np.meshgrid(x, y)

    # サブプロットを作成（1行3列）
    fig = make_subplots(
        rows=1,
        cols=3,
        subplot_titles=("速度の大きさ", "流線", "ベクトル場"),
        specs=[[{"type": "heatmap"}, {"type": "scatter"}, {"type": "scatter"}]],
    )

    # 1. 速度の大きさ（ヒートマップ）
    fig.add_trace(
        go.Heatmap(z=magnitude, colorscale="Viridis", showscale=True, name="大きさ"),
        row=1,
        col=1,
    )

    # 2. 流線（Plotlyのstreamlineはないため、矢印で近似）
    step = max(1, vx.shape[0] // 20)
    fig.add_trace(
        go.Scatter(
            x=X[::step, ::step].flatten(),
            y=Y[::step, ::step].flatten(),
            mode="markers",
            marker=dict(
                color=magnitude[::step, ::step].flatten(), colorscale="Viridis", size=5
            ),
            name="流線",
        ),
        row=1,
        col=2,
    )

    # 3. ベクトル場（矢印で表示）
    for i in range(0, vx.shape[0], step):
        for j in range(0, vx.shape[1], step):
            fig.add_annotation(
                x=j,
                y=i,
                ax=j + vx[i, j] * 2,
                ay=i + vy[i, j] * 2,
                xref="x3",
                yref="y3",
                axref="x3",
                ayref="y3",
                showarrow=True,
                arrowhead=2,
                arrowsize=1,
                arrowwidth=1,
                arrowcolor="blue",
                opacity=0.6,
            )

    # レイアウト設定
    fig.update_layout(title_text=title, height=500, showlegend=False)

    # HTML出力
    if output_path is None:
        output_path = Path("results/figures/comparisons/velocity_field.html")
    else:
        output_path = Path(output_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(output_path))
    print(f"✓ 速度場を保存: {output_path}")

    # 分析メタデータの追記
    if analysis:
        add_analysis_to_html(output_path, 
                           analysis.get("purpose", "N/A"),
                           analysis.get("expectation", "N/A"),
                           analysis.get("evaluation", "N/A"))

    return fig, output_path


def plot_error_comparison(v_true, v_pred, title="速度場の誤差比較", output_path=None, analysis=None):
    """
    真値と予測速度場の誤差を可視化

    Parameters:
    -----------
    analysis : dict, optional
        {"purpose": str, "expectation": str, "evaluation": str}
    """
    vx_true, vy_true = v_true
    vx_pred, vy_pred = v_pred

    # 誤差計算
    error_x = vx_pred - vx_true
    error_y = vy_pred - vy_true
    error_mag = np.sqrt(error_x**2 + error_y**2)

    # メトリクス計算
    L2_error = np.linalg.norm(error_mag) / np.linalg.norm(
        np.sqrt(vx_true**2 + vy_true**2)
    )

    # サブプロットを作成（2行2列）
    fig = make_subplots(
        rows=2,
        cols=2,
        subplot_titles=(
            "真の速度",
            "予測速度",
            f"誤差の大きさ (L2={L2_error:.4f})",
            "誤差分布",
        ),
        specs=[
            [{"type": "heatmap"}, {"type": "heatmap"}],
            [{"type": "heatmap"}, {"type": "histogram"}],
        ],
    )

    # 1. 真の速度（ヒートマップ）
    fig.add_trace(
        go.Heatmap(
            z=np.sqrt(vx_true**2 + vy_true**2),
            colorscale="Viridis",
            showscale=True,
            name="真値",
        ),
        row=1,
        col=1,
    )

    # 2. 予測速度（ヒートマップ）
    fig.add_trace(
        go.Heatmap(
            z=np.sqrt(vx_pred**2 + vy_pred**2),
            colorscale="Viridis",
            showscale=True,
            name="予測",
        ),
        row=1,
        col=2,
    )

    # 3. 誤差の大きさ（ヒートマップ）
    fig.add_trace(
        go.Heatmap(z=error_mag, colorscale="Hot", showscale=True, name="誤差"),
        row=2,
        col=1,
    )

    # 4. 誤差分布（ヒストグラム）
    fig.add_trace(go.Histogram(x=error_mag.flatten(), nbinsx=50, name="分布"), row=2, col=2)

    # レイアウト設定
    fig.update_layout(title_text=title, height=800, showlegend=False)

    # HTML出力
    if output_path is None:
        output_path = Path("results/figures/comparisons/error_comparison.html")
    else:
        output_path = Path(output_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.write_html(str(output_path))

    print(f"✓ 誤差比較を保存: {output_path}")
    print(f"  L2相対誤差: {L2_error:.4f}")

    # 分析メタデータの追記
    if analysis:
        add_analysis_to_html(output_path, 
                           analysis.get("purpose", "N/A"),
                           analysis.get("expectation", "N/A"),
                           analysis.get("evaluation", "N/A"))

    return fig, L2_error, output_path


def plot_pheromone_field(tau, title="フェロモン場", output_path=None):
    """
    フェロモン場を可視化

    Parameters:
    -----------
    tau : ndarray
        フェロモン場
    title : str
        図のタイトル
    output_path : str or Path, optional
        HTML出力パス。指定されない場合は "results/figures/pheromone_field.html"

    Returns:
    --------
    fig : plotly.graph_objects.Figure
        Plotlyの図オブジェクト
    output_path : Path
        実際に保存されたファイルパス
    """
    fig = go.Figure(
        data=go.Heatmap(z=tau, colorscale="Viridis", colorbar=dict(title="フェロモン濃度"))
    )

    fig.update_layout(title_text=title, height=600, xaxis_title="x", yaxis_title="y")

    # HTML出力
    if output_path is None:
        output_path = Path("results/figures/pheromone/pheromone_field.html")
    else:
        output_path = Path(output_path)

    # ディレクトリを作成
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # HTMLファイルとして保存
    fig.write_html(str(output_path))

    print(f"✓ フェロモン場を保存: {output_path}")

    return fig, output_path


def plot_binary_image(B, title="バイナリPIT画像", output_path=None):
    """
    バイナリPIT画像を可視化

    Parameters:
    -----------
    B : ndarray (binary)
        バイナリ画像
    title : str
        図のタイトル
    output_path : str or Path, optional
        HTML出力パス。指定されない場合は "results/figures/binary_image.html"

    Returns:
    --------
    fig : plotly.graph_objects.Figure
        Plotlyの図オブジェクト
    output_path : Path
        実際に保存されたファイルパス
    """
    fig = go.Figure(
        data=go.Heatmap(
            z=B.astype(int),
            colorscale=[[0, "white"], [1, "black"]],
            showscale=False,
        )
    )

    coverage = B.sum() / B.size
    fig.update_layout(
        title_text=f"{title} (カバレッジ: {coverage:.2%})",
        height=600,
        xaxis_title="x",
        yaxis_title="y",
    )

    # HTML出力
    if output_path is None:
        output_path = Path("results/figures/pit/binary_image.html")
    else:
        output_path = Path(output_path)

    # ディレクトリを作成
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # HTMLファイルとして保存
    fig.write_html(str(output_path))

    print(f"✓ バイナリ画像を保存: {output_path}")

    return fig, output_path


if __name__ == "__main__":
    # 簡単な動作確認
    print("可視化ツールの動作確認")
    print("=" * 60)

    from flow_fields import taylor_green_vortex
    from pit_generator import generate_pit_image

    # Taylor-Green渦を生成
    nx, ny = 64, 64
    vx, vy = taylor_green_vortex(nx, ny, Re=100, t=0.0)

    print(f"速度場の形状: {vx.shape}")
    print()

    # 1. 速度場の可視化
    print("1. 速度場を可視化中...")
    fig, path = plot_velocity_field(vx, vy, title="Taylor-Green渦")
    print()

    # 2. PIT画像を生成して可視化
    print("2. PIT画像を生成中...")
    np.random.seed(42)
    B = generate_pit_image(vx, vy, n_particles=500, dt=0.01, n_steps=10)
    fig, path = plot_binary_image(B, title="Taylor-Green渦のPIT画像")
    print()

    # 3. フェロモン場（ダミー）
    print("3. フェロモン場（ダミー）を可視化中...")
    tau = np.random.rand(ny, nx)
    fig, path = plot_pheromone_field(tau, title="ダミーフェロモン場")
    print()

    # 4. 誤差比較（ダミー）
    print("4. 誤差比較（ダミー）を可視化中...")
    vx_pred = vx + np.random.randn(*vx.shape) * 0.1
    vy_pred = vy + np.random.randn(*vy.shape) * 0.1
    fig, error, path = plot_error_comparison((vx, vy), (vx_pred, vy_pred))
    print()

    print("=" * 60)
    print("✓ 全ての可視化がHTMLファイルとして保存されました")
    print("  results/figures/ ディレクトリを確認してください")
    print()
    print("SSH環境での使用:")
    print("  1. ローカルマシンにHTMLファイルをダウンロード")
    print("     例: scp user@server:/path/to/results/figures/*.html .")
    print("  2. ブラウザで開く")
