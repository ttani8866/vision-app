import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

const mdPath = path.resolve('output/agent5_final_strategy.md');
const pdfPath = path.resolve('output/chubu-home_strategy_report.pdf');

const mdContent = fs.readFileSync(mdPath, 'utf-8');
const htmlBody = marked(mdContent);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 20mm;
  }
  body {
    font-family: "Yu Gothic", "YuGothic", "Hiragino Sans", "Meiryo", sans-serif;
    font-size: 10.5pt;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1 {
    font-size: 18pt;
    border-bottom: 3px solid #1a3a5c;
    padding-bottom: 8px;
    margin-top: 40px;
    margin-bottom: 20px;
    color: #1a3a5c;
    page-break-after: avoid;
  }
  h2 {
    font-size: 14pt;
    color: #1a3a5c;
    border-left: 4px solid #1a3a5c;
    padding-left: 12px;
    margin-top: 32px;
    margin-bottom: 16px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    color: #2c5282;
    margin-top: 24px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }
  p {
    margin-bottom: 10px;
    text-align: justify;
  }
  ul, ol {
    margin-bottom: 12px;
    padding-left: 24px;
  }
  li {
    margin-bottom: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background-color: #1a3a5c;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: normal;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #ddd;
  }
  tr:nth-child(even) td {
    background-color: #f7f9fc;
  }
  hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 30px 0;
  }
  code {
    background-color: #f0f0f0;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 9pt;
  }
  .cover-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    text-align: center;
    page-break-after: always;
  }
  .cover-page h1 {
    font-size: 28pt;
    border: none;
    color: #1a3a5c;
    margin-bottom: 20px;
  }
  .cover-page .subtitle {
    font-size: 14pt;
    color: #4a5568;
    margin-bottom: 8px;
  }
  .cover-page .meta {
    font-size: 11pt;
    color: #718096;
    margin-top: 60px;
  }
  .cover-page .confidential {
    font-size: 10pt;
    color: #c53030;
    margin-top: 40px;
    border: 1px solid #c53030;
    padding: 8px 24px;
  }
</style>
</head>
<body>
  <div class="cover-page">
    <h1>中部ホーム<br>来期キャンペーン戦略レポート</h1>
    <div class="subtitle">「共働きファミリーの"リアルな家づくり"プラットフォーム」</div>
    <div class="subtitle">ファネル再設計 + オーナーコンテンツ基盤構築</div>
    <div class="meta">
      作成日：2026年3月22日<br>
      作成者：新東通信グループ 戦略参謀AIチーム<br>
      総額予算：3,800万円（メディア費3,000万円 / 制作費800万円）
    </div>
    <div class="confidential">CONFIDENTIAL / 社外秘</div>
  </div>
  ${htmlBody}
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8pt;color:#999;width:100%;text-align:center;font-family:sans-serif;">中部ホーム 来期キャンペーン戦略レポート | CONFIDENTIAL</div>',
    footerTemplate: '<div style="font-size:8pt;color:#999;width:100%;text-align:center;font-family:sans-serif;">新東通信グループ 戦略参謀AIチーム &nbsp;&mdash;&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  await browser.close();
  console.log('PDF generated: ' + pdfPath);
})();
