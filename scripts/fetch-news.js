#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const API_KEY = process.env.BRAVE_API_KEY || 'BSASDTCUmfSuOqB6DdUmoeKzxltKm27';
const QUERIES = [
    '이란 전쟁',
    'Iran war',
    '이란 이스라엘',
    'Iran Israel',
    '이란 공격',
    'Iran attack'
];

function fetchNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=20&freshness=pd`;

        https.get(url, {
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': API_KEY
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.results?.results || []);
                } catch (e) {
                    console.error(`Error parsing JSON for query "${query}":`, e.message);
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('Fetching news from Brave Search API...');

    const allResults = [];

    for (const query of QUERIES) {
        console.log(`Searching: ${query}`);
        try {
            const results = await fetchNews(query);
            console.log(`  Found ${results.length} results`);
            allResults.push(...results);
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
        // API 레이트 리미트 방지
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 중복 제거
    const urlSet = new Set();
    const uniqueNews = [];
    
    for (const item of allResults) {
        if (!urlSet.has(item.url)) {
            urlSet.add(item.url);
            uniqueNews.push(item);
        }
    }

    // 시간순 정렬 (최신순)
    uniqueNews.sort((a, b) => {
        const dateA = new Date(a.page_age || 0);
        const dateB = new Date(b.page_age || 0);
        return dateB - dateA;
    });

    // 결과 저장
    const outputPath = 'news.json';
    fs.writeFileSync(outputPath, JSON.stringify(uniqueNews, null, 2));

    console.log(`\n✅ Saved ${uniqueNews.length} unique news items to ${outputPath}`);
}

main().catch(console.error);
