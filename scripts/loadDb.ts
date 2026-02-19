import { DataAPIClient } from '@datastax/astra-db-ts';
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer';
import OpenAI from 'openai';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import 'dotenv/config';

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const mahjongData = [
    "https://www.plainfieldlibrary.net/wp-content/uploads/2020/03/American-Mahjongg.pdf",
    "https://en.wikipedia.org/wiki/Mahjong#History",
    "https://www.google.com/search?q=mahjong+2025&sca_esv=af25f58d0793347a&biw=1728&bih=888&aic=0&sxsrf=ANbL-n6HUseYKXEdStNIg4sgFOnohXexBA%3A1769989063627&ei=x-N_acuGJvrJkPIP-8qSiQU&ved=0ahUKEwiLhpOLu7mSAxX6JEQIHXulJFE4ChDh1QMIEw&uact=5&oq=mahjong+2025&gs_lp=Egxnd3Mtd2l6LXNlcnAiDG1haGpvbmcgMjAyNTIFEAAYgAQyBRAAGIAEMgUQABiABDIKEAAYgAQYFBiHAjIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABEjiBVCRA1jyBHABeAGQAQCYAWugAbkBqgEDMS4xuAEDyAEA-AEBmAIDoALCAcICDRAjGPAFGLADGCcYngbCAgcQIxiwAxgnwgIKEAAYsAMY1gQYR8ICChAjGIAEGCcYigXCAgoQIxjwBRgnGJ4GwgIEECMYJ8ICChAAGIAEGEMYigXCAgsQABiABBiRAhiKBZgDAIgGAZAGCpIHAzIuMaAHnxGyBwMxLjG4B74BwgcDMC4zyAcGgAgA&sclient=gws-wiz-serp",
    "https://www.scribd.com/document/250898340/Mahjong-Hands-Lisit"
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
});

const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1536,
            metric: similarityMetric
        }
    });

    return res;
};

const loadSampleData = async () => {
    const collection = db.collection(ASTRA_DB_COLLECTION);

    for await (const url of mahjongData) {
        const content = await scrapePage(url);
        const chunks = await splitter.splitText(content);

        for await (const chunk of chunks) {
            const embedding = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float"
            });

            const vector = embedding.data[0].embedding;

            await collection.insertOne({
                $vector: vector,
                text: chunk
            });
        }
    }
};

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML);

            await browser.close();
            return result;
        }
    });

    return (await loader.scrape())?.replace(/<[^>]*>?/gm, '');
};

createCollection().then(() => loadSampleData());