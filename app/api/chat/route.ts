
import OpenAI from "openai";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from 'ai';
import { DataAPIClient } from "@datastax/astra-db-ts";
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

noStore();

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
} = process.env;

const ai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
    try {
        const { messages }: { messages: any[] } = await req.json();

        const latestMessage = messages[messages?.length - 1]?.parts[0]?.text;

        let docContext = '';

        const embedding = await ai.embeddings.create({
            model: 'text-embedding-3-small',
            input: latestMessage,
            encoding_format: 'float',
        });

        const collection = await db.collection(ASTRA_DB_COLLECTION);

        const cursor = collection.find(null, {
            sort: {
                $vector: embedding.data[0].embedding
            },
            limit: 10
        });

        const documents = await cursor.toArray();

        const docsMap = documents?.map(doc => doc.text);

        docContext = JSON.stringify(docsMap);

        const response = streamText({
            model: openai('gpt-3.5-turbo'),
            system: ` You  are an AI assistant who knows everything about Mahjong. Use the below context to augment what you know about the Majhong game. The context will provide you with recent data from wikipedia and a few other websites.
            If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include. Format responses using markdown where applicable and don't return images. 
            ----------------------------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            ----------------------------------
            QUESTION: ${latestMessage}
            ---------------------------------
            `,
            messages: await convertToModelMessages(messages)
        });

        return response.toUIMessageStreamResponse({
            headers: {
                'Transfer-Encoding': 'chunked',
                Connection: 'keep-alive',
            },
            messageMetadata(options) {
                return {
                    createdAt: new Date().toLocaleTimeString()
                };
            }
        });

    } catch (error) {
        console.log(error);

        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
};