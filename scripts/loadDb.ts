import { DataAPIClient } from '@datastax/astra-db-ts';
//import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer';
import { PlaywrightWebBaseLoader } from "@langchain/community/document_loaders/web/playwright";
import * as puppeteer from 'puppeteer';
import puppeteerCore, { executablePath } from 'puppeteer-core';
import chromiumPack from '@sparticuz/chromium';
import { chromium as pwChromium } from 'playwright-core';
import path from 'path';

import OpenAI from 'openai';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import 'dotenv/config';

export const dynamic = 'force-dynamic';

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
    /*NODE_ENV,*/
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const mahjongData = [
    //"https://www.plainfieldlibrary.net/wp-content/uploads/2020/03/American-Mahjongg.pdf",
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
        //const chunks = typeof content === 'string' ? await splitter.splitText(content) : [];
        const chunks = await splitter.splitDocuments(content);

        for await (const chunk of chunks) {
            const embedding = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk.pageContent,
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
    /* try {
         let browser;
 
         // Use specific configuration for Vercel production environment
         if (NODE_ENV === 'production') {
             // Configure puppeteer-core to use the @sparticuz/chromium-min executable
             browser = await chromium.launch({
                 args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
                 //defaultViewport: { width: 1280, height: 800 },
                 executablePath: await chromium.executablePath(),
                 headless: true,
             });
         } else {
             // Use the standard puppeteer package for local development
             browser = await puppeteer.launch({
                 headless: true,
             });
         }
 
         const loader = new PlaywrightWebBaseLoader(url, {
             launchOptions: {
                 headless: true,
                 browser: browser
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
 
         const result = await loader.scrape();
         return JSON.stringify(result?.replace(/<[^>]*>?/gm, ''));
 
     } catch (error) {
         console.error(error);
         return error;
     }
         */

    const executablePath = await chromiumPack.executablePath();
    const execDir = path.dirname(executablePath);

    process.env.LD_LIBRARY_PATH = execDir;

    let webBrowser = await pwChromium.launch({
        args: chromiumPack.args,
        headless: true,
        executablePath: executablePath
    });

    let webPage = await webBrowser.newPage();

    const loader = new PlaywrightWebBaseLoader(url, {
        launchOptions: {
            headless: true,
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async (page = webPage, browser = webBrowser) => {
            //await page.waitForResponse(url);

            const result = await page.evaluate(() => document.body.innerHTML);

            await browser.close();
            return result;
        }
    });

    const result = await loader.load();
    // return result?.replace(/<[^>]*>?/gm, '');
    return result;
};

createCollection().then(() => loadSampleData());