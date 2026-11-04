import { useNavigate } from 'react-router-dom'

export function Home() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8 p-6 bg-white">
      <h1 className="text-3xl font-bold">高々忠敬</h1>
      <p className="text-center text-gray-600">歩いて絵を描こう</p>

      <div className="bg-gray-100 rounded-xl p-6 w-full max-w-sm text-center">
        <p className="text-sm text-gray-500 mb-1">今回のお題</p>
        <p className="text-5xl font-bold">🍎 りんご</p>
      </div>

      <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
        <li>制限時間：15分</li>
        <li>画面を見ながら歩かない</li>
        <li>終了後にAIが採点します</li>
      </ul>

      <button
        onClick={() => navigate('/map')}
        className="w-full max-w-sm py-4 bg-black text-white text-lg font-semibold rounded-2xl"
      >
        スタート
      </button>
      <button
        type="button"
        onClick={() => navigate('/rules')}
        className="w-full max-w-sm py-4 border border-[#c89f76] bg-[#fffaf0] text-[#604733] text-lg font-semibold rounded-2xl"
      >
        あそびかた
      </button>
    </div>
  )
}
