import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import { ConversationList } from '@/components/marketplace/ConversationList'
import { ChatView } from '@/components/marketplace/ChatView'
import { Conversation } from '@/services/api'

export function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">消息中心</h1>
          <p className="text-muted-foreground mt-1">管理你的交易对话</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-[600px]">
          <ConversationList
            selectedConversationId={selectedConversation?._id}
            onSelectConversation={setSelectedConversation}
          />
        </Card>

        <Card className="lg:col-span-2 h-[600px] flex flex-col">
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              onBack={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">选择对话开始聊天</h3>
              <p className="text-muted-foreground">从左侧列表中选择一个对话开始交流</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
