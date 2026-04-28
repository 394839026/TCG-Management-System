import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User } from 'lucide-react';
import { messageService, Conversation } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
interface ConversationListProps {
 selectedConversationId?: string;
 onSelectConversation: (conversation: Conversation) => void;
}
export function ConversationList({ selectedConversationId, onSelectConversation, }: ConversationListProps) {
 const { user } = useAuth();
 const { data: conversationsData, isLoading } = useQuery({
 queryKey: ['conversations'],
 queryFn: () => messageService.getConversations(),
 });
 const conversations: Conversation[] = conversationsData?.data || [];
 const getOtherParticipant = (participants: Conversation['participants']) => {
 return participants.find((p) => p._id !== user?._id) || participants[0];
 };
 const formatTime = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const diff = now.getTime() - date.getTime();
 const hours = Math.floor(diff / (1000 * 60 * 60));
 if (hours < 1)
 return '刚刚';
 if (hours < 24)
 return `${hours}小时前`;
 return date.toLocaleDateString('zh-CN');
 };
 if (isLoading) {
 return (<div className="flex justify-center py-8">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
 </div>);
 }
 if (conversations.length === 0) {
 return (<Card className="h-full">
 <CardContent className="py-12 text-center">
 <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground"/>
 <p className="text-muted-foreground">暂无消息</p>
 <p className="text-sm text-muted-foreground mt-1">参与交易后会在这里显示对话</p>
 </CardContent>
 </Card>);
 }
 return (<div className="space-y-2">
 {conversations.map((conversation) => {
 const other = getOtherParticipant(conversation.participants);
 const isSelected = selectedConversationId === conversation._id;
 return (<Card key={conversation._id} className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`} onClick={() => onSelectConversation(conversation)}>
 <CardContent className="p-4">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
 {other.avatar ? (<img src={other.avatar} alt={other.username} className="w-full h-full rounded-full object-cover"/>) : (<User className="w-5 h-5 text-primary"/>)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <h3 className="font-medium truncate">{other.username}</h3>
 <span className="text-xs text-muted-foreground">
 {formatTime(conversation.updatedAt)}
 </span>
 </div>
 <p className="text-sm text-muted-foreground truncate mt-1">
 {conversation.lastMessage?.content || '开始对话'}
 </p>
 </div>
 {conversation.unreadCount > 0 && (<Badge variant="destructive" className="flex-shrink-0">
 {conversation.unreadCount}
 </Badge>)}
 </div>
 </CardContent>
 </Card>);
 })}
 </div>);
}

