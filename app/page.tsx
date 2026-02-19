"use client";

import Image from "next/image";
import mahjongLogo from './assets/mahjong-logo.png';
import aiMessageIcon from './assets/chat.png';
import userMessageIcon from './assets/contacts.png';
import submitIcon from './assets/upload.png';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import bubbleStyles from './bubble.module.css';
import { ThreeDots } from 'react-loader-spinner';

export default function Home() {
  const { messages, sendMessage, status } = useChat();

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
        await sendMessage({ text: suggestion, metadata: { createdAt: new Date().toLocaleTimeString() } });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const lastMessage = messages?.[messages.length - 1];

  return (
    <main className="w-full h-screen relative flex flex-col items-center justify-self-center">
      <div className="w-5/6 h-full relative block my-15 flex flex-col items-center bg-neutral-400/50 z-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-xl">

        <div className={`min-h-full max-h-fit py-8 relative z-2 flex flex-col items-center ${!messages.length && 'justify-between'} w-5/6 p-6 opacity-100 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
          <div className="w-full flex flex-col items-center">
            <Image className="opacity-100 z-3" src={mahjongLogo} alt="mahjong-logo" width={200} height={200} />

            {messages.length >= 1 && <h1>{fullDate}</h1>}
          </div>

          {messages?.map((message, i) => (
            (message.role === 'assistant' && status === 'streaming' && message === lastMessage) ?
              <div key={i} className="flex flex-col self-start">
                <ThreeDots
                  visible={true}
                  height="80"
                  width="80"
                  color="#9ae600"
                  radius="9"
                  ariaLabel="three-dots-loading"
                />
              </div> :
              <div key={i} className={`flex flex-col ${message.role === 'user' ? `self-end` : `self-start`} mt-5 max-w-3/4 z-100 opacity-100`}>
                {/* @ts-ignore */}
                <div className="text-sm z-100 ml-2 text-black font-medium">{message.metadata?.createdAt}</div>
                {/* @ts-ignore */}
                <div className={`${message.role === 'user' ? `bg-orange-100 ${bubbleStyles.sent}` : `bg-white ${bubbleStyles.received}`} flex flex-row ${message.parts[0 || 1]?.text?.length > 20 ? 'items-start' : 'items-center'} z-100 p-3 rounded-xl max-w-96 min-w-fit ${bubbleStyles.shared}`}>
                  {message.role === 'user' ?
                    <Image className="opacity-100 z-100 mr-1" src={userMessageIcon} alt="user-message-icon" width={35} height={35} /> :
                    <Image className="opacity-100 z-100 mr-2" src={aiMessageIcon} alt="ai-message-icon" width={30} height={30} />
                  }
                  <div className="flex flex-col" key={message.id}>
                    {message.parts.map((part, index) =>
                      part.type === 'text' ? <span key={index}>{part.text}</span> : null,
                    )}
                  </div>
                </div>
              </div>
          ))}

          <div className="flex flex-col justify-start items-center w-full">
            <div className="flex flex-row">
              {messages.length === 0 &&
                suggestions.map((suggestion, index) => (

                  <button className="py-2 px-4 bg-white/50 rounded-full ml-3 first-line:font-bold cursor-pointer" key={index} onClick={() => handleSuggestionPrompt(suggestion)}>{suggestion}</button>
                ))}
            </div>

            <form className={`w-2/3 lg:max-w-3/5 bg-white block flex mt-10 mb-8 ${messages.length <= 3 && messages.length > 0 && 'absolute bottom-4'} border-2 border-lime-400 rounded-xl opacity-100 z-100`} onSubmit={async (e) => {
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
              <input className="flex-grow p-3 outline-none text-black" type="text" placeholder="Ask me anything..." onChange={e => setInput(e.target.value)} value={input} />
              <button className="cursor-pointer mr-3" type="submit">
                <Image src={submitIcon} alt="submit-icon" width={30} height={30} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </main>
  );
}
