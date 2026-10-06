"use client";

import Image from "next/image";
import mahjongLogo from './assets/mahjong-logo.png';
import aiMessageIcon from './assets/chat.png';
import userMessageIcon from './assets/contacts.png';
import submitIcon from './assets/upload.png';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useState } from 'react';
import styles from './bubble.module.css';
import { ThreeDots } from 'react-loader-spinner';

export default function Home() {
  const { messages, sendMessage, status } = useChat<UIMessage<{ createdAt?: string }>>();

  const [input, setInput] = useState('');

  const event = new Date();

  const options: {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  } = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const fullDate = event.toLocaleDateString(undefined, options);

  const suggestions = [
    'Explain Mahjong to a kindergartner',
    'Summarize the Charleston Strategy',
    'List the types of Dragons and the suits they are associated with',
    'Describe the history of Mahjong'
  ];

  const handleSuggestionPrompt = async (suggestion: string) => {
    try {
      if (suggestion.trim()) {
        await sendMessage({
          text: suggestion, metadata: {
            createdAt: new Date().toLocaleTimeString("en-US", {
              timeZone: 'America/Chicago',
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const lastMessage = messages?.[messages.length - 1];

  return (
    <main className="chat-shell w-full relative flex flex-col items-center">
      <div className="chat-panel relative flex flex-col items-center bg-neutral-400/50 rounded-xl">

        <div className="chat-messages relative flex flex-col items-center">
          <div className="w-full shrink-0 flex flex-col items-center">
            <Image className="chat-logo" src={mahjongLogo} alt="mahjong-logo" width={200} height={200} />

            {messages.length >= 1 && <h1>{fullDate}</h1>}
          </div>

          {messages?.map((message, i) => (
            (message.role === 'assistant' && status === 'streaming' && message === lastMessage) ?
              <div key={i} className="flex flex-col self-start shrink-0">
                <ThreeDots
                  visible={true}
                  height="80"
                  width="80"
                  color="#9ae600"
                  radius="9"
                  ariaLabel="three-dots-loading"
                />
              </div> :
              <div key={i} className={`flex flex-col ${message.role === 'user' ? `self-end` : `self-start`} message-row mt-5 min-w-0 shrink-0`}>
                <div className="text-sm z-100 ml-2 text-black font-medium">{message.metadata?.createdAt}</div>
                <div className={`${message.role === 'user' ? `bg-orange-100 items-center ${styles.sent}` : `bg-white items-start ${styles.received}`} flex flex-row rounded-xl ${styles.shared}`}>
                  {message.role === 'user' ?
                    <Image className="shrink-0 mr-[5px]" src={userMessageIcon} alt="user-message-icon" width={32} height={32} /> :
                    <Image className="shrink-0 mr-2" src={aiMessageIcon} alt="ai-message-icon" width={30} height={30} />
                  }
                  <div className="message-text flex flex-col min-w-0" key={message.id}>
                    {message.parts.map((part, index) =>
                      part.type === 'text' ? <span key={index}>{part.text}</span> : null,
                    )}
                  </div>
                </div>
              </div>
          ))}

            <div className="chat-suggestions">
              {messages.length === 0 &&
                suggestions.map((suggestion, index) => (

                  <button className="min-h-11 py-2 px-4 bg-white/50 rounded-full first-line:font-bold cursor-pointer" key={index} onClick={() => handleSuggestionPrompt(suggestion)}>{suggestion}</button>
                ))}
            </div>
        </div>

          <div className="chat-controls flex flex-col items-center">


            <form className="chat-composer bg-white flex border-2 border-lime-400 rounded-xl" onSubmit={async (e) => {
              e.preventDefault();

              try {
                if (input.trim()) {
                  await sendMessage({ text: input, metadata: { createdAt: new Date().toLocaleTimeString() } });
                  setInput('');
                }
              } catch (error) {
                console.log(error);
              }
            }}
            >
              <input className="min-w-0 w-full flex-1 p-3 outline-none text-black rounded-xl" type="text" aria-label="Ask a Mahjong question" placeholder="Ask me anything..." onChange={e => setInput(e.target.value)} value={input} />
              <button className="cursor-pointer shrink-0 min-w-11 min-h-11 flex items-center justify-center mr-1" type="submit" aria-label="Send message">
                <Image src={submitIcon} alt="submit-icon" width={30} height={30} />
              </button>
            </form>
          </div>

      </div>
    </main>
  );
}
