const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const NEWS_FETCH_PROMPT = `Search for the latest Ghana security, crime, flooding, and safety news from today and this week. Also find the top 3 global security trends for 2026. Return ONLY a JSON object with this exact structure, no other text:

{
  "ghana": [
    {
      "id": "g1",
      "badge": "BREAKING",
      "color": "#e74c3c",
      "title": "Short news headline here",
      "meta": "Source name · Date",
      "hook": "A detailed hook for social media post generation"
    }
  ],
  "global": [
    {
      "id": "gl1", 
      "badge": "GLOBAL",
      "color": "#3b82f6",
      "title": "Short headline here",
      "meta": "Source · Date",
      "hook": "Hook for social media generation"
    }
  ]
}

For Ghana news: find 6-8 stories about flooding, crime, security incidents, business safety, Accra events. Use badge values: BREAKING, URGENT, OFFICIAL, EXPERT, CRIME, WEATHER, FIRE, ALERT. Use colors: #e74c3c for urgent/crime, #f59e0b for warnings, #3b82f6 for official, #8b5cf6 for expert, #22c55e for positive.

For global: find 4-6 security technology or trend stories. Use badge values: GLOBAL, TREND, RISK, TECH, INSIGHT, AFRICA.

Make sure all hooks are specific and compelling for SafeNet Ghana social media posts. Return valid JSON only.`;

export async function fetchLiveNews() {
  try {
    const cached = localStorage.getItem('sn_news_cache');
    const cacheTime = localStorage.getItem('sn_news_cache_time');
    const now = Date.now();
    
    // Use cache if less than 3 hours old
    if (cached && cacheTime && (now - parseInt(cacheTime)) < 3 * 60 * 60 * 1000) {
      return JSON.parse(cached);
    }

    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search'
        }],
        messages: [{
          role: 'user',
          content: `Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. ${NEWS_FETCH_PROMPT}`
        }]
      })
    });

    const data = await res.json();
    const textContent = data.content?.find(b => b.type === 'text')?.text || '';
    
    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    
    const news = JSON.parse(jsonMatch[0]);
    
    // Add sequential IDs
    news.ghana = news.ghana.map((n, i) => ({ ...n, id: `g${i+1}` }));
    news.global = news.global.map((n, i) => ({ ...n, id: `gl${i+1}` }));
    
    // Cache it
    localStorage.setItem('sn_news_cache', JSON.stringify(news));
    localStorage.setItem('sn_news_cache_time', now.toString());
    
    return news;
  } catch (err) {
    console.error('News fetch failed:', err);
    return null; // Falls back to static data
  }
}

export function clearNewsCache() {
  localStorage.removeItem('sn_news_cache');
  localStorage.removeItem('sn_news_cache_time');
}

export function getNewsAge() {
  const cacheTime = localStorage.getItem('sn_news_cache_time');
  if (!cacheTime) return null;
  const mins = Math.floor((Date.now() - parseInt(cacheTime)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
