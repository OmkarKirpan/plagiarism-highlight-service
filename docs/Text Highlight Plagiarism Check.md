<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# how to get text hightlight for plagiarism check from copyleaks api

which line has plagiarism
[https://docs.copyleaks.com/](https://docs.copyleaks.com/)

Now let me create a comprehensive answer based on all the information I've gathered.

## Getting Text Highlights and Identifying Plagiarized Lines with Copyleaks API

The Copyleaks API provides detailed text-level plagiarism detection with character and word position information that allows you to highlight exactly which portions of text contain plagiarism. Here's how to implement this:[^1][^2]

### **Workflow Overview**

**1. Submit Your Scan**

Submit your document using the Submit File Endpoint with a unique `scanId`:[^1]

```bash
POST https://api.copyleaks.com/v3/education/submit/file/{scanId}
```

**2. Wait for Completion Webhook**

The scan is asynchronous. Once complete, Copyleaks sends a `completed` webhook to your specified status URL. This webhook contains:[^3][^1]

- Summary information (total matched words, plagiarism percentage)
- `result` IDs for each plagiarism match found
- Overall similarity scores

**3. Export Detailed Results**

After receiving the `completed` webhook, use the Export endpoint to retrieve detailed plagiarism results:[^4][^1]

```bash
POST https://api.copyleaks.com/v3/downloads/{scanId}/export/{exportId}
```


### **Understanding the Result Structure**

The plagiarism results contain precise position data for highlighting text:[^5][^6]

**Character-Level Positions:**

- `chars.starts`: Array of starting character positions where matches occur
- `chars.lengths`: Array of lengths for each match

**Word-Level Positions:**

- `words.starts`: Array of starting word positions
- `words.lengths`: Array of word lengths for each match

**Text Comparison Formats:**
Both `text` (plain text) and `html` versions are available, each with their own position arrays.[^7][^5]

### **Example: Getting Highlighted Matches**

**Step 1: Export Results**

```json
{
  "results": [
    {
      "verb": "POST",
      "endpoint": "https://your-server.com/results/{RESULT_ID}"
    }
  ],
  "crawledVersion": {
    "verb": "POST",
    "endpoint": "https://your-server.com/crawled"
  },
  "completionWebhook": "https://your-server.com/export-complete"
}
```

**Step 2: Receive Result Data**

The plagiarism result webhook contains:[^8]

```json
{
  "statistics": {
    "identical": 125,
    "minorChanges": 45,
    "relatedMeaning": 89
  },
  "text": {
    "comparison": {
      "source": {
        "chars": {
          "starts": [0, 150, 300],
          "lengths": [50, 75, 100]
        }
      },
      "suspected": {
        "chars": {
          "starts": [10, 200, 450],
          "lengths": [50, 75, 100]
        }
      }
    }
  }
}
```


### **Detection Levels**

Copyleaks identifies three types of matches:[^9]

1. **Identical Matches**: Exact word-for-word copying
2. **Minor Changes**: Slight variations (e.g., "slow" → "slowly")
3. **Paraphrased Content**: Rewritten text with same meaning

You can control which levels to detect by configuring these properties:[^10][^9]

- `properties.filters.identicalEnabled`
- `properties.filters.minorChangesEnabled`
- `properties.filters.relatedMeaningEnabled`


### **Displaying Highlights in Your UI**

Use the character/word position arrays to highlight plagiarized text:

**Example (Python):**

```python
def highlight_plagiarism(original_text, char_starts, char_lengths):
    highlighted = original_text
    offset = 0
    
    for start, length in zip(char_starts, char_lengths):
        actual_start = start + offset
        actual_end = actual_start + length
        
        # Wrap plagiarized text in HTML tags
        highlighted = (
            highlighted[:actual_start] + 
            '<span class="plagiarism">' +
            highlighted[actual_start:actual_end] +
            '</span>' +
            highlighted[actual_end:]
        )
        offset += len('<span class="plagiarism"></span>')
    
    return highlighted
```


### **Getting the Crawled Version**

To properly display highlights, you need the crawled version (how Copyleaks processed your document):[^7]

```json
{
  "crawledVersion": {
    "text": {
      "value": "Your document text...",
      "exclude": {
        "starts": [100, 250],
        "lengths": [20, 30],
        "reasons": ["quote", "reference"]
      }
    }
  }
}
```

This provides:

- The processed text exactly as Copyleaks analyzed it
- Excluded sections (quotes, references, citations)
- Page boundaries for multi-page documents[^7]


### **Complete Integration Example**

```javascript
// 1. Submit scan
const scanId = 'unique-scan-123';
await copyleaks.submitFile(scanId, fileContent, {
  webhooks: {
    status: `https://your-api.com/webhook/{STATUS}`
  },
  includeHtml: true
});

// 2. Handle completion webhook
app.post('/webhook/completed', async (req, res) => {
  const { results, scanId } = req.body;
  
  // 3. Export detailed results
  await copyleaks.export(scanId, 'export-1', {
    results: results.map(r => ({
      id: r.id,
      verb: 'POST',
      endpoint: `https://your-api.com/results/${r.id}`
    })),
    crawledVersion: {
      verb: 'POST',
      endpoint: 'https://your-api.com/crawled'
    }
  });
});

// 4. Receive and process results
app.post('/results/:id', (req, res) => {
  const { text } = req.body;
  
  // Use char positions to highlight
  highlightPlagiarism(
    text.comparison.source.chars.starts,
    text.comparison.source.chars.lengths
  );
});
```


### **Key Takeaways**

- Copyleaks provides **character-level and word-level position arrays** for precise highlighting[^6][^5]
- Use the **Export endpoint** after scan completion to retrieve detailed match positions[^4][^1]
- Results include separate data for **identical, minor changes, and paraphrased** content[^9][^8]
- The **crawled version** shows exactly how Copyleaks processed your document[^7]
- Position arrays allow you to programmatically highlight specific text segments in your UI

The API supports multiple export formats (JSON webhooks, PDF reports) and languages (100+ for plagiarism), making it flexible for various integration scenarios.[^2][^11]
<span style="display:none">[^100][^101][^102][^103][^104][^105][^106][^107][^108][^109][^110][^111][^112][^113][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47][^48][^49][^50][^51][^52][^53][^54][^55][^56][^57][^58][^59][^60][^61][^62][^63][^64][^65][^66][^67][^68][^69][^70][^71][^72][^73][^74][^75][^76][^77][^78][^79][^80][^81][^82][^83][^84][^85][^86][^87][^88][^89][^90][^91][^92][^93][^94][^95][^96][^97][^98][^99]</span>

<div align="center">⁂</div>

[^1]: https://docs.copyleaks.com/guides/authenticity/detect-plagiarism-text/

[^2]: https://docs.copyleaks.com/concepts/products/plagiarism-checker-api/

[^3]: https://docs.copyleaks.com/reference/data-types/authenticity/webhooks/scan-completed/

[^4]: https://docs.copyleaks.com/reference/actions/downloads/export/

[^5]: https://docs.copyleaks.com/reference/data-types/authenticity/results/ai-detection/

[^6]: https://docs.copyleaks.com/reference/data-types/ai-detector/ai-text-detector-response/

[^7]: https://docs.copyleaks.com/reference/data-types/authenticity/results/crawled-version/

[^8]: https://docs.copyleaks.com/reference/data-types/authenticity/results/new-plagiarism-result/

[^9]: https://docs.copyleaks.com/concepts/features/detection-levels/

[^10]: https://docs.copyleaks.com/concepts/features/identical-matches/

[^11]: https://copyleaks.com

[^12]: https://docs.copyleaks.com

[^13]: https://www.frontiersin.org/articles/10.3389/fmats.2024.1390159/full

[^14]: https://metall-mater-eng.com/index.php/home/article/view/1492

[^15]: https://aircconline.com/csit/papers/vol14/csit140405.pdf

[^16]: https://ieeexplore.ieee.org/document/10237022/

[^17]: https://link.springer.com/10.1007/s11694-024-02412-1

[^18]: https://fcc08321-8158-469b-b54d-f591e0bd3df4.filesusr.com/ugd/185b0a_6a5b1499bdc54e61b04e9f1c60f2e68f.pdf

[^19]: https://www.ijisrt.com/finrag-a-rag-system-for-financial-documents

[^20]: http://dergipark.org.tr/en/doi/10.53047/josse.1691312

[^21]: https://onepetro.org/SPEADIP/proceedings/24ADIP/24ADIP/D031S090R005/585313

[^22]: https://www.fmdbpub.com/user/journals/article_details/FTSIN/306

[^23]: https://arxiv.org/pdf/2502.17749.pdf

[^24]: https://dl.acm.org/doi/pdf/10.1145/3597503.3639192

[^25]: http://arxiv.org/pdf/2412.06241.pdf

[^26]: https://arxiv.org/html/2502.15278v1

[^27]: http://arxiv.org/pdf/2402.10853.pdf

[^28]: https://s3.ca-central-1.amazonaws.com/assets.jmir.org/assets/preprints/preprint-53308-accepted.pdf

[^29]: https://aclanthology.org/2023.emnlp-main.308.pdf

[^30]: https://ijs.uobaghdad.edu.iq/index.php/eijs/article/download/6542/3620

[^31]: https://copyleaks.com/api

[^32]: https://skywork.ai/skypage/en/Copyleaks-AI-Checker-Review-2025-My-In-Depth-Test-of-the-"Most-Accurate"-Detector/1974360752973213696

[^33]: https://copyleaks.com/plagiarism-checker

[^34]: https://docs.copyleaks.com/concepts/products/ai-text-detection-api/

[^35]: https://www.edenai.co/post/best-plagiarism-detection-apis

[^36]: https://copyleaks.com/ai-content-detector

[^37]: https://stackoverflow.com/questions/77763919/download-report-scan-from-copyleaks

[^38]: https://asmedigitalcollection.asme.org/solarenergyengineering/article/147/6/061011/1222337/Optimization-of-Grid-Tied-Photovoltaic-Tilt-and

[^39]: http://legallinguistics.ru/article/view/(2023)2717

[^40]: https://sostech.greenvest.co.id/index.php/sostech/article/view/32123

[^41]: https://onlinelibrary.wiley.com/doi/10.1111/acel.14053

[^42]: https://link.springer.com/10.1007/s44274-025-00332-5

[^43]: https://rdl-journal.ru/article/view/907

[^44]: https://ieeexplore.ieee.org/document/10722016/

[^45]: https://prensipjournals.com/ojs/index.php/actanatsci/article/view/291

[^46]: https://jurnal.itscience.org/index.php/CNAPC/article/view/4417

[^47]: https://www.ijfmr.com/research-paper.php?id=51000

[^48]: http://arxiv.org/pdf/2410.16618.pdf

[^49]: https://discovery.ucl.ac.uk/10071223/1/08643998.pdf

[^50]: https://arxiv.org/pdf/1612.09183.pdf

[^51]: https://arxiv.org/html/2407.07087v2.pdf

[^52]: https://arxiv.org/html/2402.06035v1

[^53]: https://arxiv.org/pdf/2112.15230.pdf

[^54]: https://copyleaks.com/about-us/press-releases/copyleaks-research-finds-nearly-60-of-gpt-3-5-outputs-contained-some-form-of-plagiarized-content

[^55]: https://docs.copyleaks.com/reference/data-types/authenticity/results/new-result/

[^56]: https://docs.copyleaks.com/using-the-apis/overview/

[^57]: https://docs.copyleaks.com/reference/data-types/authenticity/webhooks/overview/

[^58]: https://stackoverflow.com/questions/72456769/how-to-get-percentage-matching-in-copyleakes-export-api-using-python

[^59]: https://www.tandfonline.com/doi/full/10.1080/15389588.2022.2047958

[^60]: https://arxiv.org/abs/2212.13924

[^61]: https://peerj.com/articles/cs-2026

[^62]: http://thesai.org/Publications/ViewPaper?Volume=10\&Issue=1\&Code=ijacsa\&SerialNo=77

[^63]: https://science.lpnu.ua/sisn/all-volumes-and-issues/volume-17-2025/comparison-and-clustering-textual-information-sources

[^64]: https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-024-05993-2

[^65]: https://journals.sagepub.com/doi/10.1177/02537176241247934

[^66]: http://ieeexplore.ieee.org/document/7904295/

[^67]: https://arxiv.org/abs/2305.09515

[^68]: https://tidsskrift.dk/sss/article/view/152275

[^69]: https://arxiv.org/pdf/2305.05865.pdf

[^70]: https://arxiv.org/pdf/2407.02659.pdf

[^71]: http://arxiv.org/pdf/2405.15523.pdf

[^72]: https://arxiv.org/pdf/2312.17338.pdf

[^73]: https://arxiv.org/pdf/1409.6182.pdf

[^74]: https://arxiv.org/pdf/2312.09370.pdf

[^75]: https://docs.copyleaks.com/reference/actions/text-moderation/check/

[^76]: https://docs.copyleaks.com/reference/actions/authenticity/submit-file/

[^77]: https://app.copyleaks.com/text-compare

[^78]: https://docs.copyleaks.com/concepts/features/text-manipulation/

[^79]: https://www.webspero.com/blog/copyleaks-ai-content-detector-review-fact-or-fiction/

[^80]: https://docs.copyleaks.com/reference/actions/writer-detector/check/

[^81]: https://www.ndss-symposium.org/ndss2014/programme/dspin-detecting-automatically-spun-content-web/

[^82]: http://ieeexplore.ieee.org/document/8094147/

[^83]: https://www.semanticscholar.org/paper/86ad04e1592ddbb6aa40087a9665cfa6a245772c

[^84]: https://www.semanticscholar.org/paper/d80041055df06dbbd212dec65fd84e785f2d28f8

[^85]: https://archive.nyu.edu/handle/2451/63333

[^86]: https://www.atlantis-press.com/article/25245

[^87]: https://www.semanticscholar.org/paper/5b3858191a9cb118758f6f03959c0d5bc07178c9

[^88]: http://journal.frontiersin.org/article/10.3389/fmicb.2011.00087/abstract

[^89]: https://arxiv.org/ftp/arxiv/papers/1208/1208.2486.pdf

[^90]: https://arxiv.org/pdf/2103.11909.pdf

[^91]: https://pmc.ncbi.nlm.nih.gov/articles/PMC1761846/

[^92]: https://docs.copyleaks.com/guides/authenticity/detect-ai-generated-content/

[^93]: https://stackoverflow.com/questions/75201709/detecting-aigeneratedtext-with-copyleaks-api-doesnt-return-ai-detection-results

[^94]: https://docs.copyleaks.com/reference/data-types/writing/writing-assistant/

[^95]: https://ieeexplore.ieee.org/document/10291090/

[^96]: https://unige.org/volume-74-issue-3-2024/innovative-design-of-visual-communication-system-for-animated-character-graphic-images-in-virtual-reality-environment/

[^97]: https://www.semanticscholar.org/paper/28f86c13ac827870a645ae33e49f068ab5cecf5b

[^98]: https://bonjour.sgu.ru/ru/articles/vnutrennyaya-rech-personazha-kak-sposob-proniknoveniya-voobrazhaemogo-v-realnoe-na

[^99]: https://link.springer.com/10.1007/978-3-319-12027-0_58

[^100]: https://e-journal.yayasancec.or.id/index.php/corolla/article/view/36

[^101]: https://link.springer.com/10.1007/s11042-024-20128-8

[^102]: https://ieeexplore.ieee.org/document/10616555/

[^103]: https://www.semanticscholar.org/paper/ce211e50fb1c6bca511d161a1e2f82d3a113bab8

[^104]: https://odatrya.org.ua/index.php/osatrq/article/view/310

[^105]: http://arxiv.org/pdf/2404.00611v2.pdf

[^106]: https://computingonline.net/computing/article/download/1690/890

[^107]: http://downloads.hindawi.com/journals/mpe/2016/3215162.pdf

[^108]: https://arxiv.org/html/2404.17310v1

[^109]: https://arxiv.org/pdf/2207.09135.pdf

[^110]: http://arxiv.org/pdf/2504.04537.pdf

[^111]: https://docs.copyleaks.com/reference/actions/ai-image-detector/check/

[^112]: https://help.copyleaks.com/s/article/HowlongwillittaketocheckmycontentwiththeAIDetector681cd00aa9a47

[^113]: https://docs.copyleaks.com/concepts/features/export-pdf-report/

