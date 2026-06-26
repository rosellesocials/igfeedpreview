export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, databaseId } = req.body;

  if (!token || !databaseId) {
    return res.status(400).json({ error: 'Missing token or databaseId' });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 9 })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'Notion API error' });
    }

    const items = data.results.map(page => {
      let image = null;
      if (page.cover) {
        image = page.cover.type === 'external'
          ? page.cover.external.url
          : page.cover.file?.url;
      }
      if (!image) {
        for (const key of Object.keys(page.properties)) {
          const prop = page.properties[key];
          if (prop.type === 'files' && prop.files?.length > 0) {
            const f = prop.files[0];
            image = f.type === 'external' ? f.external.url : f.file?.url;
            break;
          }
        }
      }

      let title = 'Untitled';
      for (const key of Object.keys(page.properties)) {
        const prop = page.properties[key];
        if (prop.type === 'title' && prop.title?.length > 0) {
          title = prop.title.map(t => t.plain_text).join('');
          break;
        }
      }

      let date = null;
      for (const key of Object.keys(page.properties)) {
        const prop = page.properties[key];
        if (prop.type === 'date' && prop.date) {
          date = prop.date.start;
          break;
        }
      }

      return { title, image, date, url: page.url };
    });

    return res.status(200).json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
