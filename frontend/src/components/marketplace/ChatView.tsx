import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, User, Phone, MoreVertical } from 'lucide-react';
import { messageService, Conversation, TradeMessage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
interface ChatViewProps {
 conversation: Conversation;
 onBack: () => void;
}
export function ChatView({ conversation, onBack }: ChatViewProps) {
 const { user } = useAuth();
 const [message, setMessage] = useState('');
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const queryClient = useQueryClient();
 const getOtherParticipant = () => {
 return conversation.participants.find((p) => p._id !== user?._id) || conversation.participants[0];
 };
 const other = getOtherParticipant();
 const { data: messagesData, isLoading } = useQuery({
 queryKey: ['messages', conversation._id],
 queryFn: () => messageService.getMessages(conversation._id),
 });
 const sendMutation = useMutation({
 mutationFn: () => messageService.sendMessage(conversation._id, message),
 onSuccess: () => {
 setMessage('');
 queryClient.invalidateQueries({ queryKey: ['messages', conversation._id] });
 queryClient.invalidateQueries({ queryKey: ['conversations'] });
 },
 });
 useEffect(() => {
 messageService.markAsRead(conversation._id);
 queryClient.invalidateQueries({ queryKey: ['conversations'] });
 }, [conversation._id, queryClient]);
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messagesData]);
 const messages: TradeMessage[] = messagesData?.data || [];
 const formatTime = (dateString: string) => {
 return new Date(dateString).toLocaleTimeString('zh-CN', {
 hour: '2-digit',
 minute: '2-digit',
 });
 };
 const isOwnMessage = (msg: TradeMessage) => msg.sender._id === user?._id;
 if (isLoading) {
 return (<div className="flex flex-col h-full">
 <Card className="border-b">
 <CardContent className="p-4 flex items-center gap-3">
 <Button variant="ghost" size="icon" onClick={onBack}>
 <ArrowLeft className="w-5 h-5"/>
 </Button>
 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
 {other.avatar ? (<img src={other.avatar} alt={other.username} className="w-full h-full rounded-full object-cover"/>) : (<User className="w-5 h-5 text-primary"/>)}
 </div>
 <div className="flex-1">
 <h3 className="font-medium">{other.username}</h3>
 <p className="text-sm text-muted-foreground">加载中...</p>
 </div>
 <Button variant="ghost" size="icon">
 <Phone className="w-4 h-4"/>
 </Button>
 <Button variant="ghost" size="icon">
 <MoreVertical className="w-4 h-4"/>
 </Button>
 </CardContent>
 </Card>
 <div className="flex-1 flex items-center justify-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
 </div>
 </div>);
 }
 return (<div className="flex flex-col h-full">
 <Card className="border-b">
 <CardContent className="p-4 flex items-center gap-3">
 <Button variant="ghost" size="icon" onClick={onBack}>
 <ArrowLeft className="w-5 h-5"/>
 </Button>
 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
 {other.avatar ? (<img src={other.avatar} alt={other.username} className="w-full h-full rounded-full object-cover"/>) : (<User className="w-5 h-5 text-primary"/>)}
 </div>
 <div className="flex-1">
 <h3 className="font-medium">{other.username}</h3>
 <p className="text-sm text-muted-foreground">在线</p>
 </div>
 <Button variant="ghost" size="icon">
 <Phone className="w-4 h-4"/>
 </Button>
 <Button variant="ghost" size="icon">
 <MoreVertical className="w-4 h-4"/>
 </Button>
 </CardContent>
 </Card>

 <div className="flex-1 overflow-y-auto p-4 space-y-4">
 {messages.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center">
 <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
 <User className="w-8 h-8 text-muted-foreground"/>
 </div>
 <p className="text-muted-foreground">开始与 {other.username} 的对话</p>
 <p className="text-sm text-muted-foreground mt-1">发送消息开始交流</p>
 </div>) : (messages.map((msg) => (<div key={msg._id} className={`flex gap-2 ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}>
 <div className={`max-w-[70%] ${isOwnMessage(msg) ? 'items-end' : 'items-start'}`}>
 <div className={`px-4 py-2 rounded-2xl ${isOwnMessage(msg)
 ? 'bg-primary text-white rounded-br-md'
 : 'bg-muted rounded-bl-md'}`}>
 <p className="text-sm">{msg.content}</p>
 </div>
 <span className="text-xs text-muted-foreground mt-1 block">
 {formatTime(msg.createdAt)}
 </span>
 </div>
 </div>)))}
 <div ref={messagesEndRef}/>
 </div>

 <Card className="border-t">
 <CardContent className="p-4">
 <div className="flex gap-3">
 <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="输入消息..." className="flex-1" onKeyDown={(e) => {
 if (e.key === 'Enter' && message.trim()) {
 sendMutation.mutate();
 }
 }}/>
 <Button onClick={() => message.trim() && sendMutation.mutate()} disabled={!message.trim() || sendMutation.isPending}>
                  <Send className="w-4 h-4"/>
                </Button>
 </div>
 </CardContent>
 </Card>
 </div>);
}

