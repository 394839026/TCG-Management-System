import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Smile } from 'lucide-react'

const commonEmojis = [
  '😀', '😂', '🥰', '😍', '🤩', '😊', '😇',
  '😉', '😌', '🙂', '😋', '🤗', '🤔', '🤫',
  '😎', '🥳', '😏', '😒', '😞', '😔', '😟',
  '😕', '🙁', '☹️', '😣', '😖', '😫', '😩',
  '😤', '😠', '😡', '🤬', '😰', '😨', '😥',
  '😢', '😭', '😱', '😓', '😪', '😴', '😵',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤',
  '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏',
  '👏', '🙌', '👐', '🤲', '🤙', '👋', '🤚',
  '🎉', '🎊', '🎈', '✨', '🌟', '💫', '🌈',
  '🔥', '💯', '✅', '❌', '⚠️', '💥', '💤'
]

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setOpen(true)}>
        <Smile className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>表情符号</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-7 gap-2 py-4">
            {commonEmojis.map((emoji, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-xl hover:bg-muted"
                onClick={() => {
                  onEmojiSelect(emoji)
                  setOpen(false)
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
