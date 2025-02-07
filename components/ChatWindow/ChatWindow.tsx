"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send, Copy, Menu, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import styles from "./ChatWindow.module.css";
import { useToast } from "@/hooks/use-toast";
import AvatarModel from "../3D/AvatarModel";

interface Conversation {
  id: string;
  name: string;
  messages: Array<{role: string, content: string}>;
  timestamp: number;
}

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
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

  // Charger les conversations au démarrage
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      setConversations(parsed);
      
      // Charger la dernière conversation si aucune n'est sélectionnée
      if (!currentConversationId && parsed.length > 0) {
        setCurrentConversationId(parsed[0].id);
        setMessages(parsed[0].messages);
      }
    } else {
      // Créer une première conversation si aucune n'existe
      const initialConversation: Conversation = {
        id: Date.now().toString(),
        name: `Conversation du ${new Date().toLocaleDateString()}`,
        messages: [],
        timestamp: Date.now()
      };
      
      setConversations([initialConversation]);
      setCurrentConversationId(initialConversation.id);
      setMessages([]);
      localStorage.setItem('conversations', JSON.stringify([initialConversation]));
    }
  }, []);

  // Créer une nouvelle conversation
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      name: `Conversation du ${new Date().toLocaleDateString()}`,
      messages: [],
      timestamp: Date.now()
    };
    
    setConversations(prev => {
      const updated = [newConversation, ...prev];
      localStorage.setItem('conversations', JSON.stringify(updated));
      return updated;
    });
    
    setCurrentConversationId(newConversation.id);
    setMessages([]);
    setIsMenuOpen(false);
  };

  // Sauvegarder les messages de la conversation courante
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, messages: messages }
            : conv
        );
        localStorage.setItem('conversations', JSON.stringify(updated));
        return updated;
      });
    }
  }, [messages, currentConversationId]);

  // Changer de conversation
  const switchConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
      setIsMenuOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      
      const response = await fetch(`http://${window.location.hostname}:8000/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

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
      setCurrentAnimation('CharacterArmature|Death');
      
      // Message d'erreur plus détaillé
      toast({
        title: "Erreur",
        description: error instanceof Error 
          ? error.message 
          : "Une erreur est survenue lors de l'envoi du message",
        variant: "destructive",
        duration: 5000,
      });
      
      // Supprimer le message assistant vide
      setMessages(prev => prev.slice(0, -1));
      
      setTimeout(() => {
        setCurrentAnimation('CharacterArmature|Idle');
        setIsLoading(false);
      }, 5000);
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

  // Ajouter la fonction de suppression
  const deleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setConversations(prev => {
      const updated = prev.filter(conv => conv.id !== conversationId);
      localStorage.setItem('conversations', JSON.stringify(updated));
      
      // Si on supprime la conversation courante
      if (conversationId === currentConversationId) {
        if (updated.length > 0) {
          // On met à jour immédiatement les états
          const nextConversation = updated[0];
          setTimeout(() => {
            setCurrentConversationId(nextConversation.id);
            setMessages(nextConversation.messages);
          }, 0);
        } else {
          // Si plus aucune conversation
          setTimeout(() => {
            setCurrentConversationId('');
            setMessages([]);
          }, 0);
        }
      }
      
      return updated;
    });
  };

  return (
    <div className="flex w-full h-full items-center">
      {/* Menu latéral modifié */}
      <div className={`fixed top-0 left-0 h-[98dvh] md:h-[95dvh] mt-[1dvh] md:mt-[2.5dvh] bg-white shadow-sm border transition-transform duration-300 w-[300px] rounded-3xl flex flex-col ${
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 flex flex-col h-full">
          <Button 
            onClick={createNewConversation}
            className="w-full mb-4 bg-bleu-france hover:bg-blue-900 flex-shrink-0 rounded-xl"
          >
            Nouvelle conversation
            <Plus className="h-5 w-5" />
          </Button>
          
          <div className="overflow-y-auto flex-grow [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <ul className="space-y-2">
              {conversations.map((conv) => (
                <li 
                  key={conv.id}
                  className={`py-4 px-6 hover:bg-gray-100 cursor-pointer border-2 rounded-2xl ${
                    currentConversationId === conv.id ? 'border-bleu-france' : ''
                  } flex justify-between items-center`}
                >
                  <span onClick={() => switchConversation(conv.id)}>
                    {conv.name}
                  </span>
                  {currentConversationId !== conv.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 hover:bg-red-100"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={createNewConversation}
            >
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
