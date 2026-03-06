#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

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
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    console.log(`  Response status: ${res.statusCode}`);
                    const json = JSON.parse(data);

                    // 에러 응답 체크
                    if (json.error) {
                        console.error(`  API Error: ${json.error.detail || json.error.message}`);
                        resolve([]);
                        return;
                    }

                    // results 구조 확인 (results가 배열인지 확인)
                    if (json.results && Array.isArray(json.results)) {
                        console.log(`  Found ${json.results.length} results`);
                        resolve(json.results);
                    } else {
                        console.error(`  Unexpected response structure`);
                        console.error(`  Response:`, JSON.stringify(json).substring(0, 200));
                        resolve([]);
                    }
                } catch (e) {
                    console.error(`  Error parsing JSON:`, e.message);
                    console.error(`  Response data:`, data.substring(0, 200));
                    resolve([]);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`  Request error:`, error.message);
            reject(error);
        });

        req.end();
    });
}

async function main() {
    console.log('Fetching news from Brave Search API...');
    console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
    console.log('');

    const allResults = [];

    for (const query of QUERIES) {
        console.log(`Searching: ${query}`);
        try {
            const results = await fetchNews(query);
            allResults.push(...results);
        } catch (e) {
            console.error(`  Failed: ${e.message}`);
        }
        // API 레이트 리미트 방지
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\nTotal raw results: ${allResults.length}`);

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
        const dateA = a.page_age ? new Date(a.page_age) : new Date(0);
        const dateB = b.page_age ? new Date(b.page_age) : new Date(0);
        return dateB - dateA;
    });

    // 결과 저장
    const outputPath = 'news.json';
    fs.writeFileSync(outputPath, JSON.stringify(uniqueNews, null, 2));

    console.log(`\n✅ Saved ${uniqueNews.length} unique news items to ${outputPath}`);
}

main().catch(console.error);
