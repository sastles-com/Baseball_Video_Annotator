"""
Markdown to HTML Converter for Documentation
"""
import markdown
import sys
from pathlib import Path

CSS_STYLE = """
<style>
body {
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
    line-height: 1.6;
    color: #24292e;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #ffffff;
}
h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace; }
pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 6px; }
pre code { background-color: transparent; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
th { background-color: #f6f8fa; font-weight: 600; }
tr:nth-child(2n) { background-color: #f6f8fa; }
blockquote { border-left: 0.25em solid #dfe2e5; color: #6a737d; padding: 0 1em; margin: 0; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; }
    .nav-bar { background-color: #f6f8fa; padding: 10px 15px; margin-bottom: 30px; border-radius: 6px; border: 1px solid #e1e4e8; }
    .nav-bar a { margin-right: 15px; font-weight: bold; color: #24292e; }
    .nav-bar a:hover { color: #0366d6; }
</style>
"""

NAV_HTML = """
<div class="nav-bar">
    <a href="http://tajmahal.mond.jp/aco02/index.html">🏠 ホーム (Home)</a>
    <a href="http://tajmahal.mond.jp/aco02/results/index.html">📊 結果一覧 (Results)</a>
    <a href="http://tajmahal.mond.jp/aco02/docs/RULES_HTML.html">📂 ドキュメント (Docs)</a>
</div>
"""

def convert_file(input_path, output_path=None):
    input_path = Path(input_path)
    if output_path is None:
        output_path = input_path.with_suffix('.html')
    else:
        output_path = Path(output_path)
        
    print(f"Converting {input_path} -> {output_path}")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        text = f.read()
        
    html_body = markdown.markdown(text, extensions=['tables', 'fenced_code'])
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{input_path.stem}</title>
{CSS_STYLE}
</head>
<body>
{NAV_HTML}
{html_body}
</body>
</html>"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
def main():
    if len(sys.argv) < 2:
        print("Usage: python md_to_html.py <file1.md> <file2.md> ...")
        sys.exit(1)
        
    for file_path in sys.argv[1:]:
        try:
            convert_file(file_path)
        except Exception as e:
            print(f"Error converting {file_path}: {e}")

if __name__ == "__main__":
    main()
