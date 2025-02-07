"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import styles from "./ChatWindow.module.css";
import { useToast } from "@/hooks/use-toast";
import AvatarModel from "../3D/AvatarModel";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState('CharacterArmature|Idle');
  const [isLookingDown, setIsLookingDown] = useState(false);
  
  useEffect(() => {
    setCurrentAnimation(isLoading ? 'CharacterArmature|Jump' : 'CharacterArmature|Idle');
  }, [isLoading]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      console.log("isLoading", isLoading);
      
      // Créer un message assistant vide et ajouter le message utilisateur en une seule mise à jour
      setMessages(prev => [
        ...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: '' }
      ]);
      
      const response = await fetch(`http://${window.location.hostname}:8000/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) throw new Error('Erreur réseau');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Impossible de lire la réponse');

      setInput('');
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsLoading(false);
          break;
        }

        const chunk = new TextDecoder().decode(value);
        accumulatedContent += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: accumulatedContent
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        description: "Erreur lors de l'envoi du message",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Message copié dans le presse-papier",
      duration: 2000,
    });
  };

  // Fonction pour détecter si l'utilisateur est proche du bas
  const isNearBottom = () => {
    if (!chatContainerRef.current) return false;
    const container = chatContainerRef.current;
    const threshold = 100; // pixels
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Fonction pour gérer le scroll
  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  // Fonction pour scroll vers le bas
  const scrollToBottom = () => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Effet pour scroll quand les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex w-full h-full items-center">
      {/* Menu latéral */}
      <div
        className={`fixed top-0 left-0 h-[98dvh] md:h-[95dvh] mt-[1dvh] md:mt-[2.5dvh] bg-white shadow-sm border transition-transform duration-300 w-[300px] rounded-3xl ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >

        <div className="p-4">
          <ul>
            <li className="py-4 px-6 my-2 hover:bg-gray-100 cursor-pointer border-bleu-france border-2 rounded-2xl">
              Conversation 1
            </li>
            <li className="py-4 px-6 my-2 hover:bg-gray-100 cursor-pointer border-2 rounded-2xl">
              Conversation 2
            </li>
            <li className="py-4 px-6 my-2 hover:bg-gray-100 cursor-pointer border-2 rounded-2xl">
              Conversation 3
            </li>
          </ul>
        </div>
      </div>

      {/* Contenu principal */}
      <div
        className={`flex-1 flex h-full w-full items-center transition-transform duration-300 ${
          isMenuOpen ? "translate-x-[300px]" : "translate-x-0"
        }`}
      >
        <div className="w-[95%] h-[98%] md:h-[95%] mx-auto rounded-3xl border shadow-sm p-3 md:p-6 md:pt-0 pt-0 bg-white flex flex-col overflow-hidden">
            <div
              className={`h-[2px] w-full mb-3 bg-gray-100 relative overflow-hidden ${styles.loadingBar} ${isLoading ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
            >
              <div className="absolute top-0 left-0 h-full w-1/3"></div>
            </div>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {/* <Avatar className="h-10 w-10">
                <AvatarImage src="bot.png" alt="" />
                <AvatarFallback>RGPD</AvatarFallback>
              </Avatar> */}
              <Suspense fallback={<div>Chargement...</div>}>
                <AvatarModel 
                  className="h-20 w-20" 
                  modelPath="/robot.glb"
                  animationName={currentAnimation}
                  isLookingDown={isLookingDown}
                />
              </Suspense>

              <div>
                <h2 className="font-semibold">PRIVAC-IA</h2>
                <p className="text-sm text-muted-foreground">
                  Le chatbot RGPD à votre service !
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-grow overflow-y-auto space-y-4 mb-4 mt-4 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
          >
            {messages.map((msg, i) => (
              <HoverCard key={i} openDelay={1000} closeDelay={100}>
                <div
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <HoverCardTrigger asChild>
                    <div
                      className={`max-w-[80%] rounded-md px-4 py-2 cursor-pointer break-words whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-bleu-france text-white"
                          : "bg-gray-100 text-black"
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </HoverCardTrigger>
                </div>
                <HoverCardContent
                  side="bottom"
                  align="start"
                  sideOffset={-10}
                  className="p-2 w-auto"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(msg.content)}
                    className="h-8"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </HoverCardContent>
              </HoverCard>
            ))}
            <div ref={messagesEndRef} /> {/* Élément invisible pour le scroll */}
          </div>

          <div className="flex gap-2 items-center mt-auto">
            <form onSubmit={handleSubmit} className="relative flex gap-3 w-full">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Votre message..."
                onFocus={() => setIsLookingDown(true)}
                onBlur={() => setIsLookingDown(false)}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-md w-10 h-10 bg-bleu-france hover:bg-blue-900 flex items-center justify-center flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
