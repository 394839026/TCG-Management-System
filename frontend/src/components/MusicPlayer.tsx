import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { musicService } from '../services/api'

interface MusicPlayerProps {
  isAdmin?: boolean
}

export function MusicPlayer({ isAdmin = false }: MusicPlayerProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  const { data: musicData } = useQuery({
    queryKey: ['musicList'],
    queryFn: () => musicService.getMusicList(),
    retry: false,
    retryOnMount: false,
  })

  const musicList = musicData?.data || []

  const currentTrack = musicList[currentTrackIndex]

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 播放/暂停
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
      // 增加播放次数
      musicService.incrementPlayCount(currentTrack._id).catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  // 上一首
  const playPrevious = () => {
    if (musicList.length === 0) return
    const newIndex = (currentTrackIndex - 1 + musicList.length) % musicList.length
    setCurrentTrackIndex(newIndex)
    setIsPlaying(true)
  }

  // 下一首
  const playNext = () => {
    if (musicList.length === 0) return
    const newIndex = (currentTrackIndex + 1) % musicList.length
    setCurrentTrackIndex(newIndex)
    setIsPlaying(true)
  }

  // 处理时间更新
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  // 处理加载元数据
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  // 处理播放结束
  const handleEnded = () => {
    playNext()
  }

  // 处理进度条拖动
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // 处理音量变化
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
    setIsMuted(vol === 0)
  }

  // 切换静音
  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume || 0.7
    }
  }

  // 当曲目变化时播放
  useEffect(() => {
    if (audioRef.current && currentTrack && isPlaying) {
      audioRef.current.src = `http://localhost:8000${currentTrack.filePath}`
      audioRef.current.play()
      musicService.incrementPlayCount(currentTrack._id).catch(() => {})
    }
  }, [currentTrackIndex])

  // 初始化音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [])

  if (musicList.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-700 z-50">
      {/* Audio Element */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={`http://localhost:8000${currentTrack.filePath}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Main Player */}
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Track Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center flex-shrink-0">
              <ListMusic className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate text-sm">
                {currentTrack?.title || '未选择音乐'}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {currentTrack?.artist || '未知艺术家'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-0.5 flex-1 max-w-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={playPrevious}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={musicList.length === 0}
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-900 hover:scale-105 transition-transform"
                disabled={!currentTrack}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={playNext}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={musicList.length === 0}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-gray-400 text-[10px] w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-0.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-gray-400 text-[10px] w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-0.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
