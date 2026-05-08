import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, Music, Play, Pause, Eye, EyeOff, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Music as MusicType, musicService } from '../services/api'
import { toast } from 'sonner'

export function MusicManagementPage() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const queryClient = useQueryClient()

  const { data: musicData, isLoading } = useQuery({
    queryKey: ['adminMusicList'],
    queryFn: () => musicService.getAllMusicAdmin(),
  })

  const musicList = musicData?.data || []

  // 上传音乐
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return musicService.uploadMusic(formData)
    },
    onSuccess: () => {
      toast.success('音乐上传成功！')
      setTitle('')
      setArtist('')
      setSelectedFile(null)
      queryClient.invalidateQueries({ queryKey: ['adminMusicList'] })
      queryClient.invalidateQueries({ queryKey: ['musicList'] })
    },
    onError: () => {
      toast.error('音乐上传失败')
    },
  })

  // 删除音乐
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return musicService.deleteMusic(id)
    },
    onSuccess: () => {
      toast.success('音乐删除成功！')
      queryClient.invalidateQueries({ queryKey: ['adminMusicList'] })
      queryClient.invalidateQueries({ queryKey: ['musicList'] })
    },
    onError: () => {
      toast.error('音乐删除失败')
    },
  })

  // 切换启用状态
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return musicService.toggleMusicActive(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMusicList'] })
      queryClient.invalidateQueries({ queryKey: ['musicList'] })
    },
    onError: () => {
      toast.error('操作失败')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !title) {
      toast.error('请填写标题并选择文件')
      return
    }

    const formData = new FormData()
    formData.append('music', selectedFile)
    formData.append('title', title)
    if (artist) {
      formData.append('artist', artist)
    }

    setIsUploading(true)
    try {
      await uploadMutation.mutateAsync(formData)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">音乐管理</h1>
        <p className="text-gray-400">上传和管理背景音乐（仅管理员可见）</p>
      </div>

      {/* 上传表单 */}
      <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">上传新音乐</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                歌曲标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入歌曲标题"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                艺术家
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入艺术家名称"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择音乐文件 *
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">
                    {selectedFile ? selectedFile.name : '点击选择文件或拖拽到此处'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">支持 MP3, WAV, OGG, FLAC, AAC, M4A</p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!selectedFile || !title || isUploading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isUploading ? '上传中...' : '上传音乐'}
          </Button>
        </form>
      </div>

      {/* 音乐列表 */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">音乐列表</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">加载中...</div>
        ) : musicList.length === 0 ? (
          <div className="p-12 text-center">
            <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">暂无音乐，请上传第一首</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {musicList.map((track: MusicType) => (
              <div key={track._id} className="p-4 flex items-center gap-4 hover:bg-gray-700/30 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium truncate">{track.title}</h3>
                    {!track.isActive && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        已禁用
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(track.fileSize)}</span>
                    <span>{track.playCount} 次播放</span>
                    <span>
                      上传者: {typeof track.uploadedBy === 'object' ? track.uploadedBy.username : track.uploadedBy}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate(track._id)}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                    title={track.isActive ? '禁用' : '启用'}
                  >
                    {track.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这首音乐吗？')) {
                        deleteMutation.mutate(track._id)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
